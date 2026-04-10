# SocialMagic — 技术蓝图

> 版本: v2.0 | 日期: 2026-04-10

---

## 1. 数据库设计 (Supabase)

### 1.1 ER 关系

```
profiles ──< contents ──< social_posts
```

### 1.2 表结构

#### `profiles`

```sql
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id     TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

#### `contents`

```sql
CREATE TABLE public.contents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type  TEXT NOT NULL CHECK (source_type IN ('url', 'file', 'text')),
  title        TEXT,
  raw_url      TEXT,
  raw_text     TEXT NOT NULL,
  file_name    TEXT,
  file_type    TEXT,
  word_count   INT DEFAULT 0,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contents_profile ON public.contents(profile_id);
```

#### `social_posts`

```sql
CREATE TABLE public.social_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id   UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL CHECK (platform IN ('xiaohongshu', 'wechat', 'douyin', 'weibo')),
  body         TEXT NOT NULL,
  tone         TEXT NOT NULL DEFAULT '',
  model        TEXT NOT NULL,
  version      INT NOT NULL DEFAULT 1,
  token_count  INT DEFAULT 0,
  char_count   INT DEFAULT 0,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_content ON public.social_posts(content_id);
CREATE INDEX idx_posts_platform ON public.social_posts(platform);

-- Auto-increment version per content+platform
CREATE OR REPLACE FUNCTION get_next_post_version(content_uuid UUID, platform_name TEXT)
RETURNS INT AS $$
DECLARE next_v INT;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO next_v
  FROM public.social_posts
  WHERE content_id = content_uuid AND platform = platform_name;
  RETURN next_v;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. API 路由

| 路由 | 方法 | 功能 | 认证 |
|------|------|------|------|
| `/api/ingest` | POST | URL 抓取（含 YouTube/Bilibili 字幕） | `x-anon-id` |
| `/api/upload` | POST | PDF/DOCX 文件上传与解析 | `x-anon-id` |
| `/api/generate` | POST | SSE 流式多平台文案生成 | `x-anon-id` |
| `/api/validate-key` | POST | AI API Key 有效性验证 | — |
| `/api/posts` | GET | 获取用户所有已生成文案 | `x-anon-id` |
| `/api/posts/[id]` | DELETE | 删除指定文案 | `x-anon-id` |
| `/api/profiles/init` | POST | 初始化/同步用户 profile | — |

### `/api/generate` 流程

```
Client → POST /api/generate
  body: { contentId, sourceText?, config: { platforms[], toneOverrides? }, providerConfig }
                    │
                    ▼
        ┌─── Resolve identity (upsert profile) ───┐
        │          Resolve source text              │
        └────────────────┬─────────────────────────┘
                         │
                         ▼
        ┌─── For each platform (Promise.allSettled) ───┐
        │  createDynamicProvider(providerConfig)        │
        │  streamText({ model, system, prompt, temp })  │
        │  → SSE chunks: { type:"chunk", platform, text }│
        │  → on complete: persist to social_posts        │
        │  → SSE: { type:"complete", platform, body, … } │
        └────────────────┬──────────────────────────────┘
                         │
                         ▼
              SSE: { type:"done" }
```

### `/api/validate-key` 流程

```
Client → POST /api/validate-key
  body: { provider, apiKey, model, baseURL? }
                    │
                    ▼
        createDynamicProvider(config)
        generateText({ model, prompt: "回复「OK」", maxOutputTokens: 5 })
                    │
            ┌───────┴───────┐
            ▼               ▼
         { valid: true }   { valid: false, error }
```

---

## 3. LLM 适配层

使用 Vercel AI SDK (`ai` 包) + 官方 provider 包：

```
@ai-sdk/openai    → OpenAI + OpenAI-compatible (DeepSeek, Groq, etc.)
@ai-sdk/anthropic → Anthropic Claude
@ai-sdk/google    → Google Gemini
```

统一入口：`createDynamicProvider()` in `src/lib/services/generator.service.ts`

```typescript
function createDynamicProvider(config: {
  provider: "openai" | "anthropic" | "google" | "custom";
  apiKey: string;
  model: string;
  baseURL?: string;
}) → LanguageModel   // Vercel AI SDK 统一接口
```

Provider 配置存储在浏览器 `localStorage` key `sm_providers`，每个生成请求从前端传递。

---

## 4. 前端架构

### 4.1 技术栈

- Next.js 16 App Router + React 19
- Tailwind CSS v4 (CSS-first config, custom properties for theming)
- Framer Motion (spring animations, AnimatePresence)
- Lucide React (icons)
- CSS custom properties for dual theme (`data-theme="dark|light"`)

### 4.2 页面路由

| 路由 | 文件 | 功能 |
|------|------|------|
| `/` | `src/app/(dashboard)/page.tsx` | 炼金工作台（主页面） |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | AI 服务商配置 |
| `/vault` | `src/app/(dashboard)/vault/page.tsx` | 文案宝库 |

### 4.3 组件层次

```
layout.tsx (root)
├── ThemeProvider (dark/light toggle, CSS custom properties)
├── IdentityProvider (anonId from localStorage, upsert to Supabase)
├── ParticleField (ambient floating particles)
├── bg-orb × 3 (gradient blurs)
└── (dashboard)/layout.tsx
    ├── Sidebar (desktop: fixed left, mobile: drawer)
    │   ├── NavItem × 3 (工作台/宝库/偏好)
    │   └── ThemeToggle (Sun/Moon)
    └── content area
        ├── page.tsx → AlchemyWorkbench
        │   ├── URL input + file upload + text input
        │   ├── Platform selector (2×2 grid + tone presets)
        │   ├── ResultCarousel (streaming + done states)
        │   │   ├── StreamingCard × N (parallel SSE)
        │   │   └── Carousel (slide animation, score ring)
        │   │       ├── Copy / Regen / Copy All / Export TXT
        │   │       └── Dots + arrows navigation
        │   └── VaultGrid (masonry grid, AnimatePresence)
        ├── settings/page.tsx (provider cards, validate button)
        └── vault/page.tsx (local + remote merge, masonry grid)
```

### 4.4 核心交互流程

```
idle → [输入 URL / 上传文件 / 直接输入文本]
  → ingesting → ingested
    → [选择平台 × N] [选择语调]
      → generating (SSE streaming)
        → done → [复制 / 重炼 / 导出 / 新炼金]
```

### 4.5 共享工具模块

| 模块 | 导出 | 用途 |
|------|------|------|
| `lib/utils/calculate-word-count` | `calculateWordCount(text)` | CJK + Latin 混合字数统计 |
| `lib/utils/map-row-to-content` | `mapRowToContent(row, profileId)` | Supabase row → Content 类型 |
| `lib/utils/score-helpers` | `getScoreColor`, `getScoreGlow`, `getScoreLabel` | 炼金分数视觉 |
| `lib/utils/vault-storage` | `VaultItem`, `loadVault`, `saveVault` | 宝库 localStorage CRUD |
| `lib/constants/platform-theme` | `PLATFORM_THEME`, `TONE_PRESETS` | 平台视觉 + 语调预设 |

---

## 5. 文件结构

```
src/
├── app/
│   ├── layout.tsx                         # Root: theme orbs, particles, providers
│   ├── globals.css                        # Dual-theme CSS custom properties + animations
│   ├── (dashboard)/
│   │   ├── layout.tsx                     # Sidebar + content area
│   │   ├── page.tsx                       # → AlchemyWorkbench
│   │   ├── settings/page.tsx              # Provider config + validate
│   │   └── vault/page.tsx                 # Local + remote vault
│   └── api/
│       ├── ingest/route.ts                # URL → scrape/YouTube/Bilibili → Content
│       ├── upload/route.ts                # PDF/DOCX → parse → Content
│       ├── generate/route.ts              # SSE streaming multi-platform generation
│       ├── validate-key/route.ts          # API key validation
│       ├── posts/
│       │   ├── route.ts                   # GET all posts
│       │   └── [id]/route.ts              # DELETE single post
│       └── profiles/
│           └── init/route.ts              # Upsert profile + sync providers
├── components/
│   ├── AlchemyWorkbench.tsx               # Main workbench (phase machine)
│   ├── ResultCarousel.tsx                 # Full-width carousel (stream + done)
│   ├── SocialPostCard.tsx                 # Glass card (used in vault)
│   ├── VaultGrid.tsx                      # Masonry grid for vault items
│   ├── PlatformIcon.tsx                   # Hand-crafted SVG icons × 4
│   └── ParticleField.tsx                  # Ambient floating particles
├── hooks/
│   ├── useTypewriter.ts                   # rAF-based character reveal
│   └── useHapticCopy.ts                   # navigator.vibrate on mobile copy
├── providers/
│   ├── theme-provider.tsx                 # Dark/light theme context
│   └── identity-provider.tsx              # Anon ID + Supabase upsert
├── lib/
│   ├── services/
│   │   ├── generator.service.ts           # Prompts, provider factory, alchemy score
│   │   └── scraper.service.ts            # URL → ScrapedContent
│   ├── scraper/
│   │   ├── fetch-page.ts                 # HTTP fetch with retry
│   │   ├── extract-content.ts            # HTML → Markdown
│   │   └── video-transcript.ts           # YouTube + Bilibili transcript
│   ├── parsers/
│   │   ├── pdf.ts                        # PDF text extraction
│   │   └── docx.ts                       # DOCX text extraction
│   ├── supabase/
│   │   └── client.ts                     # Server-side Supabase client
│   ├── constants/
│   │   └── platform-theme.ts             # PLATFORM_THEME + TONE_PRESETS
│   └── utils/
│       ├── calculate-word-count.ts
│       ├── map-row-to-content.ts
│       ├── score-helpers.ts
│       └── vault-storage.ts
└── types/
    └── index.ts                           # Platform, Content, SocialPost, GeneratorConfig, etc.
```

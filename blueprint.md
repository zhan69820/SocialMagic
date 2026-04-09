# SocialMagic — 技术蓝图

> 版本: v1.0 | 日期: 2026-04-09

---

## 1. Supabase 数据库设计

### 1.1 ER 关系总览

```
users ──< user_preferences
users ──< sessions ──< sources
sessions ──< generated_copies
```

### 1.2 表结构定义

#### `users`

```sql
CREATE TABLE public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id     TEXT UNIQUE NOT NULL,       -- 匿名用户标识（localStorage 存储）
  email       TEXT,                       -- 可选，后续注册用
  api_keys    JSONB DEFAULT '{}',         -- {"openai": "sk-...xxx", "claude": "sk-ant-...xxx"}
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- API Key 加密：通过 Supabase Vault 或应用层 AES 加密后存储
-- 前端只传输加密后的值，永远不明文落库
```

#### `user_preferences`

```sql
CREATE TABLE public.user_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('xiaohongshu', 'wechat', 'douyin', 'weibo')),
  is_enabled  BOOLEAN DEFAULT true,
  default_tone TEXT DEFAULT '',
  emoji_level  TEXT DEFAULT 'medium' CHECK (emoji_level IN ('high', 'medium', 'low')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);
```

#### `sessions`

```sql
CREATE TABLE public.sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT,                       -- 会话标题（自动从素材提取）
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'error')),
  metadata    JSONB DEFAULT '{}',         -- 灵活扩展字段
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

#### `sources`

```sql
CREATE TABLE public.sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('url', 'file', 'text')),
  content     TEXT NOT NULL,              -- 解析后的纯文本
  raw_url     TEXT,                       -- 原始 URL
  file_name   TEXT,                       -- 原始文件名
  file_type   TEXT,                       -- MIME type
  metadata    JSONB DEFAULT '{}',         -- {title, description, image_urls[]}
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

#### `generated_copies`

```sql
CREATE TABLE public.generated_copies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  source_id   UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('xiaohongshu', 'wechat', 'douyin', 'weibo')),
  content     TEXT NOT NULL,              -- 生成的文案
  tone_used   TEXT NOT NULL,
  model_used  TEXT NOT NULL,              -- "openai/gpt-4o" | "anthropic/claude-sonnet-4-6"
  version     INT DEFAULT 1,             -- 同一平台的生成版本号
  token_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_copies_session ON public.generated_copies(session_id);
CREATE INDEX idx_copies_source  ON public.generated_copies(source_id);
CREATE INDEX idx_copies_platform ON public.generated_copies(platform);
```

### 1.3 RLS（Row Level Security）策略

```sql
-- ================================
-- 启用 RLS
-- ================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_copies ENABLE ROW LEVEL SECURITY;

-- ================================
-- users 表策略
-- ================================
-- 用户只能读取和修改自己的记录
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (anon_id = current_setting('request.jwt.claims')::json->>'anon_id');

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (anon_id = current_setting('request.jwt.claims')::json->>'anon_id');

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (anon_id = current_setting('request.jwt.claims')::json->>'anon_id');

-- ================================
-- user_preferences 表策略
-- ================================
-- 通过 user_id 关联验证归属
CREATE POLICY "prefs_select_own" ON public.user_preferences
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
  );

CREATE POLICY "prefs_insert_own" ON public.user_preferences
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
  );

CREATE POLICY "prefs_update_own" ON public.user_preferences
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
  );

CREATE POLICY "prefs_delete_own" ON public.user_preferences
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
  );

-- ================================
-- sessions 表策略
-- ================================
CREATE POLICY "sessions_select_own" ON public.sessions
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
  );

CREATE POLICY "sessions_insert_own" ON public.sessions
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
  );

CREATE POLICY "sessions_update_own" ON public.sessions
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
  );

CREATE POLICY "sessions_delete_own" ON public.sessions
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
  );

-- ================================
-- sources 表策略（通过 session 归属链验证）
-- ================================
CREATE POLICY "sources_select_own" ON public.sources
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE s.user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
    )
  );

CREATE POLICY "sources_insert_own" ON public.sources
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE s.user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
    )
  );

CREATE POLICY "sources_delete_own" ON public.sources
  FOR DELETE USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE s.user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
    )
  );

-- ================================
-- generated_copies 表策略（通过 session 归属链验证）
-- ================================
CREATE POLICY "copies_select_own" ON public.generated_copies
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE s.user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
    )
  );

CREATE POLICY "copies_insert_own" ON public.generated_copies
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE s.user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
    )
  );

CREATE POLICY "copies_delete_own" ON public.generated_copies
  FOR DELETE USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE s.user_id IN (SELECT id FROM public.users WHERE anon_id = current_setting('request.jwt.claims')::json->>'anon_id')
    )
  );
```

---

## 2. LLM 统一适配层

### 2.1 架构图

```
┌──────────────────────────────────────────────────┐
│  Next.js Route Handler (API Layer)               │
│                                                  │
│  POST /api/generate                              │
│    │                                             │
│    ▼                                             │
│  ┌──────────────────────────────────┐            │
│  │  LLM Adapter (src/lib/llm/)      │            │
│  │                                  │            │
│  │  ┌────────────┐ ┌─────────────┐  │            │
│  │  │ OpenAI     │ │ Anthropic   │  │            │
│  │  │ Adapter    │ │ Adapter     │  │            │
│  │  └─────┬──────┘ └──────┬──────┘  │            │
│  │        └───────┬───────┘         │            │
│  │                ▼                 │            │
│  │        LLMProvider (interface)   │            │
│  └──────────────────────────────────┘            │
│                    │                             │
│                    ▼                             │
│          Platform Prompt Builder                 │
│    (xiaohongshu / wechat / douyin / weibo)       │
└──────────────────────────────────────────────────┘
```

### 2.2 接口定义

```typescript
// src/lib/llm/types.ts

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMGenerateOptions {
  messages: LLMMessage[];
  temperature?: number;      // 0.0 ~ 1.0
  maxTokens?: number;
  model?: string;            // 允许覆盖默认模型
}

interface LLMGenerateResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface LLMProvider {
  readonly name: string;
  readonly defaultModel: string;
  generate(options: LLMGenerateOptions): Promise<LLMGenerateResult>;
  validateApiKey(): Promise<boolean>;
}
```

### 2.3 OpenAI Adapter

```typescript
// src/lib/llm/openai.ts

class OpenAIAdapter implements LLMProvider {
  readonly name = "openai";
  readonly defaultModel = "gpt-4o";

  constructor(private apiKey: string) {}

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    // 调用 POST https://api.openai.com/v1/chat/completions
    // 映射到统一的 LLMGenerateResult
  }

  async validateApiKey(): Promise<boolean> {
    // 调用 GET https://api.openai.com/v1/models 验证 key 有效性
  }
}
```

### 2.4 Anthropic Adapter

```typescript
// src/lib/llm/anthropic.ts

class AnthropicAdapter implements LLMProvider {
  readonly name = "anthropic";
  readonly defaultModel = "claude-sonnet-4-6";

  constructor(private apiKey: string) {}

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    // 调用 POST https://api.anthropic.com/v1/messages
    // 映射到统一的 LLMGenerateResult
  }

  async validateApiKey(): Promise<boolean> {
    // 轻量调用验证 key 有效性
  }
}
```

### 2.5 Provider 工厂

```typescript
// src/lib/llm/factory.ts

function createProvider(config: { provider: "openai" | "anthropic"; apiKey: string }): LLMProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAIAdapter(config.apiKey);
    case "anthropic":
      return new AnthropicAdapter(config.apiKey);
  }
}
```

### 2.6 平台 Prompt 模板

```typescript
// src/lib/prompts/platforms.ts

const PLATFORM_PROMPTS: Record<Platform, PlatformPromptConfig> = {
  xiaohongshu: {
    systemPrompt: `你是一位资深小红书博主，擅长撰写种草笔记。
要求：
- 使用亲切自然的口吻，像朋友聊天一样
- 大量使用 emoji 表情增加亲和力
- 标题用 【】包裹，吸引眼球
- 正文分段清晰，善用换行
- 结尾添加话题标签 #标签
- 控制在 ${PLATFORM_CONFIG.xiaohongshu.maxLength} 字以内`,
    temperature: 0.8,
  },
  wechat: {
    systemPrompt: `你是一位生活达人，擅长写微信朋友圈文案。
要求：
- 文字简洁有温度，像发朋友圈一样自然
- 适度使用 emoji，不过度
- 不需要话题标签
- 可以加一句感悟或金句
- 控制在 ${PLATFORM_CONFIG.wechat.maxLength} 字以内`,
    temperature: 0.7,
  },
  douyin: {
    systemPrompt: `你是一位短视频文案高手，擅长写抖音文案。
要求：
- 短平快，前 3 秒抓住眼球
- 有节奏感，适合配音朗读
- 使用 #话题标签
- 语言有冲击力、有网感
- 控制在 ${PLATFORM_CONFIG.douyin.maxLength} 字以内`,
    temperature: 0.85,
  },
  weibo: {
    systemPrompt: `你是一位微博达人，擅长写微博文案。
要求：
- 观点鲜明，有态度
- 使用 #话题# 格式（双#号）
- 语言简洁有力，有网感
- 可以适当使用表情，但不过度
- 控制在 ${PLATFORM_CONFIG.weibo.maxLength} 字以内`,
    temperature: 0.75,
  },
};
```

---

## 3. API Route 设计

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/scrape` | POST | URL 网页正文抓取 |
| `/api/upload` | POST | 文件上传与解析 |
| `/api/generate` | POST | 文案生成（多平台并行） |
| `/api/validate-key` | POST | API Key 有效性验证 |
| `/api/sessions` | GET/POST | 会话列表 / 创建会话 |
| `/api/sessions/[id]` | GET/DELETE | 会话详情 / 删除会话 |

### `/api/generate` 请求体

```typescript
interface GenerateRequest {
  sessionId: string;
  sourceId: string;
  platforms: Platform[];
  toneOverrides?: Partial<Record<Platform, string>>;
  provider?: "openai" | "anthropic";
}
```

### `/api/generate` 响应体

```typescript
interface GenerateResponse {
  copies: {
    platform: Platform;
    content: string;
    model: string;
    tokenCount: number;
    version: number;
  }[];
  errors: {
    platform: Platform;
    message: string;
  }[];
}
```

---

## 4. 文件结构规划

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                     # 主页面
│   ├── api/
│   │   ├── scrape/route.ts
│   │   ├── upload/route.ts
│   │   ├── generate/route.ts
│   │   ├── validate-key/route.ts
│   │   └── sessions/
│   │       ├── route.ts
│   │       └── [id]/route.ts
│   └── globals.css
├── components/
│   ├── SourceInput.tsx               # 素材输入（URL/文件/手动）
│   ├── PlatformSelector.tsx          # 平台选择卡片
│   ├── CopyCard.tsx                  # 单平台文案展示卡片
│   ├── CopyResults.tsx               # 结果展示区容器
│   ├── SettingsModal.tsx             # API Key 设置弹窗
│   ├── HistoryDrawer.tsx             # 历史记录抽屉
│   └── Header.tsx                    # 顶部导航
├── lib/
│   ├── llm/
│   │   ├── types.ts                 # LLM 通用接口
│   │   ├── openai.ts                # OpenAI 适配器
│   │   ├── anthropic.ts             # Anthropic 适配器
│   │   ├── factory.ts               # Provider 工厂
│   │   └── index.ts                 # 统一导出
│   ├── prompts/
│   │   ├── platforms.ts             # 各平台 Prompt 模板
│   │   └── builder.ts               # Prompt 组装器
│   ├── scraper/
│   │   ├── fetch-page.ts            # 网页抓取逻辑
│   │   └── extract-content.ts       # 正文提取
│   ├── parsers/
│   │   ├── pdf.ts                   # PDF 解析
│   │   ├── docx.ts                  # Word 解析
│   │   └── image.ts                 # 图片 OCR（可选）
│   ├── supabase/
│   │   ├── client.ts                # Supabase 客户端
│   │   └── middleware.ts            # Auth 中间件
│   └── utils/
│       ├── crypto.ts                # API Key 加解密
│       └── platform-config.ts       # 平台配置常量
├── types/
│   └── index.ts                     # 全局类型定义
└── hooks/
    ├── useGenerate.ts               # 文案生成 hook
    └── useClipboard.ts              # 剪贴板 hook
```

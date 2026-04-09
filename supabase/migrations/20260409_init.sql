-- =============================================================================
-- SocialMagic — Initial Schema Migration
-- Date: 2026-04-09
-- Description: Core tables for user profiles, content sources, and generated posts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Helper function — must be created before any triggers reference it
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. profiles — 用户画像
-- -----------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id      TEXT UNIQUE NOT NULL,              -- 匿名标识（localStorage 存储）
  email        TEXT,                              -- 可选，后续注册用
  api_keys     JSONB DEFAULT '{}',                -- {"openai": "enc:...", "anthropic": "enc:..."}
  display_name TEXT,
  preferences  JSONB DEFAULT '{}',                -- 灵活扩展：语调偏好、默认平台等
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.profiles IS '用户画像表，存储匿名用户信息和 API Key 配置';
COMMENT ON COLUMN public.profiles.api_keys IS 'AES 加密后的 API Key 映射，不明文存储';

-- -----------------------------------------------------------------------------
-- 2. contents — 原始素材
-- -----------------------------------------------------------------------------

CREATE TABLE public.contents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'file', 'text')),
  title       TEXT,                              -- 自动提取的标题
  raw_url     TEXT,                              -- 原始 URL（source_type = 'url' 时）
  raw_text    TEXT NOT NULL,                     -- 解析后的纯文本 / Markdown 内容
  file_name   TEXT,                              -- 原始文件名（source_type = 'file' 时）
  file_type   TEXT,                              -- MIME type
  word_count  INT DEFAULT 0,                     -- 素材字数
  metadata    JSONB DEFAULT '{}',                -- {description, image_urls[], author, ...}
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.contents IS '原始素材表，存储 URL 抓取 / 文件上传 / 手动输入的内容';
COMMENT ON COLUMN public.contents.raw_text IS '经过清洗的纯文本或 Markdown 格式内容';

CREATE INDEX idx_contents_profile ON public.contents(profile_id);
CREATE INDEX idx_contents_source_type ON public.contents(source_type);

-- -----------------------------------------------------------------------------
-- 3. social_posts — 生成的社交文案
-- -----------------------------------------------------------------------------

CREATE TABLE public.social_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id  UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('xiaohongshu', 'wechat', 'douyin', 'weibo')),
  body        TEXT NOT NULL,                     -- 生成的文案正文
  tone        TEXT NOT NULL,                     -- 实际使用的语调
  model       TEXT NOT NULL,                     -- 调用的 AI 模型（如 openai/gpt-4o）
  version     INT DEFAULT 1,                    -- 同一素材+平台的版本号
  token_count INT DEFAULT 0,                    -- 消耗 token 数
  char_count  INT DEFAULT 0,                    -- 文案字符数
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.social_posts IS '生成的社交文案表，每条记录关联一个素材和一个平台';
COMMENT ON COLUMN public.social_posts.version IS '同一 content_id + platform 组合的递增版本号';

CREATE INDEX idx_posts_profile ON public.social_posts(profile_id);
CREATE INDEX idx_posts_content ON public.social_posts(content_id);
CREATE INDEX idx_posts_platform ON public.social_posts(platform);
CREATE INDEX idx_posts_content_platform ON public.social_posts(content_id, platform);

-- =============================================================================
-- updated_at triggers (all tables)
-- =============================================================================

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_contents_updated_at
  BEFORE UPDATE ON public.contents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- RLS (Row Level Security) Policies
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- profiles RLS — direct anon_id match (no subquery needed)
-- -----------------------------------------------------------------------------

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id');

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id');

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id');

-- -----------------------------------------------------------------------------
-- contents RLS — optimized: single subquery resolved once per statement
-- -----------------------------------------------------------------------------

CREATE POLICY "contents_select_own" ON public.contents
  FOR SELECT USING (profile_id IN (SELECT id FROM public.profiles WHERE anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id'));

CREATE POLICY "contents_insert_own" ON public.contents
  FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id'));

CREATE POLICY "contents_update_own" ON public.contents
  FOR UPDATE USING (profile_id IN (SELECT id FROM public.profiles WHERE anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id'));

CREATE POLICY "contents_delete_own" ON public.contents
  FOR DELETE USING (profile_id IN (SELECT id FROM public.profiles WHERE anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id'));

-- -----------------------------------------------------------------------------
-- social_posts RLS — same optimized pattern via profile_id
-- -----------------------------------------------------------------------------

CREATE POLICY "posts_select_own" ON public.social_posts
  FOR SELECT USING (profile_id IN (SELECT id FROM public.profiles WHERE anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id'));

CREATE POLICY "posts_insert_own" ON public.social_posts
  FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id'));

CREATE POLICY "posts_update_own" ON public.social_posts
  FOR UPDATE USING (profile_id IN (SELECT id FROM public.profiles WHERE anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id'));

CREATE POLICY "posts_delete_own" ON public.social_posts
  FOR DELETE USING (profile_id IN (SELECT id FROM public.profiles WHERE anon_id = current_setting('request.jwt.claims', true)::json ->> 'anon_id'));

// =============================================================================
// SocialMagic — Core Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Platform
// -----------------------------------------------------------------------------

/** Supported social media platforms */
export type Platform = "xiaohongshu" | "wechat" | "douyin" | "weibo";

/** Emoji density preference */
export type EmojiLevel = "high" | "medium" | "low";

/** Session lifecycle states */
export type SessionStatus = "draft" | "generating" | "completed" | "error";

// -----------------------------------------------------------------------------
// Platform Configuration
// -----------------------------------------------------------------------------

export interface PlatformConfig {
  platform: Platform;
  displayName: string;
  maxLength: number;
  hashtagStyle: string;
  emojiDensity: EmojiLevel;
  defaultTone: string;
  structureTemplate: string;
}

/** Full platform config map — keyed by platform ID */
export type PlatformConfigMap = Record<Platform, PlatformConfig>;

// -----------------------------------------------------------------------------
// Source (Material Input)
// -----------------------------------------------------------------------------

export type SourceType = "url" | "file" | "text";

export interface SourceMetadata {
  title?: string;
  description?: string;
  imageUrls?: string[];
}

export interface Source {
  id: string;
  type: SourceType;
  content: string;
  rawUrl?: string;
  fileName?: string;
  fileType?: string;
  metadata?: SourceMetadata;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Scraping
// -----------------------------------------------------------------------------

export interface ScrapeRequest {
  url: string;
}

export interface ScrapeResult {
  success: boolean;
  content?: string;
  metadata?: SourceMetadata;
  error?: string;
}

// -----------------------------------------------------------------------------
// File Upload
// -----------------------------------------------------------------------------

export type SupportedFileType = "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "image/png" | "image/jpeg";

export interface FileParseResult {
  success: boolean;
  content?: string;
  fileName: string;
  fileType: SupportedFileType;
  error?: string;
}

// -----------------------------------------------------------------------------
// Generated Copy
// -----------------------------------------------------------------------------

export interface GeneratedCopy {
  id: string;
  sessionId: string;
  sourceId: string;
  platform: Platform;
  content: string;
  toneUsed: string;
  modelUsed: string;
  version: number;
  tokenCount: number;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Session
// -----------------------------------------------------------------------------

export interface Session {
  id: string;
  userId: string;
  title?: string;
  sources: Source[];
  generatedCopies: GeneratedCopy[];
  selectedPlatforms: Platform[];
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// User & Preferences
// -----------------------------------------------------------------------------

export interface User {
  id: string;
  anonId: string;
  email?: string;
  apiKeys: ApiKeyMap;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyMap {
  openai?: string;
  anthropic?: string;
}

export interface UserPreference {
  id: string;
  userId: string;
  platform: Platform;
  isEnabled: boolean;
  defaultTone: string;
  emojiLevel: EmojiLevel;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// API Request / Response Types
// -----------------------------------------------------------------------------

/** Tone overrides per platform — optional */
export type ToneOverrides = Partial<Record<Platform, string>>;

/** POST /api/generate request body */
export interface GenerateRequest {
  sessionId: string;
  sourceId: string;
  platforms: Platform[];
  toneOverrides?: ToneOverrides;
  provider?: "openai" | "anthropic";
}

/** Single platform generation result */
export interface GeneratedCopyResult {
  platform: Platform;
  content: string;
  model: string;
  tokenCount: number;
  version: number;
}

/** Single platform generation error */
export interface GeneratedCopyError {
  platform: Platform;
  message: string;
}

/** POST /api/generate response body */
export interface GenerateResponse {
  copies: GeneratedCopyResult[];
  errors: GeneratedCopyError[];
}

/** POST /api/validate-key request */
export interface ValidateKeyRequest {
  provider: "openai" | "anthropic";
  apiKey: string;
}

/** POST /api/validate-key response */
export interface ValidateKeyResponse {
  valid: boolean;
  error?: string;
}

// -----------------------------------------------------------------------------
// LLM Adapter Types
// -----------------------------------------------------------------------------

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMGenerateOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface LLMTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMGenerateResult {
  content: string;
  model: string;
  usage: LLMTokenUsage;
}

// -----------------------------------------------------------------------------
// Constants (Platform Defaults)
// -----------------------------------------------------------------------------

export const PLATFORM_DEFAULTS: PlatformConfigMap = {
  xiaohongshu: {
    platform: "xiaohongshu",
    displayName: "小红书",
    maxLength: 1000,
    hashtagStyle: "#标签 ",
    emojiDensity: "high",
    defaultTone: "种草分享、亲切姐妹风",
    structureTemplate: "【标题】\n正文（分段+emoji）\n话题标签",
  },
  wechat: {
    platform: "wechat",
    displayName: "微信朋友圈",
    maxLength: 1500,
    hashtagStyle: "",
    emojiDensity: "medium",
    defaultTone: "个人随笔、生活感",
    structureTemplate: "正文（简洁有温度）",
  },
  douyin: {
    platform: "douyin",
    displayName: "抖音",
    maxLength: 300,
    hashtagStyle: "#标签 ",
    emojiDensity: "medium",
    defaultTone: "短平快、有节奏感",
    structureTemplate: "钩子（前3秒）\n正文（短有力）\n话题标签",
  },
  weibo: {
    platform: "weibo",
    displayName: "微博",
    maxLength: 2000,
    hashtagStyle: "#标签#",
    emojiDensity: "low",
    defaultTone: "观点鲜明、网感强",
    structureTemplate: "观点正文\n#话题#",
  },
};

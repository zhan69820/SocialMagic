import type { Platform } from "@/types/index";

// =============================================================================
// Platform theme — single source of truth
// =============================================================================

export interface PlatformTheme {
  label: string;
  subtitle: string;
  accent: string;
  gradientFrom: string;
  gradientTo: string;
  activeGlow: string;
  badgeBg: string;
  ring: string;
  bg: string;
}

export const PLATFORM_THEME: Record<Platform, PlatformTheme> = {
  xiaohongshu: {
    label: "小红书",
    subtitle: "种草笔记",
    accent: "text-red-400",
    gradientFrom: "from-red-500/25",
    gradientTo: "to-pink-600/10",
    activeGlow: "shadow-red-500/30",
    badgeBg: "bg-red-500/15 text-red-400",
    ring: "ring-red-500/30",
    bg: "bg-red-500/10",
  },
  wechat: {
    label: "微信",
    subtitle: "公众号文章",
    accent: "text-green-400",
    gradientFrom: "from-green-500/25",
    gradientTo: "to-emerald-600/10",
    activeGlow: "shadow-green-500/30",
    badgeBg: "bg-green-500/15 text-green-400",
    ring: "ring-green-500/30",
    bg: "bg-green-500/10",
  },
  douyin: {
    label: "抖音",
    subtitle: "爆款短视频",
    accent: "text-cyan-400",
    gradientFrom: "from-cyan-500/25",
    gradientTo: "to-blue-600/10",
    activeGlow: "shadow-cyan-500/30",
    badgeBg: "bg-cyan-500/15 text-cyan-400",
    ring: "ring-cyan-500/30",
    bg: "bg-cyan-500/10",
  },
  weibo: {
    label: "微博",
    subtitle: "热搜锐评",
    accent: "text-orange-400",
    gradientFrom: "from-orange-500/25",
    gradientTo: "to-amber-600/10",
    activeGlow: "shadow-orange-500/30",
    badgeBg: "bg-orange-500/15 text-orange-400",
    ring: "ring-orange-500/30",
    bg: "bg-orange-500/10",
  },
};

// =============================================================================
// Tone presets per platform
// =============================================================================

export const TONE_PRESETS: Record<Platform, { label: string; value: string }[]> = {
  xiaohongshu: [
    { label: "种草分享", value: "种草分享风格，热情真诚，适合推荐好物" },
    { label: "测评安利", value: "专业测评风格，理性分析优缺点" },
    { label: "教程干货", value: "干货教程风格，步骤清晰，有实操价值" },
    { label: "搞笑吐槽", value: "轻松幽默风格，有梗有趣" },
  ],
  wechat: [
    { label: "深度分析", value: "深度分析风格，逻辑严密，有见地" },
    { label: "故事叙述", value: "故事叙述风格，引人入胜，有画面感" },
    { label: "热点评论", value: "热点评论风格，观点鲜明，有态度" },
    { label: "知识科普", value: "知识科普风格，通俗易懂，有料有趣" },
  ],
  douyin: [
    { label: "爆款开场", value: "爆款短视频风格，前3秒必须抓住注意力" },
    { label: "反转剧情", value: "反转剧情风格，结尾出人意料" },
    { label: "干货口播", value: "口播干货风格，节奏快信息密度高" },
    { label: "情感共鸣", value: "情感共鸣风格，触动人心的表达" },
  ],
  weibo: [
    { label: "犀利点评", value: "犀利点评风格，一针见血，有态度" },
    { label: "搞笑段子", value: "搞笑段子风格，脑洞大开" },
    { label: "热搜体", value: "热搜话题风格，蹭热点引发讨论" },
    { label: "文艺走心", value: "文艺走心风格，文字优美有深度" },
  ],
};

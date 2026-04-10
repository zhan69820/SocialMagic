"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Copy, Check } from "lucide-react";
import type { Platform } from "@/types/index";
import PlatformIcon from "@/components/PlatformIcon";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useHapticCopy } from "@/hooks/useHapticCopy";
import { useTheme } from "@/providers/theme-provider";

// =============================================================================
// Platform visual config
// =============================================================================

const PLATFORM_VISUAL: Record<
  Platform,
  { label: string; accent: string; ring: string; bg: string }
> = {
  xiaohongshu: { label: "小红书", accent: "text-red-400", ring: "ring-red-500/30", bg: "bg-red-500/10" },
  wechat: { label: "微信", accent: "text-green-400", ring: "ring-green-500/30", bg: "bg-green-500/10" },
  douyin: { label: "抖音", accent: "text-cyan-400", ring: "ring-cyan-500/30", bg: "bg-cyan-500/10" },
  weibo: { label: "微博", accent: "text-orange-400", ring: "ring-orange-500/30", bg: "bg-orange-500/10" },
};

// =============================================================================
// Score color
// =============================================================================

function getScoreColor(score: number): string {
  if (score >= 90) return "text-amber-400";
  if (score >= 75) return "text-violet-400";
  if (score >= 60) return "text-gray-400";
  return "text-gray-600";
}

function getScoreGlow(score: number): string {
  if (score >= 90) return "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]";
  if (score >= 75) return "drop-shadow-[0_0_6px_rgba(139,92,246,0.4)]";
  return "";
}

// =============================================================================
// Animated counter
// =============================================================================

function AnimatedScore({ value, streaming }: { value: number; streaming?: boolean }) {
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [text, setText] = useState("0");

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(String(v)));
    if (!streaming) spring.set(value);
    return unsub;
  }, [spring, display, value, streaming]);

  if (streaming) {
    return <span className="tabular-nums font-semibold text-[13px] text-gray-500">...</span>;
  }

  return (
    <span className={`tabular-nums font-semibold text-[13px] ${getScoreColor(value)} ${getScoreGlow(value)}`}>
      {text}%
    </span>
  );
}

// =============================================================================
// Props
// =============================================================================

export interface SocialPostCardProps {
  platform: Platform;
  body: string;
  tone: string;
  alchemySuccessRate: number;
  index?: number;
  layoutId?: string;
  streaming?: boolean;
}

// =============================================================================
// SocialPostCard — Dual-Theme Glass Card
// =============================================================================

export default function SocialPostCard({
  platform,
  body,
  tone,
  alchemySuccessRate,
  index = 0,
  layoutId,
  streaming = false,
}: SocialPostCardProps) {
  const [copied, setCopied] = useState(false);
  const visual = PLATFORM_VISUAL[platform];
  const copyWithHaptic = useHapticCopy();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { displayed, cursorVisible, isTyping, skipToEnd } = useTypewriter(
    streaming ? body : "",
    { charsPerTick: 3, tickInterval: 12 }
  );

  const handleCopy = async () => {
    const ok = await copyWithHaptic(body);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBodyClick = () => {
    if (streaming && isTyping) skipToEnd();
  };

  const displayBody = streaming ? displayed : body;

  const inner = (
    <div className="group relative rounded-2xl backdrop-blur-xl border transition-all duration-300 overflow-hidden glass-card">
      {/* Inner glow refraction */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, transparent 40%, transparent 60%, rgba(6,182,212,0.04) 100%)",
      }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center ring-1 ${visual.ring} ${visual.bg} ${visual.accent}`}>
            <PlatformIcon platform={platform} size={16} />
          </span>
          <div>
            <span className="text-[13px] font-medium leading-tight" style={{ color: "var(--text-primary)" }}>{visual.label}</span>
            <span className="block text-[11px] leading-tight" style={{ color: "var(--text-tertiary)" }}>
              {streaming ? "生成中..." : tone}
            </span>
          </div>
        </div>

        {/* Score gauge */}
        <div className="flex items-center gap-1.5 relative">
          <svg width="28" height="28" viewBox="0 0 28 28" style={{ color: "var(--bg-card-border)" }}>
            <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          {!streaming && (
            <svg width="28" height="28" viewBox="0 0 28 28" className={`absolute ${getScoreColor(alchemySuccessRate)}`} style={{ transform: "rotate(-90deg)" }}>
              <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${alchemySuccessRate * 0.691} 69.1`} strokeLinecap="round" />
            </svg>
          )}
          <AnimatedScore value={alchemySuccessRate} streaming={streaming} />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-4" onClick={handleBodyClick}>
        <div className="text-[14px] whitespace-pre-wrap leading-[1.8] max-h-56 overflow-y-auto pr-1" style={{ color: isDark ? "#d1d5db" : "#4b5563" }}>
          {displayBody}
          {streaming && cursorVisible && (
            <span className="inline-block w-[2px] h-[14px] bg-violet-400 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </div>
      </div>

      {/* Footer */}
      {!streaming && (
        <div className="flex items-center justify-between px-5 py-2.5" style={{ borderTop: "1px solid var(--bg-card-border)" }}>
          <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>{body.length} 字</span>
          <motion.button
            onClick={handleCopy}
            whileTap={{ scale: 0.92 }}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-200
              ${copied
                ? "bg-emerald-500/20 text-emerald-400"
                : isDark
                  ? "bg-white/[0.04] text-gray-500 hover:bg-white/[0.08] hover:text-gray-300"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              }
            `}
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5" /> 已复制</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> 复制</>
            )}
          </motion.button>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      layout={!!layoutId}
      layoutId={layoutId}
      initial={{ opacity: 0, y: 60, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{
        delay: index * 0.08,
        type: "spring",
        stiffness: 200,
        damping: 18,
        mass: 0.8,
      }}
    >
      {inner}
    </motion.div>
  );
}

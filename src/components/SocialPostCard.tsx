"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Copy, Check } from "lucide-react";
import type { Platform } from "@/types/index";

// =============================================================================
// Platform visual config
// =============================================================================

const PLATFORM_VISUAL: Record<
  Platform,
  { label: string; glyph: string; accent: string; ring: string; bg: string }
> = {
  xiaohongshu: { label: "小红书", glyph: "红", accent: "text-red-500", ring: "ring-red-200", bg: "bg-red-50" },
  wechat: { label: "微信", glyph: "微", accent: "text-green-600", ring: "ring-green-200", bg: "bg-green-50" },
  douyin: { label: "抖音", glyph: "抖", accent: "text-gray-900", ring: "ring-gray-300", bg: "bg-gray-50" },
  weibo: { label: "微博", glyph: "博", accent: "text-orange-500", ring: "ring-orange-200", bg: "bg-orange-50" },
};

// =============================================================================
// Animated counter — springs from 0 to target
// =============================================================================

function AnimatedScore({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [text, setText] = useState("0");

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(String(v)));
    spring.set(value);
    return unsub;
  }, [spring, display, value]);

  return (
    <span className="tabular-nums font-semibold text-[13px] text-gray-500">{text}%</span>
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
  /** Stagger index for initial reveal animation */
  index?: number;
  /** If true, use layoutId for masonry re-ordering animation */
  layoutId?: string;
}

// =============================================================================
// SocialPostCard — Apple pure-white card
// =============================================================================

export default function SocialPostCard({
  platform,
  body,
  tone,
  alchemySuccessRate,
  index = 0,
  layoutId,
}: SocialPostCardProps) {
  const [copied, setCopied] = useState(false);
  const visual = PLATFORM_VISUAL[platform];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inner = (
    <div className="group rounded-2xl bg-white backdrop-blur-xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-shadow duration-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ring-1 ${visual.ring} ${visual.bg} ${visual.accent}`}>
            {visual.glyph}
          </span>
          <div>
            <span className="text-[13px] font-medium text-gray-800 leading-tight">{visual.label}</span>
            <span className="block text-[11px] text-gray-400 leading-tight">{tone}</span>
          </div>
        </div>

        {/* Alchemy Score gauge */}
        <div className="flex items-center gap-1.5">
          <svg width="28" height="28" viewBox="0 0 28 28" className="text-gray-200">
            <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          <svg width="28" height="28" viewBox="0 0 28 28" className="absolute text-[#0071E3]" style={{ transform: `rotate(-90deg)` }}>
            <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${alchemySuccessRate * 0.691} 69.1`} strokeLinecap="round" />
          </svg>
          <AnimatedScore value={alchemySuccessRate} />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-4">
        <div className="text-[14px] text-gray-600 whitespace-pre-wrap leading-[1.8] max-h-56 overflow-y-auto pr-1">
          {body}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-black/[0.04]">
        <span className="text-[11px] text-gray-400">{body.length} 字</span>
        <motion.button
          onClick={handleCopy}
          whileTap={{ scale: 0.92 }}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-200
            ${copied ? "bg-emerald-50 text-emerald-600" : "bg-gray-100/80 text-gray-500 hover:bg-gray-200/60 hover:text-gray-700"}
          `}
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5" /> 已复制</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> 复制</>
          )}
        </motion.button>
      </div>
    </div>
  );

  return (
    <motion.div
      layout={!!layoutId}
      layoutId={layoutId}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        delay: index * 0.08,
        type: "spring",
        stiffness: 260,
        damping: 22,
      }}
    >
      {inner}
    </motion.div>
  );
}

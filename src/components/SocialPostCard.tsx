"use client";

import { useEffect, useState, useRef } from "react";
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
  xiaohongshu: {
    label: "小红书",
    glyph: "红",
    accent: "text-red-500",
    ring: "ring-red-200",
    bg: "bg-red-50",
  },
  wechat: {
    label: "微信",
    glyph: "微",
    accent: "text-green-600",
    ring: "ring-green-200",
    bg: "bg-green-50",
  },
  douyin: {
    label: "抖音",
    glyph: "抖",
    accent: "text-gray-900",
    ring: "ring-gray-300",
    bg: "bg-gray-50",
  },
  weibo: {
    label: "微博",
    glyph: "博",
    accent: "text-orange-500",
    ring: "ring-orange-200",
    bg: "bg-orange-50",
  },
};

// =============================================================================
// Animated counter — springs from 0 to target
// =============================================================================

function AnimatedScore({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));

  const [text, setText] = useState("0");

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setText(String(v)));
    spring.set(value);
    return unsubscribe;
  }, [spring, display, value]);

  return (
    <span className="tabular-nums font-semibold text-[13px] text-gray-500">
      {text}%
    </span>
  );
}

// =============================================================================
// SocialPostCard
// =============================================================================

interface SocialPostCardProps {
  platform: Platform;
  body: string;
  tone: string;
  alchemySuccessRate: number;
  index: number;
}

export default function SocialPostCard({
  platform,
  body,
  tone,
  alchemySuccessRate,
  index,
}: SocialPostCardProps) {
  const [copied, setCopied] = useState(false);
  const visual = PLATFORM_VISUAL[platform];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.1,
        type: "spring",
        stiffness: 260,
        damping: 22,
      }}
      className="group relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-shadow duration-300"
    >
      {/* ---- Top bar ---- */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        {/* Platform badge */}
        <div className="flex items-center gap-3">
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ring-1 ${visual.ring} ${visual.bg} ${visual.accent}`}
          >
            {visual.glyph}
          </span>
          <div>
            <span className="text-[13px] font-medium text-gray-800">
              {visual.label}
            </span>
            <span className="block text-[11px] text-gray-400">{tone}</span>
          </div>
        </div>

        {/* Alchemy score */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400 uppercase tracking-wider">
            炼金度
          </span>
          <AnimatedScore value={alchemySuccessRate} />
        </div>
      </div>

      {/* ---- Body ---- */}
      <div className="px-6 pb-5">
        <div className="text-[14px] text-gray-600 whitespace-pre-wrap leading-[1.75] max-h-72 overflow-y-auto pr-2 scrollbar-thin">
          {body}
        </div>
      </div>

      {/* ---- Bottom action bar ---- */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-900/5">
        <span className="text-[11px] text-gray-400">{body.length} 字</span>
        <button
          onClick={handleCopy}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200
            ${
              copied
                ? "bg-emerald-50 text-emerald-600"
                : "bg-gray-100/80 text-gray-500 hover:bg-violet-50 hover:text-violet-600 active:scale-95"
            }
          `}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              复制文案
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

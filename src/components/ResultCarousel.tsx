"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Copy, Check, RefreshCw, Repeat } from "lucide-react";
import type { Platform } from "@/types/index";
import PlatformIcon from "@/components/PlatformIcon";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useHapticCopy } from "@/hooks/useHapticCopy";
import { useTheme } from "@/providers/theme-provider";
import { PLATFORM_THEME } from "@/lib/constants/platform-theme";
import { getScoreColor, getScoreLabel } from "@/lib/utils/score-helpers";

// =============================================================================
// Animated counter
// =============================================================================

function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const from = 0;
    const to = value;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span className={`tabular-nums font-bold text-[28px] ${getScoreColor(value)}`}>
      {display}
      <span className="text-[16px] font-medium ml-0.5 opacity-60">%</span>
    </span>
  );
}

// =============================================================================
// StreamingCard — separate component for hooks rule
// =============================================================================

function StreamingCard({
  item,
  index,
  streamingMap,
}: {
  item: { platform: Platform; body: string; tone: string; alchemySuccessRate: number };
  index: number;
  streamingMap: Map<Platform, string>;
}) {
  const pTheme = PLATFORM_THEME[item.platform];
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const streamingText = streamingMap.get(item.platform) || "";
  const { displayed, cursorVisible } = useTypewriter(streamingText, {
    charsPerTick: 3,
    tickInterval: 12,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 20 }}
      className={`rounded-2xl backdrop-blur-xl border overflow-hidden bg-gradient-to-br ${pTheme.gradientFrom} ${pTheme.gradientTo}`}
      style={{ borderColor: "var(--bg-card-border)" }}
    >
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pTheme.badgeBg}`}>
          <PlatformIcon platform={item.platform} size={22} />
        </div>
        <div>
          <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>{pTheme.label}</span>
          <span className="block text-[11px] text-violet-400 animate-pulse-glow">生成中...</span>
        </div>
      </div>
      <div className="px-6 pb-5">
        <div className="text-[14px] whitespace-pre-wrap leading-[1.9] max-h-48 overflow-y-auto" style={{ color: isDark ? "#d1d5db" : "#4b5563" }}>
          {displayed}
          {cursorVisible && (
            <span className="inline-block w-[2px] h-[14px] bg-violet-400 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Carousel item
// =============================================================================

interface CarouselItem {
  platform: Platform;
  body: string;
  tone: string;
  alchemySuccessRate: number;
}

// =============================================================================
// ResultCarousel — full-width swipeable carousel
// =============================================================================

interface ResultCarouselProps {
  items: CarouselItem[];
  streamingMap?: Map<Platform, string>;
  isStreaming?: boolean;
  onReset?: () => void;
  onRegenPlatform?: (platform: Platform) => void;
}

export default function ResultCarousel({
  items,
  streamingMap,
  isStreaming = false,
  onReset,
  onRegenPlatform,
}: ResultCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const copyWithHaptic = useHapticCopy();
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const goTo = (idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const prev = () => {
    setDirection(-1);
    setCurrent((c) => (c > 0 ? c - 1 : items.length - 1));
  };

  const next = () => {
    setDirection(1);
    setCurrent((c) => (c < items.length - 1 ? c + 1 : 0));
  };

  const handleCopy = async (text: string, idx: number) => {
    const ok = await copyWithHaptic(text);
    if (ok) {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(-1), 2000);
    }
  };

  // Streaming mode — show all cards stacked
  if (isStreaming && streamingMap) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full space-y-4"
      >
        <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--text-quaternary)" }}>
          炼金进行中
        </p>
        {items.map((item, i) => (
          <StreamingCard key={item.platform} item={item} index={i} streamingMap={streamingMap} />
        ))}
      </motion.div>
    );
  }

  if (items.length === 0) return null;

  const currentItem = items[current];
  const pTheme = PLATFORM_THEME[currentItem.platform];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.9,
    }),
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      {/* Section label */}
      <p className="text-[11px] uppercase tracking-wider font-medium mb-4" style={{ color: "var(--text-quaternary)" }}>
        炼金结果
      </p>

      {/* Carousel container */}
      <div className="relative">
        {/* Main card */}
        <div className="overflow-hidden rounded-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`rounded-2xl backdrop-blur-xl border overflow-hidden bg-gradient-to-br ${pTheme.gradientFrom} ${pTheme.gradientTo}`}
              style={{ borderColor: "var(--bg-card-border)" }}
            >
              {/* Card header — platform badge + score */}
              <div className="flex items-center justify-between px-6 pt-6 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${pTheme.badgeBg}`}>
                    <PlatformIcon platform={currentItem.platform} size={24} />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>
                      {pTheme.label}
                    </h3>
                    <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                      {currentItem.tone || getScoreLabel(currentItem.alchemySuccessRate)}
                    </span>
                  </div>
                </div>

                {/* Score circle */}
                <div className="flex flex-col items-center">
                  <div className="relative w-16 h-16">
                    <svg width="64" height="64" viewBox="0 0 64 64" style={{ color: "var(--bg-card-border)" }}>
                      <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="3" />
                    </svg>
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 64 64"
                      className={`absolute ${getScoreColor(currentItem.alchemySuccessRate)}`}
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${currentItem.alchemySuccessRate * 1.634} 163.4`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AnimatedScore value={currentItem.alchemySuccessRate} />
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium mt-1 ${getScoreColor(currentItem.alchemySuccessRate)}`}>
                    {getScoreLabel(currentItem.alchemySuccessRate)}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-6 border-t" style={{ borderColor: "var(--bg-card-border)" }} />

              {/* Card body */}
              <div className="px-6 py-5">
                <div
                  className="text-[15px] whitespace-pre-wrap leading-[2] max-h-64 overflow-y-auto pr-1"
                  style={{ color: isDark ? "#d1d5db" : "#4b5563" }}
                >
                  {currentItem.body}
                </div>
              </div>

              {/* Card footer */}
              <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid var(--bg-card-border)" }}>
                <span className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>
                  {currentItem.body.length} 字
                </span>
                <div className="flex items-center gap-2">
                  {onRegenPlatform && (
                    <motion.button
                      onClick={() => onRegenPlatform(currentItem.platform)}
                      whileTap={{ scale: 0.92 }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors duration-200 hover:bg-white/[0.08]"
                      style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--bg-card-border)" }}
                      title="重新生成该平台文案"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      重炼
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => handleCopy(currentItem.body, current)}
                    whileTap={{ scale: 0.92 }}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-200
                      ${copiedIdx === current
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[0_2px_12px_rgba(139,92,246,0.25)] hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)]"
                      }
                    `}
                  >
                    {copiedIdx === current ? (
                      <><Check className="w-4 h-4" /> 已复制</>
                    ) : (
                      <><Copy className="w-4 h-4" /> 复制文案</>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation arrows — only show if > 1 */}
        {items.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-200 hover:scale-110"
              style={{ background: "var(--bg-card)", borderColor: "var(--bg-card-border)", color: "var(--text-secondary)" }}
              aria-label="上一个"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-200 hover:scale-110"
              style={{ background: "var(--bg-card)", borderColor: "var(--bg-card-border)", color: "var(--text-secondary)" }}
              aria-label="下一个"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots indicator */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-5">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: idx === current ? "24px" : "8px",
                  height: "8px",
                  background: idx === current
                    ? "linear-gradient(90deg, #8b5cf6, #06b6d4)"
                    : "var(--bg-card-border)",
                }}
                aria-label={`第 ${idx + 1} 个`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reset button */}
      {onReset && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={onReset}
          whileTap={{ scale: 0.97 }}
          className="w-full mt-5 py-3 rounded-2xl border flex items-center justify-center gap-2 text-[13px] transition-all duration-200 glass-card"
          style={{ color: "var(--text-tertiary)" }}
        >
          <RefreshCw className="w-4 h-4" />
          开始新的炼金
        </motion.button>
      )}
    </motion.div>
  );
}

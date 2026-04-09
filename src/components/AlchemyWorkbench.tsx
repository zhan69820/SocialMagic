"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { useIdentity } from "@/providers/identity-provider";
import type { Platform, Content } from "@/types/index";

// =============================================================================
// Platform icon mapping — simple colored circles with abbreviations
// =============================================================================

const PLATFORM_META: Record<
  Platform,
  { label: string; abbr: string; color: string; bgActive: string }
> = {
  xiaohongshu: {
    label: "小红书",
    abbr: "红",
    color: "text-red-500",
    bgActive: "bg-red-50 border-red-200",
  },
  wechat: {
    label: "微信",
    abbr: "微",
    color: "text-green-500",
    bgActive: "bg-green-50 border-green-200",
  },
  douyin: {
    label: "抖音",
    abbr: "抖",
    color: "text-gray-800",
    bgActive: "bg-gray-100 border-gray-300",
  },
  weibo: {
    label: "微博",
    abbr: "博",
    color: "text-orange-500",
    bgActive: "bg-orange-50 border-orange-200",
  },
};

// =============================================================================
// Progress messages for ingest flow
// =============================================================================

const PROGRESS_STEPS = [
  "正在连接源站...",
  "正在下载页面内容...",
  "正在提取精华...",
  "正在解析正文结构...",
  "炼金原料已入库!",
];

// =============================================================================
// Main component
// =============================================================================

type Phase = "idle" | "ingesting" | "ingested" | "generating" | "done";

interface GeneratedCopy {
  platform: Platform;
  body: string;
  tone: string;
  alchemySuccessRate: number;
}

export default function AlchemyWorkbench() {
  const { anonId, ready: identityReady } = useIdentity();

  // URL input
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progressMsg, setProgressMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Ingest result
  const [content, setContent] = useState<Content | null>(null);

  // Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set()
  );

  // Generation results
  const [copies, setCopies] = useState<GeneratedCopy[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- Ingest handler ---
  const handleIngest = useCallback(async () => {
    if (!url.trim() || !anonId) return;

    setPhase("ingesting");
    setErrorMsg("");
    setContent(null);
    setCopies([]);

    // Animate progress text
    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < PROGRESS_STEPS.length) {
        setProgressMsg(PROGRESS_STEPS[stepIdx]);
      }
    }, 800);
    setProgressMsg(PROGRESS_STEPS[0]);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anon-id": anonId,
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      clearInterval(interval);

      const data = await res.json();

      if (!data.success) {
        setPhase("idle");
        setErrorMsg(data.error);
        return;
      }

      setContent(data.content);
      setProgressMsg(PROGRESS_STEPS[PROGRESS_STEPS.length - 1]);
      setPhase("ingested");
    } catch (err) {
      clearInterval(interval);
      setPhase("idle");
      setErrorMsg((err as Error).message);
    }
  }, [url, anonId]);

  // --- Platform toggle ---
  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  // --- Copy to clipboard ---
  const handleCopy = async (text: string, platformKey: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(platformKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- Generate handler ---
  const handleGenerate = useCallback(async () => {
    if (!content || !anonId || selectedPlatforms.size === 0) return;

    setPhase("generating");
    setErrorMsg("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anon-id": anonId,
        },
        body: JSON.stringify({
          contentId: content.id,
          sourceText: content.rawText,
          config: {
            platforms: Array.from(selectedPlatforms),
            provider: "openai" as const,
          },
          apiKey: "placeholder",
        }),
      });

      const data = await res.json();

      if (data.errors?.length > 0 && data.copies?.length === 0) {
        setErrorMsg(data.errors.map((e: { message: string }) => e.message).join("; "));
        setPhase("ingested");
        return;
      }

      setCopies(
        data.copies.map((c: GeneratedCopy & { platform: Platform }) => ({
          platform: c.platform,
          body: c.body,
          tone: c.tone,
          alchemySuccessRate: c.alchemySuccessRate,
        }))
      );
      setPhase("done");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setPhase("ingested");
    }
  }, [content, anonId, selectedPlatforms]);

  const canIngest = url.trim().length > 0 && phase === "idle";
  const canGenerate = phase === "ingested" && selectedPlatforms.size > 0;

  return (
    <div className="flex flex-col items-center">
      {/* ---- Hero heading ---- */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2"
      >
        SocialMagic
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="text-gray-400 text-sm mb-10"
      >
        投入素材，炼出黄金文案
      </motion.p>

      {/* ---- Spotlight-style URL input ---- */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-2xl"
      >
        <div
          className={`
            relative flex items-center gap-3 px-5 py-4 rounded-2xl
            bg-white/80 backdrop-blur-2xl border border-white/60
            shadow-[0_4px_24px_rgba(0,0,0,0.04)]
            transition-shadow duration-300
            focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.15),0_4px_24px_rgba(0,0,0,0.06)]
            focus-within:border-violet-300/60
          `}
        >
          <Search className="w-5 h-5 text-gray-300 shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canIngest && handleIngest()}
            placeholder="粘贴文章或商品链接，开始炼金..."
            disabled={phase !== "idle"}
            className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-300 disabled:opacity-50"
          />
          {phase === "ingesting" && (
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin shrink-0" />
          )}
          {phase === "idle" && (
            <button
              onClick={handleIngest}
              disabled={!canIngest}
              className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              开始炼金
            </button>
          )}
        </div>
      </motion.div>

      {/* ---- Progress message ---- */}
      <AnimatePresence>
        {progressMsg && phase === "ingesting" && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 text-sm text-violet-500 flex items-center gap-2"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {progressMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ---- Ingest success indicator ---- */}
      <AnimatePresence>
        {(phase === "ingested" || phase === "generating") && content && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full max-w-2xl mt-8"
          >
            <div className="flex items-center gap-2 text-sm text-emerald-600 mb-6">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                素材入库成功 — {content.wordCount} 字
                {content.title ? ` · ${content.title}` : ""}
              </span>
            </div>

            {/* ---- Platform selector ---- */}
            <div className="mb-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
                选择目标平台
              </p>
              <div className="flex gap-3">
                {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
                  const meta = PLATFORM_META[p];
                  const selected = selectedPlatforms.has(p);
                  return (
                    <motion.button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      whileTap={{ scale: 0.92 }}
                      animate={{
                        scale: selected ? 1.08 : 1,
                        opacity: selected ? 1 : 0.6,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 25,
                      }}
                      className={`
                        flex flex-col items-center gap-1.5 px-5 py-4 rounded-2xl border transition-colors duration-200
                        ${
                          selected
                            ? `${meta.bgActive} shadow-sm`
                            : "bg-white/60 border-white/40 hover:bg-white/80"
                        }
                      `}
                    >
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                          selected ? meta.color : "text-gray-300"
                        }`}
                      >
                        {meta.abbr}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          selected ? "text-gray-700" : "text-gray-400"
                        }`}
                      >
                        {meta.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ---- Generate button ---- */}
            <motion.button
              onClick={handleGenerate}
              disabled={!canGenerate && phase !== "generating"}
              whileHover={canGenerate ? { scale: 1.02 } : {}}
              whileTap={canGenerate ? { scale: 0.98 } : {}}
              className={`
                w-full py-4 rounded-2xl text-sm font-semibold transition-all duration-300
                ${
                  canGenerate || phase === "generating"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
                    : "bg-gray-200/60 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              {phase === "generating" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在炼金...
                </span>
              ) : (
                `炼出文案 (${selectedPlatforms.size} 个平台)`
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Error display ---- */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full max-w-2xl mt-4 flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Generated copy cards ---- */}
      <AnimatePresence>
        {phase === "done" && copies.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-2xl mt-8 space-y-4"
          >
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
              炼金结果
            </p>
            {copies.map((copy, i) => {
              const meta = PLATFORM_META[copy.platform];
              return (
                <motion.div
                  key={copy.platform}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.08,
                    type: "spring",
                    stiffness: 300,
                    damping: 24,
                  }}
                  className="p-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${meta.color} ${meta.bgActive}`}
                      >
                        {meta.abbr}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {copy.alchemySuccessRate}% 炼金度
                      </span>
                      <button
                        onClick={() => handleCopy(copy.body, copy.platform)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 transition"
                      >
                        {copiedId === copy.platform ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500">已复制</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            复制
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Copy body */}
                  <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto pr-2">
                    {copy.body}
                  </div>
                </motion.div>
              );
            })}

            {/* Reset button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: copies.length * 0.08 + 0.2 }}
              onClick={() => {
                setPhase("idle");
                setUrl("");
                setContent(null);
                setCopies([]);
                setSelectedPlatforms(new Set());
                setProgressMsg("");
                setErrorMsg("");
              }}
              className="w-full py-3 rounded-2xl border border-gray-200 text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition"
            >
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                开始新的炼金
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

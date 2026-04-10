"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { useIdentity } from "@/providers/identity-provider";
import SocialPostCard from "@/components/SocialPostCard";
import VaultGrid, { resultsToVaultItems } from "@/components/VaultGrid";
import PlatformIcon from "@/components/PlatformIcon";
import type { Platform, Content, ProviderEntry } from "@/types/index";

// =============================================================================
// Platform meta — dark theme colors
// =============================================================================

const PLATFORM_META: Record<
  Platform,
  {
    label: string;
    color: string;
    bgActive: string;
    ringActive: string;
    glowColor: string;
  }
> = {
  xiaohongshu: {
    label: "小红书",
    color: "text-red-400",
    bgActive: "bg-red-500/10",
    ringActive: "ring-red-500/30",
    glowColor: "shadow-red-500/10",
  },
  wechat: {
    label: "微信",
    color: "text-green-400",
    bgActive: "bg-green-500/10",
    ringActive: "ring-green-500/30",
    glowColor: "shadow-green-500/10",
  },
  douyin: {
    label: "抖音",
    color: "text-cyan-400",
    bgActive: "bg-cyan-500/10",
    ringActive: "ring-cyan-500/30",
    glowColor: "shadow-cyan-500/10",
  },
  weibo: {
    label: "微博",
    color: "text-orange-400",
    bgActive: "bg-orange-500/10",
    ringActive: "ring-orange-500/30",
    glowColor: "shadow-orange-500/10",
  },
};

// =============================================================================
// Ritual progress
// =============================================================================

const INGEST_STEPS = [
  "正在连接源站...",
  "正在下载页面内容...",
  "正在提取精华...",
  "正在解析正文结构...",
  "素材已入库",
];

const UPLOAD_STEPS = [
  "正在上传文件...",
  "正在解析文档内容...",
  "正在提取文本...",
  "素材已入库",
];

const PLATFORM_RITUAL_LABELS: Record<Platform, string> = {
  xiaohongshu: "小红书金句",
  wechat: "微信随笔",
  douyin: "抖音爆款",
  weibo: "微博锐评",
};

function buildRitualSteps(platforms: Platform[]): string[] {
  const platformParts = platforms.map((p) => PLATFORM_RITUAL_LABELS[p]);
  return [
    "正在解析结界内容...",
    `正在调配${platformParts[0]}配方...`,
    platformParts.length > 1
      ? `${platformParts.slice(0, -1).join("、")}正在凝固...`
      : "文案正在凝固...",
    "最后润色中...",
  ];
}

// =============================================================================
// Spring config
// =============================================================================

const SPRING_ENTER = { type: "spring" as const, stiffness: 260, damping: 22 };
const SPRING_TAP = { type: "spring" as const, stiffness: 500, damping: 28 };

// =============================================================================
// Types
// =============================================================================

type Phase = "idle" | "ingesting" | "ingested" | "generating" | "done";

interface GeneratedCopy {
  platform: Platform;
  body: string;
  tone: string;
  alchemySuccessRate: number;
}

// =============================================================================
// Main component — Dark Alchemy Edition
// =============================================================================

export default function AlchemyWorkbench() {
  const { anonId } = useIdentity();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progressMsg, setProgressMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [content, setContent] = useState<Content | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set()
  );
  const [copies, setCopies] = useState<GeneratedCopy[]>([]);
  const [streamingMap, setStreamingMap] = useState<Map<Platform, string>>(
    new Map()
  );
  const [vaultItems, setVaultItems] = useState<
    ReturnType<typeof resultsToVaultItems>
  >([]);
  const [inputFocused, setInputFocused] = useState(false);

  // --- Animated progress text ---
  useEffect(() => {
    if (phase !== "ingesting" && phase !== "generating") return;

    const steps =
      phase === "ingesting"
        ? progressMsg.startsWith("[文件]")
          ? UPLOAD_STEPS
          : INGEST_STEPS
        : buildRitualSteps(Array.from(selectedPlatforms));
    setProgressMsg(steps[0]);

    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx < steps.length) {
        setProgressMsg(steps[idx]);
      } else {
        clearInterval(timer);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [phase, selectedPlatforms]);

  // --- Ingest URL ---
  const handleIngest = useCallback(async () => {
    if (!url.trim() || !anonId) return;
    setPhase("ingesting");
    setErrorMsg("");
    setContent(null);
    setCopies([]);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-anon-id": anonId },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setPhase("idle");
        setErrorMsg(data.error);
        return;
      }
      setContent(data.content);
      setPhase("ingested");
    } catch (err) {
      setPhase("idle");
      setErrorMsg((err as Error).message);
    }
  }, [url, anonId]);

  // --- Upload file ---
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!anonId) return;
      setPhase("ingesting");
      setProgressMsg("[文件]");
      setErrorMsg("");
      setContent(null);
      setCopies([]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "x-anon-id": anonId },
          body: formData,
        });
        const data = await res.json();
        if (!data.success) {
          setPhase("idle");
          setErrorMsg(data.error);
          return;
        }
        setContent(data.content);
        setPhase("ingested");
      } catch (err) {
        setPhase("idle");
        setErrorMsg((err as Error).message);
      }
    },
    [anonId]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  // --- Generate (SSE streaming) ---
  const handleGenerate = useCallback(async () => {
    if (!content || !anonId || selectedPlatforms.size === 0) return;

    let providerConfig: {
      type: string;
      apiKey: string;
      model: string;
      baseURL?: string;
    } | null = null;
    try {
      const raw = localStorage.getItem("sm_providers");
      if (raw) {
        const storage = JSON.parse(raw);
        const active = (storage.providers as ProviderEntry[])?.find(
          (p) => p.id === storage.activeId
        );
        if (active?.apiKey) {
          providerConfig = {
            type: active.type,
            apiKey: active.apiKey,
            model: active.model,
            baseURL: active.baseURL,
          };
        }
      }
    } catch {
      // fall through
    }

    if (!providerConfig) {
      setErrorMsg("请先在「偏好设置」中配置 AI 服务商的 API Key");
      return;
    }

    setPhase("generating");
    setErrorMsg("");
    setCopies([]);
    setStreamingMap(new Map());

    const initialMap = new Map<Platform, string>();
    for (const p of Array.from(selectedPlatforms)) {
      initialMap.set(p, "");
    }
    setStreamingMap(initialMap);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anon-id": anonId,
        },
        body: JSON.stringify({
          contentId: content.id,
          sourceText: content.rawText,
          config: { platforms: Array.from(selectedPlatforms) },
          providerConfig,
        }),
      });

      if (!response.body) {
        throw new Error("浏览器不支持流式响应");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const completedResults: GeneratedCopy[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "chunk" && data.platform && data.text) {
              setStreamingMap((prev) => {
                const next = new Map(prev);
                next.set(data.platform, (next.get(data.platform) || "") + data.text);
                return next;
              });
            } else if (data.type === "complete") {
              const completed: GeneratedCopy = {
                platform: data.platform,
                body: data.body,
                tone: data.tone || "",
                alchemySuccessRate: data.alchemySuccessRate || 0,
              };
              completedResults.push(completed);
              setCopies([...completedResults]);
            } else if (data.type === "error") {
              setErrorMsg((prev) =>
                prev ? `${prev}; ${data.message}` : data.message
              );
            }
          } catch {
            // Malformed SSE line — skip
          }
        }
      }

      if (completedResults.length > 0) {
        setVaultItems(
          resultsToVaultItems(completedResults, content?.title ?? undefined)
        );
      }

      setStreamingMap(new Map());
      setPhase("done");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setPhase("ingested");
    }
  }, [content, anonId, selectedPlatforms]);

  // --- Reset ---
  const reset = () => {
    setPhase("idle");
    setUrl("");
    setContent(null);
    setCopies([]);
    setStreamingMap(new Map());
    setSelectedPlatforms(new Set());
    setProgressMsg("");
    setErrorMsg("");
  };

  const canIngest = url.trim().length > 0 && phase === "idle";
  const canGenerate =
    (phase === "ingested" || phase === "generating") &&
    selectedPlatforms.size > 0;
  const showWorkbench = phase === "ingested" || phase === "generating";

  const blurClass =
    inputFocused && phase === "idle"
      ? "blur-[2px] opacity-30 pointer-events-none scale-[0.98]"
      : "";
  const blurTransition = "transition-all duration-500 ease-out";

  return (
    <div className="flex flex-col items-center relative z-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_ENTER, delay: 0.05 }}
        className={`text-center mb-8 ${blurClass} ${blurTransition}`}
      >
        <h1 className="text-[32px] md:text-[40px] font-bold tracking-tight text-gradient-shimmer animate-gradient-text">
          SocialMagic
        </h1>
        <p className="mt-2 text-[15px] text-gray-500">
          投入素材，炼出黄金文案
        </p>
      </motion.div>

      {/* Spotlight input + file upload */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_ENTER, delay: 0.15 }}
        className="w-full max-w-[600px] relative z-10"
      >
        <div
          className="
            relative flex items-center gap-4 px-6 py-4
            rounded-2xl backdrop-blur-xl
            bg-white/[0.04] border border-white/[0.08]
            shadow-[0_8px_40px_rgba(0,0,0,0.3)]
            transition-all duration-300
            focus-within:border-violet-500/40
            focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.12),0_8px_40px_rgba(0,0,0,0.4),0_0_40px_rgba(139,92,246,0.08)]
          "
        >
          <Search className="w-5 h-5 text-gray-600 shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={(e) =>
              e.key === "Enter" && canIngest && handleIngest()
            }
            placeholder="粘贴文章/YouTube/Bilibili链接，开始炼金..."
            disabled={phase !== "idle"}
            className="flex-1 bg-transparent outline-none text-[15px] text-white placeholder:text-gray-600 disabled:opacity-40"
          />

          {/* File upload button */}
          {phase === "idle" && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:text-violet-400 hover:bg-violet-500/10 transition-colors duration-200"
              aria-label="上传文件"
              title="上传 PDF/Word 文件"
            >
              <Paperclip className="w-[18px] h-[18px]" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={onFileChange}
            className="hidden"
          />

          {phase === "idle" && (
            <motion.button
              onClick={handleIngest}
              disabled={!canIngest}
              whileTap={canIngest ? { scale: 0.95 } : {}}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-[13px] font-semibold hover:from-violet-500 hover:to-cyan-400 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_4px_16px_rgba(139,92,246,0.3)]"
            >
              开始炼金
            </motion.button>
          )}
          {(phase === "ingesting" || phase === "generating") && (
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin shrink-0" />
          )}
        </div>
      </motion.div>

      {/* Progress ritual */}
      <AnimatePresence mode="wait">
        {(phase === "ingesting" || phase === "generating") &&
          progressMsg &&
          !progressMsg.startsWith("[") && (
            <motion.div
              key={progressMsg}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ ...SPRING_ENTER, duration: 0.4 }}
              className="mt-4 flex items-center gap-2 text-[13px] text-violet-400"
            >
              <span className="animate-pulse-glow">{progressMsg}</span>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Ingest success → Platform selector + Generate */}
      <AnimatePresence>
        {showWorkbench && content && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING_ENTER}
            className="w-full max-w-[600px] mt-8"
          >
            {/* Success badge */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={SPRING_ENTER}
              className="flex items-center gap-2 text-[13px] text-emerald-400 mb-8"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                素材入库成功 — {content.wordCount} 字
                {content.title ? ` · ${content.title}` : ""}
              </span>
            </motion.div>

            {/* Platform selector */}
            <div className="mb-8">
              <p className="text-[11px] text-gray-600 uppercase tracking-wider font-medium mb-4">
                选择目标平台
              </p>
              <div className="flex gap-3">
                {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
                  const meta = PLATFORM_META[p];
                  const selected = selectedPlatforms.has(p);
                  return (
                    <motion.button
                      key={p}
                      onClick={() => {
                        setSelectedPlatforms((prev) => {
                          const next = new Set(prev);
                          next.has(p) ? next.delete(p) : next.add(p);
                          return next;
                        });
                      }}
                      whileTap={{ scale: 0.95 }}
                      animate={{
                        scale: selected ? 1.05 : 1,
                      }}
                      transition={SPRING_TAP}
                      className={`
                        flex flex-col items-center gap-2 px-5 py-4 rounded-2xl
                        border backdrop-blur-xl transition-all duration-300
                        ${
                          selected
                            ? `${meta.bgActive} ${meta.ringActive} ring-1 shadow-lg ${meta.glowColor}`
                            : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.14]"
                        }
                      `}
                    >
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                          selected ? meta.color : "text-gray-600"
                        }`}
                      >
                        <PlatformIcon platform={p} size={28} />
                      </span>
                      <span
                        className={`text-[12px] font-medium transition-colors duration-200 ${
                          selected ? "text-white/90" : "text-gray-600"
                        }`}
                      >
                        {meta.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Generate button */}
            <motion.button
              onClick={handleGenerate}
              disabled={!canGenerate}
              whileTap={canGenerate ? { scale: 0.97 } : {}}
              className={`
                w-full py-4 rounded-2xl text-[15px] font-semibold transition-all duration-300
                ${
                  canGenerate
                    ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[0_4px_30px_rgba(139,92,246,0.4)] hover:shadow-[0_8px_40px_rgba(139,92,246,0.5)]"
                    : "bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/[0.06]"
                }
              `}
            >
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                炼出文案 ({selectedPlatforms.size} 个平台)
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={SPRING_ENTER}
            className={`w-full max-w-[600px] mt-4 flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 backdrop-blur-xl border border-red-500/20 text-[13px] text-red-400 ${blurClass} ${blurTransition}`}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streaming cards */}
      <AnimatePresence>
        {phase === "generating" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`w-full max-w-[600px] mt-8 space-y-4 ${blurClass} ${blurTransition}`}
          >
            <p className="text-[11px] text-gray-600 uppercase tracking-wider font-medium">
              炼金进行中
            </p>

            {Array.from(selectedPlatforms).map((platform, i) => {
              const completedCopy = copies.find(
                (c) => c.platform === platform
              );
              const streamingText = streamingMap.get(platform) || "";

              if (completedCopy) {
                return (
                  <SocialPostCard
                    key={platform}
                    platform={completedCopy.platform}
                    body={completedCopy.body}
                    tone={completedCopy.tone}
                    alchemySuccessRate={completedCopy.alchemySuccessRate}
                    index={i}
                  />
                );
              }

              return (
                <SocialPostCard
                  key={platform}
                  platform={platform}
                  body={streamingText}
                  tone=""
                  alchemySuccessRate={0}
                  index={i}
                  streaming={true}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final results */}
      <AnimatePresence>
        {phase === "done" && copies.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-[600px] mt-8 space-y-4"
          >
            <p className="text-[11px] text-gray-600 uppercase tracking-wider font-medium">
              炼金结果
            </p>

            {copies.map((copy, i) => (
              <SocialPostCard
                key={copy.platform}
                platform={copy.platform}
                body={copy.body}
                tone={copy.tone}
                alchemySuccessRate={copy.alchemySuccessRate}
                index={i}
              />
            ))}

            {/* Reset */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: copies.length * 0.1 + 0.15 }}
              onClick={reset}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-[13px] text-gray-600 hover:text-gray-400 hover:border-white/[0.14] hover:bg-white/[0.04] transition-all duration-200"
            >
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                开始新的炼金
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vault */}
      <div className={`w-full max-w-[600px] ${blurClass} ${blurTransition}`}>
        <VaultGrid
          newItems={vaultItems.length > 0 ? vaultItems : undefined}
        />
      </div>
    </div>
  );
}

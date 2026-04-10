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
} from "lucide-react";
import { useIdentity } from "@/providers/identity-provider";
import SocialPostCard from "@/components/SocialPostCard";
import VaultGrid, { resultsToVaultItems } from "@/components/VaultGrid";
import type { Platform, Content, ProviderEntry } from "@/types/index";

// =============================================================================
// Platform meta
// =============================================================================

const PLATFORM_META: Record<
  Platform,
  {
    label: string;
    glyph: string;
    color: string;
    bgActive: string;
    ringActive: string;
  }
> = {
  xiaohongshu: {
    label: "小红书",
    glyph: "红",
    color: "text-red-500",
    bgActive: "bg-red-50",
    ringActive: "ring-red-200",
  },
  wechat: {
    label: "微信",
    glyph: "微",
    color: "text-green-600",
    bgActive: "bg-green-50",
    ringActive: "ring-green-200",
  },
  douyin: {
    label: "抖音",
    glyph: "抖",
    color: "text-gray-900",
    bgActive: "bg-gray-50",
    ringActive: "ring-gray-300",
  },
  weibo: {
    label: "微博",
    glyph: "博",
    color: "text-orange-500",
    bgActive: "bg-orange-50",
    ringActive: "ring-orange-200",
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
// Main component
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

    // Read active provider
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

    // Initialize streaming map
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

      // Push to vault
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

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_ENTER, delay: 0.05 }}
        className="text-center mb-8"
      >
        <h1 className="text-[32px] md:text-[40px] font-bold tracking-tight text-gray-900">
          SocialMagic
        </h1>
        <p className="mt-2 text-[15px] text-gray-400">
          投入素材，炼出黄金文案
        </p>
      </motion.div>

      {/* Spotlight input + file upload */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_ENTER, delay: 0.15 }}
        className="w-full max-w-[600px]"
      >
        <div
          className="
            relative flex items-center gap-4 px-6 py-4
            rounded-2xl bg-white/10 backdrop-blur-xl
            border border-white/30
            shadow-[0_8px_40px_rgba(0,0,0,0.08)]
            transition-all duration-300
            focus-within:border-[#0071E3]/30
            focus-within:shadow-[0_0_0_4px_rgba(0,113,227,0.12),0_8px_40px_rgba(0,0,0,0.12)]
          "
        >
          <Search className="w-5 h-5 text-gray-300 shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && canIngest && handleIngest()
            }
            placeholder="粘贴文章/YouTube/Bilibili链接，开始炼金..."
            disabled={phase !== "idle"}
            className="flex-1 bg-transparent outline-none text-[15px] text-gray-800 placeholder:text-gray-300 disabled:opacity-40"
          />

          {/* File upload button */}
          {phase === "idle" && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 hover:text-[#0071E3] hover:bg-[#0071E3]/5 transition-colors duration-200"
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
              className="px-6 py-2 rounded-xl bg-[#0071E3] text-white text-[13px] font-semibold hover:bg-[#0077ED] disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-200"
            >
              开始炼金
            </motion.button>
          )}
          {(phase === "ingesting" || phase === "generating") && (
            <Loader2 className="w-5 h-5 text-[#0071E3] animate-spin shrink-0" />
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
              className="mt-4 flex items-center gap-2 text-[13px] text-[#0071E3]"
            >
              <span>{progressMsg}</span>
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
              className="flex items-center gap-2 text-[13px] text-emerald-600 mb-8"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                素材入库成功 — {content.wordCount} 字
                {content.title ? ` · ${content.title}` : ""}
              </span>
            </motion.div>

            {/* Platform selector */}
            <div className="mb-8">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-4">
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
                        border transition-colors duration-200
                        ${
                          selected
                            ? `${meta.bgActive} ${meta.ringActive} ring-1 shadow-sm`
                            : "bg-white/10 border-white/20 hover:bg-white/20"
                        }
                      `}
                    >
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-colors duration-200 ${
                          selected ? meta.color : "text-gray-300"
                        }`}
                      >
                        {meta.glyph}
                      </span>
                      <span
                        className={`text-[12px] font-medium transition-colors duration-200 ${
                          selected ? "text-gray-800" : "text-gray-400"
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
                    ? "bg-[#0071E3] text-white shadow-[0_4px_16px_rgba(0,113,227,0.25)] hover:shadow-[0_8px_24px_rgba(0,113,227,0.35)]"
                    : "bg-gray-200/50 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              炼出文案 ({selectedPlatforms.size} 个平台)
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
            className="w-full max-w-[600px] mt-4 flex items-start gap-3 p-4 rounded-2xl bg-red-50/80 backdrop-blur-xl border border-red-100 text-[13px] text-red-600"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streaming cards — during generation */}
      <AnimatePresence>
        {phase === "generating" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-[600px] mt-8 space-y-4"
          >
            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
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
            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
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
              className="w-full py-3 rounded-2xl border border-gray-200/60 text-[13px] text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors duration-200"
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
      <div className="w-full max-w-[600px]">
        <VaultGrid
          newItems={vaultItems.length > 0 ? vaultItems : undefined}
        />
      </div>
    </div>
  );
}

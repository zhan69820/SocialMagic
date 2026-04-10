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
  Wand2,
  Type,
  ChevronDown,
} from "lucide-react";
import { useIdentity } from "@/providers/identity-provider";
import { useTheme } from "@/providers/theme-provider";
import SocialPostCard from "@/components/SocialPostCard";
import ResultCarousel from "@/components/ResultCarousel";
import VaultGrid, { resultsToVaultItems } from "@/components/VaultGrid";
import PlatformIcon from "@/components/PlatformIcon";
import type { Platform, Content, ProviderEntry } from "@/types/index";
import { TONE_PRESETS } from "@/lib/constants/platform-theme";

// =============================================================================
// Platform meta — theme-aware
// =============================================================================

const PLATFORM_META: Record<
  Platform,
  {
    label: string;
    subtitle: string;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    activeGlow: string;
    badgeBg: string;
  }
> = {
  xiaohongshu: {
    label: "小红书",
    subtitle: "种草笔记",
    color: "text-red-400",
    gradientFrom: "from-red-500/25",
    gradientTo: "to-pink-600/10",
    activeGlow: "shadow-red-500/30",
    badgeBg: "bg-red-500/15 text-red-400",
  },
  wechat: {
    label: "微信",
    subtitle: "公众号文章",
    color: "text-green-400",
    gradientFrom: "from-green-500/25",
    gradientTo: "to-emerald-600/10",
    activeGlow: "shadow-green-500/30",
    badgeBg: "bg-green-500/15 text-green-400",
  },
  douyin: {
    label: "抖音",
    subtitle: "爆款短视频",
    color: "text-cyan-400",
    gradientFrom: "from-cyan-500/25",
    gradientTo: "to-blue-600/10",
    activeGlow: "shadow-cyan-500/30",
    badgeBg: "bg-cyan-500/15 text-cyan-400",
  },
  weibo: {
    label: "微博",
    subtitle: "热搜锐评",
    color: "text-orange-400",
    gradientFrom: "from-orange-500/25",
    gradientTo: "to-amber-600/10",
    activeGlow: "shadow-orange-500/30",
    badgeBg: "bg-orange-500/15 text-orange-400",
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
// Main component — Dynamic Dual-Theme Alchemy
// =============================================================================

export default function AlchemyWorkbench() {
  const { anonId } = useIdentity();
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === "dark";

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progressMsg, setProgressMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [content, setContent] = useState<Content | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(new Set());
  const [copies, setCopies] = useState<GeneratedCopy[]>([]);
  const [streamingMap, setStreamingMap] = useState<Map<Platform, string>>(new Map());
  const [vaultItems, setVaultItems] = useState<ReturnType<typeof resultsToVaultItems>>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [toneOverrides, setToneOverrides] = useState<Partial<Record<Platform, string>>>({});

  // --- Animated progress text ---
  useEffect(() => {
    if (phase !== "ingesting" && phase !== "generating") return;
    const steps =
      phase === "ingesting"
        ? progressMsg.startsWith("[文件]") ? UPLOAD_STEPS : INGEST_STEPS
        : buildRitualSteps(Array.from(selectedPlatforms));
    setProgressMsg(steps[0]);
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx < steps.length) setProgressMsg(steps[idx]);
      else clearInterval(timer);
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
      if (!data.success) { setPhase("idle"); setErrorMsg(data.error); return; }
      setContent(data.content);
      setPhase("ingested");
    } catch (err) {
      setPhase("idle");
      setErrorMsg((err as Error).message);
    }
  }, [url, anonId]);

  // --- Direct text input ---
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    const now = new Date().toISOString();
    setContent({
      id: crypto.randomUUID(),
      profileId: anonId || "anonymous",
      sourceType: "text",
      title: textInput.trim().slice(0, 30) + (textInput.length > 30 ? "..." : ""),
      rawUrl: null,
      rawText: textInput.trim(),
      fileName: null,
      fileType: null,
      wordCount: textInput.trim().length,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
    setPhase("ingested");
    setErrorMsg("");
    setCopies([]);
  }, [textInput, anonId]);

  // --- Upload file ---
  const handleFileUpload = useCallback(async (file: File) => {
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
      if (!data.success) { setPhase("idle"); setErrorMsg(data.error); return; }
      setContent(data.content);
      setPhase("ingested");
    } catch (err) {
      setPhase("idle");
      setErrorMsg((err as Error).message);
    }
  }, [anonId]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  // --- Generate (SSE streaming) ---
  const handleGenerate = useCallback(async () => {
    if (!content || !anonId || selectedPlatforms.size === 0) return;
    let providerConfig: { type: string; apiKey: string; model: string; baseURL?: string } | null = null;
    try {
      const raw = localStorage.getItem("sm_providers");
      if (raw) {
        const storage = JSON.parse(raw);
        const active = (storage.providers as ProviderEntry[])?.find((p) => p.id === storage.activeId);
        if (active?.apiKey) {
          providerConfig = { type: active.type, apiKey: active.apiKey, model: active.model, baseURL: active.baseURL };
        }
      }
    } catch { /* fall through */ }
    if (!providerConfig) { setErrorMsg("请先在「偏好设置」中配置 AI 服务商的 API Key"); return; }

    setPhase("generating");
    setErrorMsg("");
    setCopies([]);
    setStreamingMap(new Map());
    const initialMap = new Map<Platform, string>();
    for (const p of Array.from(selectedPlatforms)) initialMap.set(p, "");
    setStreamingMap(initialMap);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-anon-id": anonId },
        body: JSON.stringify({ contentId: content.id, sourceText: content.rawText, config: { platforms: Array.from(selectedPlatforms), toneOverrides }, providerConfig }),
      });
      if (!response.body) throw new Error("浏览器不支持流式响应");
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
              completedResults.push({ platform: data.platform, body: data.body, tone: data.tone || "", alchemySuccessRate: data.alchemySuccessRate || 0 });
              setCopies([...completedResults]);
            } else if (data.type === "error") {
              setErrorMsg((prev) => prev ? `${prev}; ${data.message}` : data.message);
            }
          } catch { /* skip */ }
        }
      }
      if (completedResults.length > 0) {
        setVaultItems(resultsToVaultItems(completedResults, content?.title ?? undefined));
      }
      setStreamingMap(new Map());
      setPhase("done");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setPhase("ingested");
    }
  }, [content, anonId, selectedPlatforms, toneOverrides]);

  // --- Single-platform regenerate ---
  const handleRegenPlatform = useCallback(async (platform: Platform) => {
    if (!content || !anonId) return;
    let providerConfig: { type: string; apiKey: string; model: string; baseURL?: string } | null = null;
    try {
      const raw = localStorage.getItem("sm_providers");
      if (raw) {
        const storage = JSON.parse(raw);
        const active = (storage.providers as ProviderEntry[])?.find((p) => p.id === storage.activeId);
        if (active?.apiKey) {
          providerConfig = { type: active.type, apiKey: active.apiKey, model: active.model, baseURL: active.baseURL };
        }
      }
    } catch { /* fall through */ }
    if (!providerConfig) { setErrorMsg("请先在「偏好设置」中配置 AI 服务商的 API Key"); return; }

    // Remove the old copy for this platform
    setCopies((prev) => prev.filter((c) => c.platform !== platform));
    const regenMap = new Map<Platform, string>();
    regenMap.set(platform, "");
    setStreamingMap(regenMap);

    try {
      const toneForPlatform = toneOverrides[platform] ? { [platform]: toneOverrides[platform] } : {};
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-anon-id": anonId },
        body: JSON.stringify({
          contentId: content.id,
          sourceText: content.rawText,
          config: { platforms: [platform], toneOverrides: toneForPlatform },
          providerConfig,
        }),
      });
      if (!response.body) throw new Error("浏览器不支持流式响应");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let regenResult: GeneratedCopy | null = null;
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
            if (data.type === "chunk" && data.platform === platform && data.text) {
              setStreamingMap((prev) => {
                const next = new Map(prev);
                next.set(platform, (next.get(platform) || "") + data.text);
                return next;
              });
            } else if (data.type === "complete" && data.platform === platform) {
              regenResult = { platform: data.platform, body: data.body, tone: data.tone || "", alchemySuccessRate: data.alchemySuccessRate || 0 };
            } else if (data.type === "error") {
              setErrorMsg(data.message);
            }
          } catch { /* skip */ }
        }
      }
      if (regenResult) {
        setCopies((prev) => [...prev.filter((c) => c.platform !== platform), regenResult!]);
        setVaultItems((prev) => [...resultsToVaultItems([regenResult!], content?.title ?? undefined), ...prev]);
      }
      setStreamingMap(new Map());
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStreamingMap(new Map());
    }
  }, [content, anonId, toneOverrides]);

  const reset = () => {
    setPhase("idle"); setUrl(""); setContent(null); setCopies([]);
    setStreamingMap(new Map()); setSelectedPlatforms(new Set()); setProgressMsg(""); setErrorMsg("");
    setTextInput(""); setShowTextInput(false); setToneOverrides({});
  };

  const canIngest = url.trim().length > 0 && phase === "idle";
  const canGenerate = (phase === "ingested" || phase === "generating") && selectedPlatforms.size > 0;
  const showWorkbench = phase === "ingested" || phase === "generating";

  const blurClass = inputFocused && phase === "idle"
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
        <h1 className="text-[32px] md:text-[44px] font-bold tracking-tight text-gradient-shimmer animate-gradient-text">
          SocialMagic
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: "var(--text-tertiary)" }}>
          投入素材，炼出黄金文案
        </p>
      </motion.div>

      {/* Spotlight input — animated gradient border */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_ENTER, delay: 0.15 }}
        className="w-full max-w-[720px] relative z-10"
      >
        {/* Rotating gradient border */}
        <div className="gradient-border animate-aurora">
          <div
            className="relative flex items-center gap-4 px-6 py-4 rounded-2xl backdrop-blur-xl transition-all duration-300"
            style={{
              background: inputFocused
                ? isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)"
                : "var(--bg-input)",
              boxShadow: inputFocused
                ? "0 0 0 4px rgba(139,92,246,0.12), 0 8px 40px rgba(0,0,0,0.3), 0 0 40px rgba(139,92,246,0.08)"
                : "var(--shadow-input)",
            }}
          >
            <Search className="w-5 h-5 shrink-0" style={{ color: "var(--text-quaternary)" }} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => e.key === "Enter" && canIngest && handleIngest()}
              placeholder="粘贴文章/YouTube/Bilibili链接，开始炼金..."
              disabled={phase !== "idle"}
              className="flex-1 bg-transparent outline-none text-[15px] placeholder:opacity-50 disabled:opacity-40"
              style={{ color: "var(--text-primary)" }}
            />

            {phase === "idle" && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors duration-200 hover:bg-violet-500/10"
                style={{ color: "var(--text-quaternary)" }}
                aria-label="上传文件"
                title="上传 PDF/Word 文件"
              >
                <Paperclip className="w-[18px] h-[18px]" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={onFileChange} className="hidden" />

            {phase === "idle" && (
              <motion.button
                onClick={handleIngest}
                disabled={!canIngest}
                whileTap={canIngest ? { scale: 0.95 } : {}}
                whileHover={canIngest ? { scale: 1.02 } : {}}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-[13px] font-semibold disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
              >
                开始炼金
              </motion.button>
            )}
            {(phase === "ingesting" || phase === "generating") && (
              <div className="relative">
                <Loader2 className="w-5 h-5 text-violet-400 animate-spin shrink-0" />
                {/* Spinning glow ring around loader */}
                <div className="absolute inset-0 w-5 h-5 rounded-full animate-spin-slow opacity-30"
                  style={{ background: "conic-gradient(from 0deg, transparent, rgba(139,92,246,0.3), transparent)" }} />
              </div>
            )}
          </div>
        </div>

        {/* Text input toggle */}
        {phase === "idle" && (
          <motion.button
            onClick={() => setShowTextInput((v) => !v)}
            className="mt-3 mx-auto flex items-center gap-1.5 text-[12px] transition-colors duration-200 hover:text-violet-400"
            style={{ color: "var(--text-quaternary)" }}
          >
            <Type className="w-3.5 h-3.5" />
            直接输入文本
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showTextInput ? "rotate-180" : ""}`} />
          </motion.button>
        )}

        {/* Collapsible text input */}
        <AnimatePresence>
          {showTextInput && phase === "idle" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 w-full max-w-[720px] mx-auto">
                <div className="gradient-border">
                  <div
                    className="rounded-2xl backdrop-blur-xl border overflow-hidden"
                    style={{ background: "var(--bg-input)", borderColor: "var(--bg-card-border)" }}
                  >
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="在这里粘贴或输入文案素材内容..."
                      rows={6}
                      className="w-full bg-transparent px-5 py-4 text-[14px] outline-none resize-none placeholder:opacity-40 leading-relaxed"
                      style={{ color: "var(--text-primary)" }}
                    />
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: "1px solid var(--bg-card-border)" }}>
                      <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>
                        {textInput.length} 字
                      </span>
                      <motion.button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim()}
                        whileTap={textInput.trim() ? { scale: 0.95 } : {}}
                        className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-[12px] font-semibold disabled:opacity-25 disabled:cursor-not-allowed transition-opacity shadow-[0_2px_12px_rgba(139,92,246,0.25)]"
                      >
                        投入炼金炉
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Progress ritual */}
      <AnimatePresence mode="wait">
        {(phase === "ingesting" || phase === "generating") && progressMsg && !progressMsg.startsWith("[") && (
          <motion.div
            key={progressMsg}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ ...SPRING_ENTER, duration: 0.4 }}
            className="mt-4 flex items-center gap-2 text-[13px] text-violet-400"
          >
            <Wand2 className="w-3.5 h-3.5 animate-pulse-glow" />
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
            className="w-full max-w-[720px] mt-8"
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

            {/* Platform selector — rich cards */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--text-quaternary)" }}>
                  选择目标平台
                </p>
                <button
                  onClick={() => {
                    const allPlatforms = Object.keys(PLATFORM_META) as Platform[];
                    const allSelected = allPlatforms.every((p) => selectedPlatforms.has(p));
                    setSelectedPlatforms(allSelected ? new Set() : new Set(allPlatforms));
                  }}
                  className="text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors duration-200"
                >
                  {selectedPlatforms.size === (Object.keys(PLATFORM_META) as Platform[]).length ? "取消全选" : "全选"}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(PLATFORM_META) as Platform[]).map((p, idx) => {
                  const meta = PLATFORM_META[p];
                  const selected = selectedPlatforms.has(p);
                  const presets = TONE_PRESETS[p];
                  const activeTone = toneOverrides[p];
                  return (
                    <div key={p} className="flex flex-col gap-2">
                      <motion.button
                        onClick={() => {
                          setSelectedPlatforms((prev) => {
                            const next = new Set(prev);
                            next.has(p) ? next.delete(p) : next.add(p);
                            return next;
                          });
                        }}
                        whileTap={{ scale: 0.93 }}
                        whileHover={{ y: -3 }}
                        animate={{
                          scale: selected ? 1.03 : 1,
                          boxShadow: selected
                            ? `0 8px 30px rgba(0,0,0,0.2), 0 0 20px rgba(139,92,246,0.15)`
                            : "0 2px 12px rgba(0,0,0,0.1)",
                        }}
                        transition={{ ...SPRING_TAP, delay: idx * 0.03 }}
                        className={`
                          relative flex flex-col items-center gap-2.5 px-4 py-5 rounded-2xl
                          border backdrop-blur-xl transition-colors duration-300 overflow-hidden
                          ${selected
                            ? `bg-gradient-to-br ${meta.gradientFrom} ${meta.gradientTo} border-violet-500/20`
                            : ""
                          }
                        `}
                        style={!selected ? { background: "var(--bg-card)", borderColor: "var(--bg-card-border)" } : undefined}
                      >
                        {selected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center"
                          >
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                          </motion.div>
                        )}

                        <motion.div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${selected ? meta.badgeBg : "bg-white/[0.04]"}`}
                          animate={selected ? { rotate: [0, -5, 5, 0] } : {}}
                          transition={{ duration: 0.4 }}
                        >
                          <PlatformIcon platform={p} size={26} />
                        </motion.div>
                        <span className={`text-[13px] font-semibold transition-colors duration-200 ${selected ? (isDark ? "text-white/90" : "text-gray-800") : "text-gray-500"}`}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] transition-colors duration-200" style={{ color: "var(--text-quaternary)" }}>
                          {meta.subtitle}
                        </span>
                      </motion.button>

                      {/* Tone presets */}
                      <AnimatePresence>
                        {selected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-wrap gap-1 overflow-hidden"
                          >
                            {presets.map((preset) => (
                              <button
                                key={preset.value}
                                onClick={() =>
                                  setToneOverrides((prev) => ({
                                    ...prev,
                                    [p]: activeTone === preset.value ? undefined : preset.value,
                                  }))
                                }
                                className={`
                                  px-2 py-0.5 rounded-md text-[10px] font-medium transition-all duration-200
                                  ${activeTone === preset.value
                                    ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30"
                                    : "bg-white/[0.04] text-gray-500 hover:text-gray-300 hover:bg-white/[0.08]"
                                  }
                                `}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generate button */}
            <motion.button
              onClick={handleGenerate}
              disabled={!canGenerate}
              whileTap={canGenerate ? { scale: 0.97 } : {}}
              whileHover={canGenerate ? { scale: 1.01 } : {}}
              className={`
                w-full py-4 rounded-2xl text-[15px] font-semibold transition-all duration-300
                ${canGenerate
                  ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[0_4px_30px_rgba(139,92,246,0.4)] hover:shadow-[0_8px_40px_rgba(139,92,246,0.5)]"
                  : "cursor-not-allowed border"
                }
              `}
              style={!canGenerate ? { background: "var(--bg-button-disabled)", borderColor: "var(--bg-card-border)", color: "var(--text-quaternary)" } : undefined}
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
            className={`w-full max-w-[720px] mt-4 flex items-start gap-3 p-4 rounded-2xl backdrop-blur-xl text-[13px] bg-red-500/10 border border-red-500/20 text-red-400 ${blurClass} ${blurTransition}`}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streaming / Results carousel */}
      <AnimatePresence>
        {phase === "generating" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`w-full max-w-[720px] mt-8 ${blurClass} ${blurTransition}`}
          >
            <ResultCarousel
              items={Array.from(selectedPlatforms).map((p) => ({
                platform: p,
                body: copies.find((c) => c.platform === p)?.body || "",
                tone: copies.find((c) => c.platform === p)?.tone || "",
                alchemySuccessRate: copies.find((c) => c.platform === p)?.alchemySuccessRate || 0,
              }))}
              streamingMap={streamingMap}
              isStreaming={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "done" && copies.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-[720px] mt-8"
          >
            <ResultCarousel
              items={copies}
              onReset={reset}
              onRegenPlatform={handleRegenPlatform}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vault */}
      <div className={`w-full max-w-[720px] ${blurClass} ${blurTransition}`}>
        <VaultGrid newItems={vaultItems.length > 0 ? vaultItems : undefined} />
      </div>
    </div>
  );
}

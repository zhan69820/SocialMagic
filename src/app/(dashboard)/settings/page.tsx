"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  Shield,
  Plus,
  Trash2,
} from "lucide-react";
import { useIdentity } from "@/providers/identity-provider";
import type { ProviderEntry } from "@/types/index";

// =============================================================================
// Storage constants & helpers
// =============================================================================

const STORAGE_KEY = "sm_providers";

const BUILTIN_DEFAULTS: ProviderEntry[] = [
  {
    id: "builtin-openai",
    type: "openai",
    name: "OpenAI",
    apiKey: "",
    model: "gpt-4o",
  },
  {
    id: "builtin-anthropic",
    type: "anthropic",
    name: "Anthropic",
    apiKey: "",
    model: "claude-sonnet-4-6",
  },
  {
    id: "builtin-google",
    type: "google",
    name: "Google",
    apiKey: "",
    model: "gemini-2.0-flash",
  },
];

const PROVIDER_GLYPHS: Record<string, string> = {
  openai: "O",
  anthropic: "A",
  google: "G",
  custom: "C",
};

interface ProvidersStorage {
  providers: ProviderEntry[];
  activeId: string;
}

function loadProviders(): ProvidersStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProvidersStorage;
      const existingIds = new Set(parsed.providers.map((p) => p.id));
      const merged = [
        ...BUILTIN_DEFAULTS.filter((b) => !existingIds.has(b.id)),
        ...parsed.providers,
      ];
      return {
        providers: merged,
        activeId: parsed.activeId || merged[0]?.id || "",
      };
    }
  } catch {
    /* fall through */
  }

  try {
    const oldKeys = JSON.parse(
      localStorage.getItem("sm_api_keys") ?? "{}"
    ) as Record<string, string>;
    const providers = BUILTIN_DEFAULTS.map((b) => ({
      ...b,
      apiKey: oldKeys[b.type] ?? "",
    }));
    const activeId =
      providers.find((p) => p.apiKey)?.id || providers[0].id;
    return { providers, activeId };
  } catch {
    /* fall through */
  }

  return {
    providers: [...BUILTIN_DEFAULTS],
    activeId: BUILTIN_DEFAULTS[0].id,
  };
}

// =============================================================================
// Settings page — Dark Glass Edition
// =============================================================================

export default function SettingsPage() {
  const { anonId } = useIdentity();
  const [providers, setProviders] = useState<ProviderEntry[]>([
    ...BUILTIN_DEFAULTS,
  ]);
  const [activeId, setActiveId] = useState(BUILTIN_DEFAULTS[0].id);
  const [saved, setSaved] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loaded = loadProviders();
    setProviders(loaded.providers);
    setActiveId(loaded.activeId);
    setLastSnapshot(JSON.stringify(loaded));
  }, []);

  const hasChanges = () =>
    JSON.stringify({ providers, activeId }) !== lastSnapshot;

  const updateProvider = (
    id: string,
    field: keyof ProviderEntry,
    value: string
  ) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const toggleKeyVisible = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addCustom = () => {
    const entry: ProviderEntry = {
      id: `custom-${crypto.randomUUID()}`,
      type: "custom",
      name: "",
      apiKey: "",
      model: "",
      baseURL: "",
    };
    setProviders((prev) => [...prev, entry]);
  };

  const removeProvider = (id: string) => {
    const remaining = providers.filter((p) => p.id !== id);
    setProviders(remaining);
    if (activeId === id) {
      setActiveId(
        remaining.find((p) => p.apiKey)?.id || remaining[0]?.id || ""
      );
    }
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSave = async () => {
    const storage: ProvidersStorage = { providers, activeId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));

    if (anonId) {
      try {
        await fetch("/api/profiles/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anon_id: anonId, api_keys: storage }),
        });
      } catch {
        // offline — local save is sufficient
      }
    }

    setLastSnapshot(JSON.stringify(storage));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-5 h-5 text-violet-400" />
          <h1 className="text-[24px] font-bold tracking-tight text-gradient">
            偏好设置
          </h1>
        </div>
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 22,
          delay: 0.05,
        }}
        className="rounded-2xl backdrop-blur-xl border overflow-hidden glass-card"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "var(--bg-card-border)" }}>
          <Shield className="w-4 h-4 text-violet-400" />
          <h2 className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
            AI 服务商配置
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {providers.map((provider) => {
            const isActive = activeId === provider.id;
            const isCustom = provider.type === "custom";
            const isVisible = visibleKeys.has(provider.id);
            const glyph = PROVIDER_GLYPHS[provider.type] ?? "?";

            return (
              <div
                key={provider.id}
                className={`
                  rounded-xl border backdrop-blur-xl transition-all duration-200
                  ${
                    isActive
                      ? "border-violet-500/30 bg-violet-500/[0.06] ring-1 ring-violet-500/10"
                      : "hover:bg-white/[0.04]"
                  }
                `}
              >
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Radio */}
                  <button
                    onClick={() => setActiveId(provider.id)}
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200
                      ${isActive ? "border-violet-400" : "border-gray-400 hover:border-gray-500"}
                    `}
                    aria-label={`设为默认: ${provider.name || "自定义服务商"}`}
                  >
                    {isActive && (
                      <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400" />
                    )}
                  </button>

                  {/* Glyph */}
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive
                        ? "bg-violet-500/20 text-violet-400"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {glyph}
                  </span>

                  {/* Name */}
                  {isCustom ? (
                    <input
                      type="text"
                      value={provider.name}
                      onChange={(e) =>
                        updateProvider(provider.id, "name", e.target.value)
                      }
                      placeholder="服务商名称"
                      className="flex-1 bg-transparent outline-none text-[13px] font-medium placeholder:text-gray-400 min-w-0"
                      style={{ color: "var(--text-primary)" }}
                    />
                  ) : (
                    <span className="flex-1 text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {provider.name}
                    </span>
                  )}

                  {isActive && (
                    <span className="text-[10px] font-medium text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-md shrink-0">
                      默认
                    </span>
                  )}

                  {isCustom && (
                    <button
                      onClick={() => removeProvider(provider.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 shrink-0"
                      aria-label="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Fields */}
                <div className="px-4 pb-3 space-y-2">
                  {isCustom && (
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-gray-600 w-16 shrink-0">
                        Base URL
                      </label>
                      <input
                        type="url"
                        value={provider.baseURL ?? ""}
                        onChange={(e) =>
                          updateProvider(provider.id, "baseURL", e.target.value)
                        }
                        placeholder="https://api.deepseek.com/v1"
                        className="flex-1 px-3 py-2 rounded-lg border text-[13px] placeholder:text-gray-400 outline-none focus:border-violet-500/40 transition-colors duration-200 min-w-0"
                        style={{ background: "var(--bg-field)", borderColor: "var(--bg-field-border)", color: "var(--text-primary)" }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-gray-600 w-16 shrink-0">
                      API Key
                    </label>
                    <input
                      type={isVisible ? "text" : "password"}
                      value={provider.apiKey}
                      onChange={(e) =>
                        updateProvider(provider.id, "apiKey", e.target.value)
                      }
                      placeholder={
                        provider.type === "openai"
                          ? "sk-..."
                          : provider.type === "anthropic"
                            ? "sk-ant-..."
                            : provider.type === "google"
                              ? "AIza..."
                              : "API Key"
                      }
                      className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/90 placeholder:text-gray-700 outline-none focus:border-violet-500/40 transition-colors duration-200 min-w-0"
                    />
                    <button
                      onClick={() => toggleKeyVisible(provider.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border text-gray-500 hover:text-gray-400 transition-colors duration-200 shrink-0"
                      style={{ background: "var(--bg-field)", borderColor: "var(--bg-field-border)" }}
                      aria-label={isVisible ? "隐藏密钥" : "显示密钥"}
                    >
                      {isVisible ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-gray-600 w-16 shrink-0">
                      模型
                    </label>
                    <input
                      type="text"
                      value={provider.model}
                      onChange={(e) =>
                        updateProvider(provider.id, "model", e.target.value)
                      }
                      placeholder="e.g. gpt-4o-mini"
                      className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/90 placeholder:text-gray-700 outline-none focus:border-violet-500/40 transition-colors duration-200 min-w-0"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add custom provider */}
          <button
            onClick={addCustom}
            className="w-full py-3 rounded-xl border border-dashed text-[13px] text-gray-500 hover:text-violet-400 hover:border-violet-500/30 hover:bg-violet-500/[0.04] transition-all duration-200 flex items-center justify-center gap-2"
            style={{ borderColor: "var(--bg-card-border)" }}
          >
            <Plus className="w-4 h-4" />
            添加自定义服务商
          </button>

          {/* Privacy note */}
          <p className="text-[11px] leading-relaxed pt-2" style={{ color: "var(--text-tertiary)" }}>
            密钥保存在浏览器本地存储中，并同步至云端备份。
            每次生成文案时，密钥通过加密连接直接发送至对应的 AI 服务商。
          </p>

          {/* Save button */}
          <motion.button
            onClick={handleSave}
            disabled={!hasChanges() && !saved}
            whileTap={hasChanges() ? { scale: 0.97 } : {}}
            className={`
              w-full py-3 rounded-xl text-[14px] font-semibold transition-all duration-300 flex items-center justify-center gap-2
              ${
                saved
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : hasChanges()
                    ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_8px_30px_rgba(139,92,246,0.4)]"
                    : "cursor-not-allowed border"
              }
            `}
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                已保存
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存全部配置
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

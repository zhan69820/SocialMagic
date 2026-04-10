"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  Trash2,
  Loader2,
  AlertCircle,
  CloudOff,
} from "lucide-react";
import SocialPostCard from "@/components/SocialPostCard";
import { useIdentity } from "@/providers/identity-provider";
import type { Platform } from "@/types/index";

// =============================================================================
// Types
// =============================================================================

interface VaultItem {
  id: string;
  platform: Platform;
  body: string;
  tone: string;
  alchemySuccessRate: number;
  createdAt: string;
  sourceTitle?: string;
}

interface BackendPost {
  id: string;
  platform: Platform;
  body: string;
  tone: string;
  model: string;
  version: number;
  char_count: number;
  created_at: string;
}

interface DisplayItem {
  id: string;
  platform: Platform;
  body: string;
  tone: string;
  alchemySuccessRate: number;
  createdAt: string;
  sourceTitle?: string;
  source: "local" | "remote" | "both";
}

// =============================================================================
// localStorage helpers
// =============================================================================

const VAULT_KEY = "sm_vault";

function loadLocalVault(): VaultItem[] {
  try {
    return JSON.parse(localStorage.getItem(VAULT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveLocalVault(items: VaultItem[]) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(items));
}

// =============================================================================
// Vault page — Dark Glass Edition
// =============================================================================

export default function VaultPage() {
  const { anonId, ready } = useIdentity();
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAndMerge = useCallback(async () => {
    setLoading(true);
    setError("");

    const localItems = loadLocalVault();

    let remotePosts: BackendPost[] = [];
    if (anonId) {
      try {
        const res = await fetch("/api/posts", {
          headers: { "x-anon-id": anonId },
        });
        const data = await res.json();
        if (data.success) {
          remotePosts = data.posts;
        }
      } catch {
        // Offline — continue with local-only data
      }
    }

    const remoteMap = new Map<string, BackendPost>();
    for (const p of remotePosts) {
      remoteMap.set(p.id, p);
    }

    const localMap = new Map<string, VaultItem>();
    for (const item of localItems) {
      localMap.set(item.id, item);
    }

    const allIds = new Set([...remoteMap.keys(), ...localMap.keys()]);
    const merged: DisplayItem[] = [];

    for (const id of allIds) {
      const remote = remoteMap.get(id);
      const local = localMap.get(id);

      if (remote && local) {
        merged.push({
          id,
          platform: remote.platform,
          body: remote.body,
          tone: remote.tone,
          alchemySuccessRate: local.alchemySuccessRate,
          createdAt: remote.created_at,
          sourceTitle: local.sourceTitle,
          source: "both",
        });
      } else if (remote) {
        merged.push({
          id,
          platform: remote.platform,
          body: remote.body,
          tone: remote.tone,
          alchemySuccessRate: 75,
          createdAt: remote.created_at,
          source: "remote",
        });
      } else if (local) {
        merged.push({
          id,
          platform: local.platform,
          body: local.body,
          tone: local.tone,
          alchemySuccessRate: local.alchemySuccessRate,
          createdAt: local.createdAt,
          sourceTitle: local.sourceTitle,
          source: "local",
        });
      }
    }

    merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setItems(merged);
    setLoading(false);
  }, [anonId]);

  useEffect(() => {
    if (ready) {
      loadAndMerge();
    }
  }, [ready, loadAndMerge]);

  const handleDelete = async (id: string) => {
    const item = items.find((i) => i.id === id);

    if (anonId && item && item.source !== "local") {
      try {
        const res = await fetch(`/api/posts/${id}`, {
          method: "DELETE",
          headers: { "x-anon-id": anonId },
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error);
          return;
        }
      } catch {
        // Network error — still allow local cleanup
      }
    }

    const localItems = loadLocalVault().filter((i) => i.id !== id);
    saveLocalVault(localItems);
    setItems((prev) => prev.filter((i) => i.id !== id));
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
          <Archive className="w-5 h-5 text-violet-400" />
          <h1 className="text-[24px] font-bold tracking-tight text-gradient">
            宝库
          </h1>
          <span className="text-[12px] text-gray-600 ml-auto">
            {items.length} 条文案
          </span>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-[13px] text-red-400 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          <span className="ml-3 text-[14px] text-gray-600">
            正在加载宝库...
          </span>
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center py-20 text-gray-700">
          <CloudOff className="w-12 h-12 mb-4" />
          <p className="text-[14px] text-gray-600">宝库空空如也</p>
          <p className="text-[12px] mt-1 text-gray-700">
            开始炼金后，生成的文案会自动保存在这里
          </p>
        </div>
      )}

      {/* Masonry grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {items
                .filter((_, i) => i % 2 === 0)
                .map((item, i) => (
                  <div key={item.id} className="relative group/card">
                    <SocialPostCard
                      platform={item.platform}
                      body={item.body}
                      tone={item.tone}
                      alchemySuccessRate={item.alchemySuccessRate}
                      index={i}
                      layoutId={`vault-page-${item.id}`}
                    />
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg backdrop-blur hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover/card:opacity-100"
                      style={{ background: "var(--bg-delete)", color: "var(--text-quaternary)" }}
                      aria-label="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {item.source === "local" && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] text-amber-400 font-medium backdrop-blur-sm">
                        本地
                      </span>
                    )}
                    {item.source === "remote" && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px] text-blue-400 font-medium backdrop-blur-sm">
                        云端
                      </span>
                    )}
                  </div>
                ))}
            </AnimatePresence>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {items
                .filter((_, i) => i % 2 === 1)
                .map((item, i) => (
                  <div key={item.id} className="relative group/card">
                    <SocialPostCard
                      platform={item.platform}
                      body={item.body}
                      tone={item.tone}
                      alchemySuccessRate={item.alchemySuccessRate}
                      index={i}
                      layoutId={`vault-page-${item.id}`}
                    />
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg backdrop-blur hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover/card:opacity-100"
                      style={{ background: "var(--bg-delete)", color: "var(--text-quaternary)" }}
                      aria-label="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {item.source === "local" && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] text-amber-400 font-medium backdrop-blur-sm">
                        本地
                      </span>
                    )}
                    {item.source === "remote" && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px] text-blue-400 font-medium backdrop-blur-sm">
                        云端
                      </span>
                    )}
                  </div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

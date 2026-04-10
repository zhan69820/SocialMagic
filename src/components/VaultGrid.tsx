"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, Trash2 } from "lucide-react";
import SocialPostCard from "@/components/SocialPostCard";
import { useIdentity } from "@/providers/identity-provider";
import type { Platform } from "@/types/index";

// =============================================================================
// Vault item — stored in localStorage
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

const VAULT_KEY = "sm_vault";

function loadVault(): VaultItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(VAULT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveVault(items: VaultItem[]) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(items));
}

// =============================================================================
// VaultGrid — Dark Glass Edition
// =============================================================================

export interface VaultGridProps {
  newItems?: VaultItem[];
}

export default function VaultGrid({ newItems }: VaultGridProps) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const { anonId, ready } = useIdentity();

  useEffect(() => {
    if (ready) {
      setItems(loadVault());
    }
  }, [ready]);

  useEffect(() => {
    if (!newItems || newItems.length === 0) return;

    setItems((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      const fresh = newItems.filter((i) => !existingIds.has(i.id));
      if (fresh.length === 0) return prev;

      const updated = [...fresh, ...prev];
      saveVault(updated);
      return updated;
    });
  }, [newItems]);

  const handleDelete = async (id: string) => {
    if (anonId) {
      try {
        const res = await fetch(`/api/posts/${id}`, {
          method: "DELETE",
          headers: { "x-anon-id": anonId },
        });
        const data = await res.json();

        if (!data.success) {
          console.error("Delete rejected:", data.error);
          return;
        }
      } catch {
        // Network error — allow offline local delete
      }
    }

    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      saveVault(updated);
      return updated;
    });
  };

  if (items.length === 0) return null;

  return (
    <div className="mt-16">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-6">
        <Archive className="w-4 h-4 text-gray-600" />
        <h2 className="text-[13px] font-medium text-gray-600 uppercase tracking-wider">
          我的宝库
        </h2>
        <span className="text-[11px] text-gray-700 ml-auto">{items.length} 条文案</span>
      </div>

      {/* Masonry grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    layoutId={`vault-${item.id}`}
                  />
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg backdrop-blur hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover/card:opacity-100"
                    style={{ background: "var(--bg-delete)", color: "var(--text-quaternary)" }}
                    aria-label="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </AnimatePresence>
        </div>

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
                    layoutId={`vault-${item.id}`}
                  />
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg backdrop-blur hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover/card:opacity-100"
                    style={{ background: "var(--bg-delete)", color: "var(--text-quaternary)" }}
                    aria-label="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function resultsToVaultItems(
  copies: Array<{ platform: Platform; body: string; tone: string; alchemySuccessRate: number }>,
  sourceTitle?: string
): VaultItem[] {
  return copies.map((c) => ({
    id: crypto.randomUUID(),
    platform: c.platform,
    body: c.body,
    tone: c.tone,
    alchemySuccessRate: c.alchemySuccessRate,
    createdAt: new Date().toISOString(),
    sourceTitle,
  }));
}

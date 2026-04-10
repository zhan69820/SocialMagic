import type { Platform } from "@/types/index";

const VAULT_KEY = "sm_vault";

export interface VaultItem {
  id: string;
  platform: Platform;
  body: string;
  tone: string;
  alchemySuccessRate: number;
  createdAt: string;
  sourceTitle?: string;
}

export function loadVault(): VaultItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(VAULT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveVault(items: VaultItem[]) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(items));
}

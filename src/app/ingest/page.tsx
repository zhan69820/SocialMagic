"use client";

import { useState, useCallback } from "react";
import type { Content } from "@/types/index";

type ScrapeStatus = "idle" | "loading" | "success" | "error";

export default function IngestPage() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ScrapeStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [content, setContent] = useState<Content | null>(null);

  const handleIngest = useCallback(async () => {
    if (!url.trim()) return;

    setStatus("loading");
    setErrorMsg("");
    setContent(null);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anon-id": getOrCreateAnonId(),
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setStatus("error");
        setErrorMsg(data.error);
        return;
      }

      setStatus("success");
      setContent(data.content);
    } catch (err) {
      setStatus("error");
      setErrorMsg((err as Error).message);
    }
  }, [url]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">SocialMagic</h1>
      <p className="text-gray-400 mb-10">输入链接，开始炼金</p>

      {/* Input area */}
      <div className="w-full max-w-xl flex gap-3 mb-6">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleIngest()}
          placeholder="粘贴文章或商品链接..."
          className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
          disabled={status === "loading"}
        />
        <button
          onClick={handleIngest}
          disabled={status === "loading" || !url.trim()}
          className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {status === "loading" ? "炼金中..." : "开始炼金"}
        </button>
      </div>

      {/* Status indicator */}
      {status === "loading" && (
        <div className="flex items-center gap-2 text-violet-400 mb-6">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">正在抓取并解析页面内容...</span>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="w-full max-w-xl rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300 mb-6">
          {errorMsg}
        </div>
      )}

      {/* Result */}
      {status === "success" && content && (
        <div className="w-full max-w-xl rounded-lg border border-gray-700 bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold truncate mr-4">
              {content.title || "无标题"}
            </h2>
            <span className="text-xs text-gray-500 shrink-0">
              {content.wordCount} 字
            </span>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            来源: {content.rawUrl}
          </p>

          <div className="max-h-96 overflow-y-auto rounded bg-gray-950 p-4 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {content.rawText.slice(0, 2000)}
            {content.rawText.length > 2000 && (
              <span className="text-gray-600"> ... (已截断显示)</span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>ID: {content.id.slice(0, 8)}...</span>
            <span>{new Date(content.createdAt).toLocaleString("zh-CN")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get or create a persistent anonymous user ID stored in localStorage.
 */
function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "";

  const KEY = "socialmagic_anon_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

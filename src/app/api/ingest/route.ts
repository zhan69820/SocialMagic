import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { scrapeUrl } from "@/lib/services/scraper.service";
import {
  isYouTubeUrl,
  isBilibiliUrl,
  extractYouTubeVideoId,
  extractBilibiliBvid,
  fetchYouTubeTranscript,
  fetchBilibiliTranscript,
} from "@/lib/scraper/video-transcript";
import { createServerClient } from "@/lib/supabase/client";
import { calculateWordCount } from "@/lib/utils/calculate-word-count";
import { mapRowToContent } from "@/lib/utils/map-row-to-content";
import type { Content, SourceType } from "@/types/index";

// ---------------------------------------------------------------------------
// POST /api/ingest
//
// Enhanced: detects YouTube/Bilibili URLs and fetches video transcripts.
// Falls back to normal web scraping for all other URLs.
// ---------------------------------------------------------------------------

interface IngestRequestBody {
  url: string;
}

interface IngestSuccessResponse {
  success: true;
  content: Content;
}

interface IngestErrorResponse {
  success: false;
  error: string;
}

type IngestResponse = IngestSuccessResponse | IngestErrorResponse;

export async function POST(
  request: NextRequest
): Promise<NextResponse<IngestResponse>> {
  let body: IngestRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "请求体不是有效的 JSON" },
      { status: 400 }
    );
  }

  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { success: false, error: "缺少 url 参数" },
      { status: 400 }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json(
      { success: false, error: "请输入有效的网页链接" },
      { status: 400 }
    );
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json(
      { success: false, error: "仅支持 http(s) 协议的链接" },
      { status: 400 }
    );
  }

  const anonId = request.headers.get("x-anon-id") || uuidv4();

  // --- Smart content extraction: video transcript vs web scraping ---
  let rawText: string;
  let title: string;
  let sourceType: SourceType = "url";
  let metadata: Record<string, unknown> = {};

  if (isYouTubeUrl(url)) {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: "无法解析 YouTube 视频 ID" },
        { status: 400 }
      );
    }

    try {
      const transcript = await fetchYouTubeTranscript(videoId);
      rawText = transcript.text;
      title = transcript.title;
      metadata = { platform: "youtube", videoId };
    } catch (err) {
      return NextResponse.json(
        { success: false, error: `YouTube 字幕获取失败: ${(err as Error).message}` },
        { status: 422 }
      );
    }
  } else if (isBilibiliUrl(url)) {
    const bvid = extractBilibiliBvid(url);
    if (!bvid) {
      return NextResponse.json(
        { success: false, error: "无法解析 Bilibili 视频 ID" },
        { status: 400 }
      );
    }

    try {
      const transcript = await fetchBilibiliTranscript(bvid);
      rawText = transcript.text;
      title = transcript.title;
      metadata = { platform: "bilibili", bvid };
    } catch (err) {
      return NextResponse.json(
        { success: false, error: `Bilibili 字幕获取失败: ${(err as Error).message}` },
        { status: 422 }
      );
    }
  } else {
    // Standard web scraping
    try {
      const result = await scrapeUrl(url);
      rawText = result.scraped.markdown;
      title = result.scraped.title || "";
      metadata = {
        title: result.scraped.title || undefined,
        description: result.scraped.description,
        image_urls: result.scraped.images,
      };
    } catch (err) {
      const message = (err as Error).message;
      const status = message.includes("无法访问") || message.includes("超时") ? 502 : 422;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  }

  const wordCount = calculateWordCount(rawText);

  // --- Persist ---
  let content: Content;

  try {
    const supabase = createServerClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert({ anon_id: anonId }, { onConflict: "anon_id", ignoreDuplicates: true })
      .select("id")
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: "用户身份验证失败" }, { status: 401 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("contents")
      .insert({
        profile_id: profile.id,
        source_type: sourceType,
        title: title || null,
        raw_url: url,
        raw_text: rawText,
        word_count: wordCount,
        metadata,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { success: false, error: `数据库写入失败: ${insertError?.message ?? "unknown"}` },
        { status: 500 }
      );
    }

    content = mapRowToContent(inserted, profile.id);
  } catch {
    const now = new Date().toISOString();
    content = {
      id: uuidv4(),
      profileId: anonId,
      sourceType,
      title: title || null,
      rawUrl: url,
      rawText,
      fileName: null,
      fileType: null,
      wordCount,
      metadata: metadata as Content["metadata"],
      createdAt: now,
      updatedAt: now,
    };
  }

  return NextResponse.json({ success: true, content }, { status: 201 });
}

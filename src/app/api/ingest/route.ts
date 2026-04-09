import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { scrapeUrl } from "@/lib/services/scraper.service";
import type { Content, SourceType } from "@/types/index";

// ---------------------------------------------------------------------------
// POST /api/ingest
//
// Flow:
//   1. Parse { url } from request body
//   2. Resolve the caller's anonymous profile ID (from header or generate)
//   3. Scrape the URL → extract title + Markdown body
//   4. Build a Content record (persisted client-side via localStorage for MVP)
//   5. Return the Content record with its generated ID
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

export async function POST(request: NextRequest): Promise<NextResponse<IngestResponse>> {
  // --- 1. Parse & validate input ---
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

  // --- 2. Resolve anonymous profile ID ---
  const anonId = request.headers.get("x-anon-id") || uuidv4();

  // --- 3. Scrape the URL ---
  let scraped: Awaited<ReturnType<typeof scrapeUrl>>["scraped"];
  try {
    const result = await scrapeUrl(url);
    scraped = result.scraped;
  } catch (err) {
    const message = (err as Error).message;
    const status = message.includes("无法访问") || message.includes("超时")
      ? 502
      : 422;
    return NextResponse.json({ success: false, error: message }, { status });
  }

  // --- 4. Build Content record ---
  const contentId = uuidv4();
  const now = new Date().toISOString();

  const content: Content = {
    id: contentId,
    profileId: anonId,
    sourceType: "url" satisfies SourceType,
    title: scraped.title || null,
    rawUrl: url,
    rawText: scraped.markdown,
    fileName: null,
    fileType: null,
    wordCount: scraped.wordCount,
    metadata: {
      title: scraped.title || undefined,
      description: scraped.description,
      imageUrls: scraped.images,
    },
    createdAt: now,
    updatedAt: now,
  };

  // --- 5. Return ---
  // In MVP stage the content is returned to the client for localStorage persistence.
  // When Supabase is wired in, this will do an INSERT INTO contents ... RETURNING *.
  return NextResponse.json({ success: true, content }, { status: 201 });
}

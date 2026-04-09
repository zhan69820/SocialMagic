import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { scrapeUrl } from "@/lib/services/scraper.service";
import { createServerClient } from "@/lib/supabase/client";
import type { Content, SourceType } from "@/types/index";

// ---------------------------------------------------------------------------
// POST /api/ingest
//
// Flow:
//   1. Parse { url } from request body
//   2. Verify user identity via Supabase getUser (supports anon mode)
//   3. Upsert the profile row (anon_id based)
//   4. Scrape the URL → extract title + Markdown body
//   5. Calculate word_count from the extracted content
//   6. INSERT into contents table → return the persisted record
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

  // --- 2. Resolve anonymous profile ID (fallback to UUID) ---
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

  // --- 4. Calculate word_count (Chinese-aware: count chars for CJK, words for Latin) ---
  const wordCount = calculateWordCount(scraped.markdown);

  // --- 5. Persist to database ---
  let content: Content;

  try {
    const supabase = createServerClient();

    // Upsert profile and return its UUID in a single round-trip
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        { anon_id: anonId },
        { onConflict: "anon_id", ignoreDuplicates: true }
      )
      .select("id")
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "用户身份验证失败" },
        { status: 401 }
      );
    }

    // Insert into contents table
    const { data: inserted, error: insertError } = await supabase
      .from("contents")
      .insert({
        profile_id: profile.id,
        source_type: "url" satisfies SourceType,
        title: scraped.title || null,
        raw_url: url,
        raw_text: scraped.markdown,
        word_count: wordCount,
        metadata: {
          title: scraped.title || undefined,
          description: scraped.description,
          image_urls: scraped.images,
        },
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
  } catch (err) {
    // Supabase not configured yet (missing env vars) — fall back to in-memory response
    const now = new Date().toISOString();
    content = {
      id: uuidv4(),
      profileId: anonId,
      sourceType: "url",
      title: scraped.title || null,
      rawUrl: url,
      rawText: scraped.markdown,
      fileName: null,
      fileType: null,
      wordCount,
      metadata: {
        title: scraped.title || undefined,
        description: scraped.description,
        imageUrls: scraped.images,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  return NextResponse.json({ success: true, content }, { status: 201 });
}

/**
 * Count words in mixed Chinese/English text.
 * - CJK characters are counted individually
 * - Latin words are counted by whitespace splitting
 */
function calculateWordCount(text: string): number {
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
  const withoutCjk = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ");
  const latinWords = withoutCjk.split(/\s+/).filter((w) => w.length > 0).length;
  return cjkChars + latinWords;
}

/**
 * Map a Supabase row (snake_case) to the Content interface (camelCase).
 */
function mapRowToContent(row: Record<string, unknown>, profileId: string): Content {
  return {
    id: row.id as string,
    profileId,
    sourceType: row.source_type as Content["sourceType"],
    title: (row.title as string) ?? null,
    rawUrl: (row.raw_url as string) ?? null,
    rawText: row.raw_text as string,
    fileName: (row.file_name as string) ?? null,
    fileType: (row.file_type as string) ?? null,
    wordCount: (row.word_count as number) ?? 0,
    metadata: (row.metadata as Content["metadata"]) ?? {},
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? (row.created_at as string),
  };
}

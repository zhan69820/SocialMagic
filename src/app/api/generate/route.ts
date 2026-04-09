import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { generateCopies, type GenerationResult } from "@/lib/services/generator.service";
import type {
  Platform,
  GeneratorConfig,
  ToneOverrides,
  Content,
  SocialPost,
} from "@/types/index";

// ---------------------------------------------------------------------------
// POST /api/generate
//
// Flow:
//   1. Parse { contentId, config } from request body
//   2. Verify identity via anon_id → lookup profile
//   3. Fetch source content from DB (contents table)
//   4. Resolve API key for the selected provider
//   5. Call generator → produce copy for each platform
//   6. Persist results to social_posts table
//   7. Return all generated copies
// ---------------------------------------------------------------------------

interface GenerateRequestBody {
  contentId: string;
  config: {
    platforms: Platform[];
    toneOverrides?: ToneOverrides;
    provider: "openai" | "anthropic";
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  apiKey: string;
}

interface GenerateSuccessResponse {
  success: true;
  copies: Array<GenerationResult & { id: string; version: number }>;
}

interface GenerateErrorResponse {
  success: false;
  error: string;
}

type GenerateResponse = GenerateSuccessResponse | GenerateErrorResponse;

export async function POST(
  request: NextRequest
): Promise<NextResponse<GenerateResponse>> {
  // --- 1. Parse & validate input ---
  let body: GenerateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "请求体不是有效的 JSON" },
      { status: 400 }
    );
  }

  const { contentId, config, apiKey } = body;

  if (!contentId || typeof contentId !== "string") {
    return NextResponse.json(
      { success: false, error: "缺少 contentId 参数" },
      { status: 400 }
    );
  }

  if (!config?.platforms?.length) {
    return NextResponse.json(
      { success: false, error: "请至少选择一个目标平台" },
      { status: 400 }
    );
  }

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json(
      { success: false, error: "缺少 AI 服务 API Key" },
      { status: 400 }
    );
  }

  const anonId = request.headers.get("x-anon-id");
  if (!anonId) {
    return NextResponse.json(
      { success: false, error: "缺少用户身份标识 (x-anon-id)" },
      { status: 401 }
    );
  }

  // --- 2. Supabase operations ---
  let sourceText: string;
  let profileId: string;

  try {
    const supabase = createServerClient();

    // Verify identity — upsert + select in one RTT
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert({ anon_id: anonId }, { onConflict: "anon_id", ignoreDuplicates: true })
      .select("id")
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "用户身份验证失败" },
        { status: 401 }
      );
    }
    profileId = profile.id;

    // Fetch source content
    const { data: contentRow, error: contentError } = await supabase
      .from("contents")
      .select("raw_text, profile_id")
      .eq("id", contentId)
      .single();

    if (contentError || !contentRow) {
      return NextResponse.json(
        { success: false, error: "素材内容不存在或无权访问" },
        { status: 404 }
      );
    }

    if (contentRow.profile_id !== profileId) {
      return NextResponse.json(
        { success: false, error: "无权访问该素材" },
        { status: 403 }
      );
    }

    sourceText = contentRow.raw_text;
  } catch {
    // Supabase not configured — check if content is in the request
    if (!body.contentId) {
      return NextResponse.json(
        { success: false, error: "数据库连接失败，无法获取素材内容" },
        { status: 503 }
      );
    }

    // For development without Supabase: we need the source text passed somehow
    // Since we can't fetch from DB, require it in the request
    const fallbackText = (body as unknown as Record<string, unknown>).sourceText as string | undefined;
    if (!fallbackText) {
      return NextResponse.json(
        { success: false, error: "数据库未配置，请在请求中附带 sourceText 字段" },
        { status: 503 }
      );
    }
    sourceText = fallbackText;
    profileId = anonId;
  }

  // --- 3. Call generator ---
  const generatorConfig: GeneratorConfig = {
    platforms: config.platforms,
    toneOverrides: config.toneOverrides ?? {},
    provider: config.provider,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  };

  let results: GenerationResult[];
  try {
    results = await generateCopies(sourceText, generatorConfig, apiKey);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `文案生成失败: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  // --- 4. Persist to social_posts ---
  const responseCopies: Array<GenerationResult & { id: string; version: number }> = [];

  try {
    const supabase = createServerClient();

    for (const result of results) {
      // Determine next version number for this content_id + platform combo
      const { count } = await supabase
        .from("social_posts")
        .select("*", { count: "exact", head: true })
        .eq("content_id", contentId)
        .eq("platform", result.platform);

      const version = (count ?? 0) + 1;

      const { data: inserted, error: insertError } = await supabase
        .from("social_posts")
        .insert({
          profile_id: profileId,
          content_id: contentId,
          platform: result.platform,
          body: result.body,
          tone: result.tone,
          model: result.model,
          version,
          token_count: result.tokenCount,
          char_count: result.charCount,
        })
        .select("id")
        .single();

      if (insertError) {
        // Log but don't fail — still return the generated content
        console.error("Failed to persist social_post:", insertError.message);
      }

      responseCopies.push({
        ...result,
        id: inserted?.id ?? crypto.randomUUID(),
        version,
      });
    }
  } catch {
    // Supabase not available — return results without persistence
    for (const result of results) {
      responseCopies.push({
        ...result,
        id: crypto.randomUUID(),
        version: 1,
      });
    }
  }

  return NextResponse.json(
    { success: true, copies: responseCopies },
    { status: 201 }
  );
}

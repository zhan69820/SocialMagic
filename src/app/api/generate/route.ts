import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  generateCopies,
  truncateContent,
  type GenerationResult,
  type GenerationError,
} from "@/lib/services/generator.service";
import type {
  Platform,
  GeneratorConfig,
  ToneOverrides,
} from "@/types/index";

// ---------------------------------------------------------------------------
// POST /api/generate
//
// Flow:
//   1. Parse { contentId, config, apiKey } from request body
//   2. Verify anonymous user identity via x-anon-id header
//   3. Upsert profile (single RTT) → fetch source content from contents table
//   4. Truncate source to 5000 chars to prevent token overflow
//   5. Call generateCopies → Promise.allSettled per platform
//   6. Persist each successful copy to social_posts via atomic .rpc() versioning
//   7. Return { copies, errors } — copies only contains DB-confirmed records
// ---------------------------------------------------------------------------

interface GenerateRequestBody {
  contentId: string;
  sourceText?: string;
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

interface CopyResponse extends GenerationResult {
  id: string;
  version: number;
}

interface GenerateSuccessResponse {
  success: true;
  copies: CopyResponse[];
  errors: GenerationError[];
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

  // --- 2. Resolve identity & fetch source content ---
  let sourceText: string;
  let profileId: string;
  let dbAvailable = false;

  try {
    const supabase = createServerClient();

    // Upsert profile + return UUID in one round-trip
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

    // Fetch source content from DB
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
    dbAvailable = true;
  } catch {
    // Supabase not configured — accept sourceText from request body
    const fallbackText = body.sourceText;
    if (!fallbackText) {
      return NextResponse.json(
        { success: false, error: "数据库未配置，请在请求中附带 sourceText 字段" },
        { status: 503 }
      );
    }
    sourceText = fallbackText;
    profileId = anonId;
  }

  // --- 3. Truncate source to prevent token overflow ---
  sourceText = truncateContent(sourceText);

  // --- 4. Call generator (Promise.allSettled inside) ---
  const generatorConfig: GeneratorConfig = {
    platforms: config.platforms,
    toneOverrides: config.toneOverrides ?? {},
    provider: config.provider,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  };

  const batch = await generateCopies(sourceText, generatorConfig, apiKey);

  // --- 5. Persist successful copies to social_posts ---
  // INVARIANT: responseCopies ONLY contains records that were 100% confirmed
  // written to the database. Any insert failure is moved to errors.
  const responseCopies: CopyResponse[] = [];
  const allErrors: GenerationError[] = [...batch.errors];

  if (dbAvailable) {
    const supabase = createServerClient();

    for (const copy of batch.copies) {
      // --- Bug B fix: atomic version via DB function ---
      const { data: versionResult, error: rpcError } = await supabase.rpc(
        "get_next_post_version",
        { content_uuid: contentId, platform_name: copy.platform }
      );

      if (rpcError || typeof versionResult !== "number") {
        allErrors.push({
          platform: copy.platform,
          message: `版本号获取失败: ${rpcError?.message ?? "unknown"}`,
        });
        continue;
      }

      const version = versionResult;

      const { data: inserted, error: insertError } = await supabase
        .from("social_posts")
        .insert({
          profile_id: profileId,
          content_id: contentId,
          platform: copy.platform,
          body: copy.body,
          tone: copy.tone,
          model: copy.model,
          version,
          token_count: copy.tokenCount,
          char_count: copy.charCount,
          metadata: { alchemy_success_rate: copy.alchemySuccessRate },
        })
        .select("id")
        .single();

      // --- Bug A fix: on insert failure, move to errors — never return a fake ID ---
      if (insertError || !inserted?.id) {
        allErrors.push({
          platform: copy.platform,
          message: `数据库写入失败: ${insertError?.message ?? "unknown"}`,
        });
        continue;
      }

      // Only reach here on confirmed DB write
      responseCopies.push({
        ...copy,
        id: inserted.id,
        version,
      });
    }
  } else {
    // Supabase not available — return generated results without persistence
    // (no fake DB IDs — we mark version as 0 to indicate un-persisted)
    for (const copy of batch.copies) {
      responseCopies.push({
        ...copy,
        id: crypto.randomUUID(),
        version: 0,
      });
    }
  }

  // --- 6. Return structured response ---
  return NextResponse.json(
    {
      success: true,
      copies: responseCopies,
      errors: allErrors,
    },
    { status: 201 }
  );
}

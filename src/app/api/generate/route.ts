import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { v4 as uuidv4 } from "uuid";
import { createServerClient } from "@/lib/supabase/client";
import {
  createDynamicProvider,
  truncateContent,
  computeAlchemyScore,
  buildUserPrompt,
  getDefaultTemperature,
  PLATFORM_SYSTEM_PROMPTS,
  type GenerationResult,
} from "@/lib/services/generator.service";
import type {
  Platform,
  ToneOverrides,
  ProviderType,
} from "@/types/index";
import { PLATFORM_DEFAULTS } from "@/types/index";

// ---------------------------------------------------------------------------
// POST /api/generate — SSE streaming
//
// Returns a Server-Sent Events stream with per-platform text chunks.
// Each platform streams independently in parallel via Promise.allSettled.
//
// SSE event types:
//   chunk:    { type:"chunk", platform:"xiaohongshu", text:"..." }
//   complete: { type:"complete", platform:"xiaohongshu", id, version, ... }
//   error:    { type:"error", platform:"douyin", message:"..." }
//   done:     { type:"done" }
// ---------------------------------------------------------------------------

interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  model: string;
  baseURL?: string;
}

interface GenerateRequestBody {
  contentId: string;
  sourceText?: string;
  config: {
    platforms: Platform[];
    toneOverrides?: ToneOverrides;
    temperature?: number;
    maxTokens?: number;
  };
  providerConfig: ProviderConfig;
}

export async function POST(request: NextRequest) {
  let body: GenerateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "请求体不是有效的 JSON" },
      { status: 400 }
    );
  }

  const { contentId, config, providerConfig } = body;

  if (!contentId || !config?.platforms?.length || !providerConfig?.apiKey || !providerConfig?.model) {
    return NextResponse.json(
      { success: false, error: "参数不完整" },
      { status: 400 }
    );
  }

  const anonId = request.headers.get("x-anon-id");
  if (!anonId) {
    return NextResponse.json(
      { success: false, error: "缺少 x-anon-id" },
      { status: 401 }
    );
  }

  // Resolve identity & source text
  let sourceText: string;
  let profileId: string;
  let dbAvailable = false;

  try {
    const supabase = createServerClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert({ anon_id: anonId }, { onConflict: "anon_id", ignoreDuplicates: true })
      .select("id")
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: "身份验证失败" }, { status: 401 });
    }
    profileId = profile.id;

    const { data: contentRow, error: contentError } = await supabase
      .from("contents")
      .select("raw_text, profile_id")
      .eq("id", contentId)
      .single();

    if (contentError || !contentRow || contentRow.profile_id !== profileId) {
      return NextResponse.json({ success: false, error: "素材不存在或无权访问" }, { status: 403 });
    }

    sourceText = contentRow.raw_text;
    dbAvailable = true;
  } catch {
    if (!body.sourceText) {
      return NextResponse.json({ success: false, error: "数据库不可用，需附带 sourceText" }, { status: 503 });
    }
    sourceText = body.sourceText;
    profileId = anonId;
  }

  sourceText = truncateContent(sourceText);

  // Build SSE stream
  const encoder = new TextEncoder();
  const send = (data: unknown) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      const platformPromises = config.platforms.map(async (platform) => {
        try {
          const platformConfig = PLATFORM_DEFAULTS[platform];
          const tone = config.toneOverrides?.[platform] || platformConfig.defaultTone;
          const userPrompt = buildUserPrompt(sourceText, platform, config.toneOverrides);
          const temperature = config.temperature ?? getDefaultTemperature(platform);
          const maxTokens = config.maxTokens ?? 2048;

          const model = createDynamicProvider({
            provider: providerConfig.type,
            apiKey: providerConfig.apiKey,
            model: providerConfig.model,
            baseURL: providerConfig.baseURL,
          });

          const result = streamText({
            model,
            system: PLATFORM_SYSTEM_PROMPTS[platform],
            prompt: userPrompt,
            temperature,
            maxOutputTokens: maxTokens,
          });

          // Stream text chunks
          for await (const textPart of result.textStream) {
            controller.enqueue(send({ type: "chunk", platform, text: textPart }));
          }

          // Get final metadata
          const final = await result;
          const fullText = await final.text;
          const score = computeAlchemyScore(fullText, platformConfig);

          // Persist to DB
          let postId = crypto.randomUUID();
          let version = 0;

          if (dbAvailable) {
            try {
              const supabase = createServerClient();

              const { data: versionResult } = await supabase.rpc(
                "get_next_post_version",
                { content_uuid: contentId, platform_name: platform }
              );

              if (typeof versionResult === "number") {
                version = versionResult;
                const { data: inserted } = await supabase
                  .from("social_posts")
                  .insert({
                    profile_id: profileId,
                    content_id: contentId,
                    platform,
                    body: fullText,
                    tone,
                    model: providerConfig.model,
                    version,
                    token_count: (await final.usage).totalTokens ?? 0,
                    char_count: fullText.length,
                    metadata: { alchemy_success_rate: score },
                  })
                  .select("id")
                  .single();

                if (inserted?.id) postId = inserted.id;
              }
            } catch {
              // DB failed — still deliver the generated text
            }
          }

          const completedResult: GenerationResult & { id: string; version: number } = {
            id: postId,
            version,
            platform,
            body: fullText,
            tone,
            model: providerConfig.model,
            tokenCount: (await final.usage).totalTokens ?? 0,
            charCount: fullText.length,
            alchemySuccessRate: score,
          };

          controller.enqueue(send({ type: "complete", ...completedResult }));
        } catch (err) {
          controller.enqueue(
            send({
              type: "error",
              platform,
              message: err instanceof Error ? err.message : String(err),
            })
          );
        }
      });

      await Promise.allSettled(platformPromises);
      controller.enqueue(send({ type: "done" }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

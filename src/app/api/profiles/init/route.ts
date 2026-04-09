import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// POST /api/profiles/init
//
// Ensures a profile row exists for the given anon_id.
// Called by the client-side IdentityProvider on first load.
// Returns the profile row on success.
// ---------------------------------------------------------------------------

interface InitRequest {
  anon_id: string;
}

interface InitSuccessResponse {
  success: true;
  profile: { id: string; anon_id: string };
}

interface InitErrorResponse {
  success: false;
  error: string;
}

type InitResponse = InitSuccessResponse | InitErrorResponse;

export async function POST(
  request: NextRequest
): Promise<NextResponse<InitResponse>> {
  let body: InitRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "请求体不是有效的 JSON" },
      { status: 400 }
    );
  }

  const { anon_id } = body;

  if (!anon_id || typeof anon_id !== "string") {
    return NextResponse.json(
      { success: false, error: "缺少 anon_id 参数" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .upsert({ anon_id }, { onConflict: "anon_id", ignoreDuplicates: true })
      .select("id, anon_id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: `用户初始化失败: ${error?.message ?? "unknown"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, profile: data });
  } catch {
    // Supabase not configured — return a synthetic success so the client
    // can still function in local-only mode
    return NextResponse.json({
      success: true,
      profile: { id: crypto.randomUUID(), anon_id },
    });
  }
}

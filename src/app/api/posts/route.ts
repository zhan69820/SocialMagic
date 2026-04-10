import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import type { Platform } from "@/types/index";

// ---------------------------------------------------------------------------
// GET /api/posts
//
// Returns all social_posts for the authenticated user (by anon_id).
// Flow:
//   1. Extract anon_id from x-anon-id header
//   2. Resolve anon_id → profile_id
//   3. Fetch all social_posts ordered by created_at DESC
//   4. Return posts array
// ---------------------------------------------------------------------------

interface PostRow {
  id: string;
  profile_id: string;
  content_id: string;
  platform: Platform;
  body: string;
  tone: string;
  model: string;
  version: number;
  token_count: number;
  char_count: number;
  created_at: string;
  updated_at: string;
}

interface GetPostsSuccessResponse {
  success: true;
  posts: PostRow[];
}

interface GetPostsErrorResponse {
  success: false;
  error: string;
}

type GetPostsResponse = GetPostsSuccessResponse | GetPostsErrorResponse;

export async function GET(
  request: NextRequest
): Promise<NextResponse<GetPostsResponse>> {
  const anonId = request.headers.get("x-anon-id");
  if (!anonId) {
    return NextResponse.json(
      { success: false, error: "缺少用户身份标识" },
      { status: 401 }
    );
  }

  try {
    const supabase = createServerClient();

    // Step 1: Resolve anon_id → profile_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("anon_id", anonId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "用户身份验证失败" },
        { status: 401 }
      );
    }

    // Step 2: Fetch all posts for this profile
    const { data: posts, error: postsError } = await supabase
      .from("social_posts")
      .select(
        "id, profile_id, content_id, platform, body, tone, model, version, token_count, char_count, created_at, updated_at"
      )
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false });

    if (postsError) {
      return NextResponse.json(
        { success: false, error: `查询失败: ${postsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, posts: posts ?? [] });
  } catch {
    // Supabase not configured — return empty result for graceful offline use
    return NextResponse.json(
      { success: false, error: "数据库不可用" },
      { status: 503 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// DELETE /api/posts/[id]
//
// Security flow:
//   1. Extract post ID from URL
//   2. Extract anon_id from x-anon-id header
//   3. Look up profile_id from anon_id
//   4. Verify the post belongs to this profile_id
//   5. Delete only if ownership confirmed
// ---------------------------------------------------------------------------

interface DeleteSuccessResponse {
  success: true;
  deleted: string;
}

interface DeleteErrorResponse {
  success: false;
  error: string;
}

type DeleteResponse = DeleteSuccessResponse | DeleteErrorResponse;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeleteResponse>> {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { success: false, error: "缺少文案 ID" },
      { status: 400 }
    );
  }

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

    // Step 2: Verify ownership — fetch the post and check profile_id match
    const { data: post, error: postError } = await supabase
      .from("social_posts")
      .select("id, profile_id")
      .eq("id", id)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: "文案不存在" },
        { status: 404 }
      );
    }

    if (post.profile_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: "无权删除该文案" },
        { status: 403 }
      );
    }

    // Step 3: Delete
    const { error: deleteError } = await supabase
      .from("social_posts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: `删除失败: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch {
    // Supabase not configured — cannot authorize, reject
    return NextResponse.json(
      { success: false, error: "数据库不可用，无法验证删除权限" },
      { status: 503 }
    );
  }
}

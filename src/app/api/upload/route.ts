import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createServerClient } from "@/lib/supabase/client";
import { parsePdf } from "@/lib/parsers/pdf";
import { parseDocx } from "@/lib/parsers/docx";
import { calculateWordCount } from "@/lib/utils/calculate-word-count";
import { mapRowToContent } from "@/lib/utils/map-row-to-content";
import type { Content, SourceType } from "@/types/index";

// ---------------------------------------------------------------------------
// POST /api/upload
//
// Accepts a PDF or DOCX file, extracts text, persists to contents table.
// ---------------------------------------------------------------------------

interface UploadSuccessResponse {
  success: true;
  content: Content;
}

interface UploadErrorResponse {
  success: false;
  error: string;
}

type UploadResponse = UploadSuccessResponse | UploadErrorResponse;

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { success: false, error: "请求必须是 multipart/form-data 格式" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "请选择要上传的文件" },
      { status: 400 }
    );
  }

  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json(
      { success: false, error: "仅支持 PDF 和 DOCX 格式文件" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, error: "文件大小不能超过 10MB" },
      { status: 400 }
    );
  }

  const anonId = request.headers.get("x-anon-id") || formData.get("anon_id") as string || uuidv4();

  // Parse file
  let rawText: string;
  const sourceType: SourceType = "file";
  const fileName = file.name;
  const fileType = file.type;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.type === "application/pdf") {
      const result = await parsePdf(buffer);
      rawText = result.text;
    } else {
      const result = await parseDocx(buffer);
      rawText = result.text;
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { success: false, error: "文件内容为空，无法提取文本" },
        { status: 422 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `文件解析失败: ${(err as Error).message}` },
      { status: 422 }
    );
  }

  // Calculate word count
  const wordCount = calculateWordCount(rawText);
  const title = fileName.replace(/\.[^.]+$/, "");

  // Persist
  let content: Content;

  try {
    const supabase = createServerClient();

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

    const { data: inserted, error: insertError } = await supabase
      .from("contents")
      .insert({
        profile_id: profile.id,
        source_type: sourceType,
        title,
        raw_url: null,
        raw_text: rawText,
        file_name: fileName,
        file_type: fileType,
        word_count: wordCount,
        metadata: { fileName, fileType },
      })
      .select()
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        {
          success: false,
          error: `数据库写入失败: ${insertError?.message ?? "unknown"}`,
        },
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
      title,
      rawUrl: null,
      rawText,
      fileName,
      fileType,
      wordCount,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
  }

  return NextResponse.json({ success: true, content }, { status: 201 });
}

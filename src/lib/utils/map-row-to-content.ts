import type { Content } from "@/types/index";

export function mapRowToContent(row: Record<string, unknown>, profileId: string): Content {
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

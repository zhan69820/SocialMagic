// =============================================================================
// DOCX text extraction
// =============================================================================

export interface DocxParseResult {
  text: string;
}

export async function parseDocx(buffer: Buffer): Promise<DocxParseResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });

  const text = result.value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text };
}

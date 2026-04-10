// =============================================================================
// PDF text extraction
// =============================================================================

export interface PdfParseResult {
  text: string;
  pageCount: number;
}

export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);

  const text = data.text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    text,
    pageCount: data.numpages,
  };
}

export function calculateWordCount(text: string): number {
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
  const withoutCjk = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ");
  const latinWords = withoutCjk.split(/\s+/).filter((w) => w.length > 0).length;
  return cjkChars + latinWords;
}

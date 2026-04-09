import * as cheerio from "cheerio";
import TurndownService from "turndown";
import type { ScrapedContent, SourceMetadata } from "@/types/index";

/**
 * Parse raw HTML into a clean Markdown document, extracting only the main
 * content area (article body) and discarding navigation, ads, footers, etc.
 *
 * Pipeline:
 *   1. Cheerio — remove <script>, <style>, <nav>, <footer>, <header> tags
 *   2. Main-content heuristic selectors
 *   3. Turndown — convert the remaining HTML to clean Markdown
 */
export function extractContent(
  html: string,
  sourceUrl: string,
  metadata?: SourceMetadata
): ScrapedContent {
  const $ = cheerio.load(html);

  $("script, style, nav, footer, header, aside, iframe, noscript").remove();

  const title = metadata?.title
    ?? $("title").first().text().trim()
    ?? extractOgTitle($)
    ?? "";

  const description = metadata?.description ?? extractOgDescription($);

  const images = metadata?.imageUrls?.length
    ? metadata.imageUrls
    : extractImages($, sourceUrl);

  const mainHtml = extractMainHtml($);

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  const markdown = turndown.turndown(mainHtml);

  const wordCount = markdown.replace(/\s+/g, " ").trim().split(/\s+/).length;

  return {
    title,
    markdown,
    description,
    url: sourceUrl,
    images,
    wordCount,
    sourceUrl,
  };
}

function extractMainHtml($: cheerio.CheerioAPI): string {
  const selectors = [
    "article",
    '[role="main"]',
    "main",
    ".post-content",
    ".article-content",
    ".entry-content",
    ".content-body",
    ".post-body",
    "#article-content",
    "#content",
    ".markdown-body",
    ".rich-text",
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 100) {
      return el.html() ?? el.text();
    }
  }

  return $("body").html() ?? $.html();
}

function extractOgTitle($: cheerio.CheerioAPI): string {
  return $('meta[property="og:title"]').attr("content")?.trim() ?? "";
}

function extractOgDescription($: cheerio.CheerioAPI): string | undefined {
  return $('meta[property="og:description"]').attr("content")?.trim()
    ?? $('meta[name="description"]').attr("content")?.trim();
}

function extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const images: Set<string> = new Set();

  $('meta[property="og:image"]').each((_, el) => {
    const src = $(el).attr("content");
    if (src) images.add(resolveUrl(src, baseUrl));
  });

  $("article img, main img, .post-content img").each((i, el) => {
    if (i >= 5) return false;
    const src = $(el).attr("src") ?? $(el).attr("data-src");
    if (src) images.add(resolveUrl(src, baseUrl));
  });

  return Array.from(images);
}

function resolveUrl(src: string, base: string): string {
  try {
    return new URL(src, base).toString();
  } catch {
    return src;
  }
}

import { fetchPage } from "../scraper/fetch-page";
import { extractContent } from "../scraper/extract-content";
import type { ScrapedContent, ScrapeResult } from "@/types/index";

/**
 * ScraperService — thin service layer that wraps the low-level scraper
 * modules (fetch-page + extract-content) into a single callable unit.
 *
 * API routes and other consumers should use this service rather than
 * importing the individual scraper modules directly.
 */

export interface ScrapeServiceResult {
  scraped: ScrapedContent;
}

/**
 * Scrape a URL and return structured content (title + Markdown body + metadata).
 *
 * Throws a human-readable error string on any failure — callers can catch
 * and relay the message directly to the client.
 */
export async function scrapeUrl(url: string): Promise<ScrapeServiceResult> {
  const page = await fetchPage(url);

  if (!page.html || page.html.trim().length === 0) {
    throw new Error("页面内容为空，请检查链接是否正确");
  }

  const scraped = extractContent(page.html, page.url, page.metadata);

  if (!scraped.markdown || scraped.markdown.trim().length === 0) {
    throw new Error("无法提取页面正文内容，该页面可能需要登录或使用了特殊渲染方式");
  }

  return { scraped };
}

/**
 * Convenience wrapper that returns a ScrapeResult (success/error object)
 * instead of throwing. Useful for API routes that need to return both
 * success and error states in the same response shape.
 */
export async function scrapeUrlSafe(url: string): Promise<ScrapeResult> {
  try {
    const { scraped } = await scrapeUrl(url);
    return {
      success: true,
      content: scraped.markdown,
      metadata: {
        title: scraped.title,
        description: scraped.description,
        imageUrls: scraped.images,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

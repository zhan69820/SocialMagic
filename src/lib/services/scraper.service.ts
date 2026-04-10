import { fetchPage } from "../scraper/fetch-page";
import { extractContent } from "../scraper/extract-content";
import type { ScrapedContent } from "@/types/index";

export interface ScrapeServiceResult {
  scraped: ScrapedContent;
}

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

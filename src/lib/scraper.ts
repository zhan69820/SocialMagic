import { fetchPage } from "./scraper/fetch-page";
import { extractContent } from "./scraper/extract-content";
import type { ScrapedContent, ScrapeResult } from "@/types/index";

export async function scrapeUrl(rawUrl: string): Promise<ScrapeResult> {
  try {
    const page = await fetchPage(rawUrl);

    if (!page.html || page.html.trim().length === 0) {
      return {
        success: false,
        error: "页面内容为空，请检查链接是否正确",
      };
    }

    const scraped: ScrapedContent = extractContent(
      page.html,
      page.url,
      page.metadata
    );

    if (!scraped.markdown || scraped.markdown.trim().length === 0) {
      return {
        success: false,
        error: "无法提取页面正文内容，该页面可能需要登录或使用了特殊渲染方式",
      };
    }

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
    const message = (err as Error).message;

    if (message.startsWith("INVALID_URL")) {
      return { success: false, error: "请输入有效的网页链接" };
    }
    if (message.startsWith("TIMEOUT")) {
      return { success: false, error: "网页访问超时，请稍后重试" };
    }
    if (message.startsWith("NETWORK_ERROR")) {
      return { success: false, error: "网页无法访问，请检查链接或手动粘贴内容" };
    }
    if (message.startsWith("HTTP_ERROR")) {
      return { success: false, error: `网页返回错误 (${message.split(":")[1]?.trim()}), 请检查链接` };
    }
    if (message.startsWith("CONTENT_TYPE_ERROR")) {
      return { success: false, error: "该链接不是网页内容，请提供文章或商品页链接" };
    }

    return { success: false, error: "网页抓取失败，请稍后重试或手动粘贴内容" };
  }
}

export async function scrapeUrlFull(rawUrl: string): Promise<ScrapedContent> {
  const page = await fetchPage(rawUrl);
  return extractContent(page.html, page.url, page.metadata);
}

export { fetchPage, extractContent } from "./scraper/index";
export type { ScrapedContent } from "@/types/index";

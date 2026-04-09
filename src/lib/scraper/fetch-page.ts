import type { SourceMetadata } from "@/types/index";

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Pool of real mobile User-Agent strings. One is picked at random per request
 * to reduce the chance of being blocked by bot-detection systems.
 */
const MOBILE_USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.179 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; 23106RN0DA) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Mobile Safari/537.36",
];

function randomMobileUA(): string {
  return MOBILE_USER_AGENTS[Math.floor(Math.random() * MOBILE_USER_AGENTS.length)];
}

export interface FetchedPage {
  /** Final URL after any redirects */
  url: string;
  /** Raw HTML string */
  html: string;
  /** Extracted metadata from <meta> tags */
  metadata: SourceMetadata;
}

/**
 * Fetch a web page and return its raw HTML together with basic metadata.
 *
 * - Follows redirects (up to 5 hops via native fetch).
 * - Random mobile User-Agent per request to reduce bot-detection risk.
 * - Times out after 10 seconds.
 * - Throws a typed error string on failure.
 */
export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`INVALID_URL: "${rawUrl}" is not a valid URL`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`INVALID_URL: only http(s) URLs are supported, got "${url.protocol}"`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const userAgent = randomMobileUA();

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`TIMEOUT: fetching "${rawUrl}" exceeded ${FETCH_TIMEOUT_MS}ms`);
    }
    throw new Error(`NETWORK_ERROR: unable to fetch "${rawUrl}" — ${(err as Error).message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(
      `HTTP_ERROR: server returned ${response.status} ${response.statusText} for "${rawUrl}"`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error(
      `CONTENT_TYPE_ERROR: expected HTML but got "${contentType}" for "${rawUrl}"`
    );
  }

  const html = await response.text();
  const finalUrl = response.url || rawUrl;

  const metadata = extractMetaTags(html);

  return { url: finalUrl, html, metadata };
}

/**
 * Extract OpenGraph and standard <meta> metadata from raw HTML.
 */
function extractMetaTags(html: string): SourceMetadata {
  const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  const descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)
    ?? html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const imageMatches = [
    ...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi),
    ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi),
  ];

  return {
    title: titleMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim(),
    imageUrls: imageMatches.map((m) => m[1]).filter(Boolean),
  };
}

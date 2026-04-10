import { YoutubeTranscript } from "youtube-transcript";

// =============================================================================
// YouTube transcript extraction
// =============================================================================

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url);
}

export function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match?.[1] ?? null;
}

export async function fetchYouTubeTranscript(
  videoId: string
): Promise<{ title: string; text: string }> {
  const response = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  const html = await response.text();

  // Extract title
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const rawTitle = titleMatch?.[1]?.replace(" - YouTube", "").trim() ?? `YouTube: ${videoId}`;

  // Extract transcript via youtube-transcript library
  try {
    const chunks = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "zh",
    });

    if (chunks.length > 0) {
      const text = chunks.map((c) => c.text).join(" ");
      return { title: rawTitle, text };
    }
  } catch {
    // Chinese not available, try English
  }

  try {
    const chunks = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "en",
    });

    if (chunks.length > 0) {
      const text = chunks.map((c) => c.text).join(" ");
      return { title: rawTitle, text };
    }
  } catch {
    // No transcript available
  }

  throw new Error("该视频没有可用的字幕/文稿");
}

// =============================================================================
// Bilibili transcript extraction
// =============================================================================

const BILIBILI_REGEX = /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/;

export function isBilibiliUrl(url: string): boolean {
  return BILIBILI_REGEX.test(url);
}

export function extractBilibiliBvid(url: string): string | null {
  const match = url.match(BILIBILI_REGEX);
  return match?.[1] ?? null;
}

export async function fetchBilibiliTranscript(
  bvid: string
): Promise<{ title: string; text: string }> {
  // Step 1: Get video info (cid + title)
  const infoRes = await fetch(
    `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  const infoData = (await infoRes.json()) as {
    data?: { cid: number; title: string };
  };

  if (!infoData.data?.cid) {
    throw new Error("无法获取视频信息");
  }

  const cid = infoData.data.cid;
  const title = infoData.data.title || `Bilibili: ${bvid}`;

  // Step 2: Get subtitle list
  const subRes = await fetch(
    `https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  const subData = (await subRes.json()) as {
    data?: {
      subtitle?: {
        subtitles?: Array<{
          subtitle_url: string;
          lan: string;
        }>;
      };
    };
  };

  const subtitles = subData.data?.subtitle?.subtitles;
  if (!subtitles || subtitles.length === 0) {
    throw new Error("该视频没有可用的字幕/CC");
  }

  // Prefer Chinese subtitles
  const preferred =
    subtitles.find((s) => s.lan.startsWith("zh")) || subtitles[0];
  let subUrl = preferred.subtitle_url;
  if (subUrl.startsWith("//")) subUrl = `https:${subUrl}`;

  // Step 3: Fetch subtitle JSON
  const transcriptRes = await fetch(subUrl, {
    signal: AbortSignal.timeout(10000),
  });
  const transcriptData = (await transcriptRes.json()) as {
    body?: Array<{ content: string }>;
  };

  if (!transcriptData.body?.length) {
    throw new Error("字幕内容为空");
  }

  const text = transcriptData.body.map((item) => item.content).join(" ");
  return { title, text };
}

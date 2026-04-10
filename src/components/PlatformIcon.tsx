"use client";

import type { Platform } from "@/types/index";

// =============================================================================
// Consistent SVG icons — hand-crafted, no external assets
//
// Design language: rounded 24×24 viewbox, 1.5px stroke, currentColor fill/stroke
// =============================================================================

interface PlatformIconProps {
  platform: Platform;
  size?: number;
  className?: string;
}

export default function PlatformIcon({
  platform,
  size = 24,
  className,
}: PlatformIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    className,
  };

  switch (platform) {
    case "xiaohongshu":
      return (
        <svg {...props}>
          {/* Red book — open book with leaf/heart accent */}
          <rect x="3" y="4" width="8" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="13" y="4" width="8" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 8h3M7 11h3M7 14h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M17 8h-3M17 11h-3M17 14h-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.5" />
        </svg>
      );

    case "wechat":
      return (
        <svg {...props}>
          {/* WeChat — two overlapping chat bubbles */}
          <path
            d="M8.5 4C5.46 4 3 6.24 3 9c0 1.6.86 3.03 2.2 3.94l-.58 2.06 2.28-1.14c.52.1 1.06.14 1.6.14.34 0 .66-.02.98-.06"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 9c3.04 0 5.5 2.24 5.5 5s-2.46 5-5.5 5c-.54 0-1.06-.06-1.56-.16l-2.28 1.14.58-2.06A4.74 4.74 0 0 1 9.5 14c0-2.76 2.46-5 5.5-5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6.5" cy="9" r="0.8" fill="currentColor" />
          <circle cx="10" cy="9" r="0.8" fill="currentColor" />
          <circle cx="13.5" cy="14" r="0.8" fill="currentColor" />
          <circle cx="16.5" cy="14" r="0.8" fill="currentColor" />
        </svg>
      );

    case "douyin":
      return (
        <svg {...props}>
          {/* Douyin — music note with motion lines */}
          <path
            d="M10 4v11a3.5 3.5 0 1 1-1.5-2.9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 4c2.5.5 5.5 2 6 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M19 7l1.5 1M19 4l1.5-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="8" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );

    case "weibo":
      return (
        <svg {...props}>
          {/* Weibo — eye/megaphone hybrid, signature "w" wave */}
          <path
            d="M4 14c0-3.5 3.5-7 8-7s8 3.5 8 7-3.5 5-8 5-8-1.5-8-5z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <ellipse cx="12" cy="14" rx="3" ry="2.2" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="12" cy="14" r="1" fill="currentColor" />
          <path
            d="M17 5.5c1.5-.3 3 .2 3.5 1.5s-.2 2.8-1.5 3.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path d="M16 3c2.2-.5 4.5.3 5.2 2 .8 1.8-.2 4-2 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );
  }
}

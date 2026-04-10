"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// =============================================================================
// useTypewriter — smooth character-reveal streaming effect
//
// Takes a target string (which may grow over time as SSE chunks arrive)
// and progressively reveals characters at a configurable speed.
//
// Returns the currently-visible substring + a cursor blink state.
// =============================================================================

interface UseTypewriterOptions {
  /** Characters per tick (default: 2) */
  charsPerTick?: number;
  /** Milliseconds between ticks (default: 16 — roughly 60fps) */
  tickInterval?: number;
  /** Start typing from this offset (default: 0) */
  initialOffset?: number;
}

export function useTypewriter(
  target: string,
  options: UseTypewriterOptions = {}
) {
  const { charsPerTick = 2, tickInterval = 16, initialOffset = 0 } = options;

  const [displayed, setDisplayed] = useState(target.slice(0, initialOffset));
  const [cursorVisible, setCursorVisible] = useState(true);
  const offsetRef = useRef(initialOffset);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  // Sync: when target shrinks or jumps (e.g. new platform reset), snap
  useEffect(() => {
    if (target.length < offsetRef.current) {
      offsetRef.current = 0;
      setDisplayed("");
    }
  }, [target]);

  // Animate: progressively catch up to target
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    const animate = (now: number) => {
      if (now - lastTickRef.current >= tickInterval) {
        lastTickRef.current = now;

        const current = offsetRef.current;
        const next = Math.min(current + charsPerTick, target.length);

        if (next !== current) {
          offsetRef.current = next;
          setDisplayed(target.slice(0, next));
        }
      }

      if (offsetRef.current < target.length) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    if (offsetRef.current < target.length) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, charsPerTick, tickInterval]);

  // Blink cursor
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  const isTyping = offsetRef.current < target.length;

  const skipToEnd = useCallback(() => {
    offsetRef.current = target.length;
    setDisplayed(target);
    cancelAnimationFrame(rafRef.current);
  }, [target]);

  return { displayed, cursorVisible, isTyping, skipToEnd };
}

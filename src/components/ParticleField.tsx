"use client";

import { useMemo } from "react";

// =============================================================================
// ParticleField — ambient floating particles for atmosphere
// =============================================================================

interface Particle {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

const COLORS = [
  "rgba(139, 92, 246, 0.4)",
  "rgba(6, 182, 212, 0.3)",
  "rgba(217, 70, 239, 0.3)",
  "rgba(255, 255, 255, 0.15)",
];

export function ParticleField() {
  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      arr.push({
        id: i,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.4 + 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    return arr;
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: "-10px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

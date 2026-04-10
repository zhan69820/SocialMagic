export function getScoreColor(score: number): string {
  if (score >= 90) return "text-amber-400";
  if (score >= 75) return "text-violet-400";
  if (score >= 60) return "text-gray-400";
  return "text-gray-600";
}

export function getScoreGlow(score: number): string {
  if (score >= 90) return "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]";
  if (score >= 75) return "drop-shadow-[0_0_6px_rgba(139,92,246,0.4)]";
  return "";
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "传奇品质";
  if (score >= 75) return "优质文案";
  if (score >= 60) return "合格出品";
  return "初稿";
}

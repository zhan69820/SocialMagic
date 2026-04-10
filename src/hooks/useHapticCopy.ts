"use client";

// =============================================================================
// useHapticCopy — clipboard copy with haptic vibration on mobile
// =============================================================================

export function useHapticCopy() {
  async function copyWithHaptic(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);

      // Vibrate on supported devices (mobile)
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(15);
      }

      return true;
    } catch {
      return false;
    }
  }

  return copyWithHaptic;
}

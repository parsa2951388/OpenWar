/**
 * Device-pixel-ratio used by the WebGL renderer for its backing store and all
 * screen↔world math. Coarse-pointer devices are capped at 1.5x to reduce GPU
 * fragment work on mobile. Desktop stays capped at 2x.
 *
 * Every renderer call site that previously read `window.devicePixelRatio`
 * must go through this so the canvas size, camera math, and text scaling stay
 * on the same coordinate system.
 */
export function renderDpr(): number {
  const coarsePointer =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches
      : typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
  const maxDpr = coarsePointer ? 1.5 : 2;
  return Math.min(window.devicePixelRatio || 1, maxDpr);
}

/**
 * Device-pixel-ratio used by the WebGL renderer for its backing store and all
 * screen↔world math. Desktop rendering is capped at 2x; touch-first devices
 * use 1.5x to reduce fragment work on mobile GPUs while keeping the map crisp.
 *
 * Every renderer call site that previously read `window.devicePixelRatio`
 * must go through this so the canvas size, camera math, and text scaling stay
 * on the same coordinate system.
 */
const MOBILE_DPR_CAP = 1.5;
const DESKTOP_DPR_CAP = 2;
const HAS_COARSE_POINTER =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

export function renderDpr(): number {
  const cap = HAS_COARSE_POINTER ? MOBILE_DPR_CAP : DESKTOP_DPR_CAP;
  return Math.min(window.devicePixelRatio || DESKTOP_DPR_CAP, cap);
}

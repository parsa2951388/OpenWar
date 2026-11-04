/**
 * Device-pixel-ratio used by the WebGL renderer for its backing store and all
 * screen↔world math. Pixel work grows with the square of this value, so older
 * Android phones get a lower cap while desktop remains sharp at up to 2x.
 */
const DESKTOP_DPR_CAP = 2;
const TOUCH_DPR_CAP = 1.5;
const ANDROID_DPR_CAP = 1.25;
const LOW_END_ANDROID_DPR_CAP = 1.1;

type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };

const browserNavigator =
  typeof navigator === "undefined"
    ? null
    : (navigator as NavigatorWithDeviceMemory);

const HAS_COARSE_POINTER =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

const IS_ANDROID = /Android/i.test(browserNavigator?.userAgent ?? "");
const DEVICE_MEMORY_GB = browserNavigator?.deviceMemory ?? 0;
const HARDWARE_CONCURRENCY = browserNavigator?.hardwareConcurrency ?? 0;
const IS_LOW_END_ANDROID =
  IS_ANDROID &&
  ((DEVICE_MEMORY_GB > 0 && DEVICE_MEMORY_GB <= 4) ||
    (HARDWARE_CONCURRENCY > 0 && HARDWARE_CONCURRENCY <= 4));

export function renderDpr(): number {
  if (typeof window === "undefined") return 1;

  const cap = !HAS_COARSE_POINTER
    ? DESKTOP_DPR_CAP
    : IS_ANDROID
      ? IS_LOW_END_ANDROID
        ? LOW_END_ANDROID_DPR_CAP
        : ANDROID_DPR_CAP
      : TOUCH_DPR_CAP;

  return Math.min(window.devicePixelRatio || cap, cap);
}

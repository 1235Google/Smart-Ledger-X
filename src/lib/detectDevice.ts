export type DeviceType = "Desktop" | "Mobile" | "Tablet" | "TV" | "Wearable" | "Unknown";

/**
 * Unit Test Case Verification List:
 * 1. Windows desktop UA -> "Desktop" (BUG FIX: removed unreliable "Laptop" guess, replaced with formFactors-based detection)
 * 2. macOS desktop UA -> "Desktop"
 * 3. ChromeOS UA -> "Desktop"
 * 4. Android mobile UA -> "Mobile"
 * 5. iPad UA -> "Tablet"
 * 6. Unmatched UA / unknown -> "Unknown" (never "Laptop")
 */
export async function detectDeviceType(): Promise<DeviceType> {
  if (typeof window === 'undefined') return 'Unknown';

  try {
    const nav = navigator as any;
    if (nav?.userAgentData && typeof nav.userAgentData.getHighEntropyValues === 'function') {
      try {
        const hints = await nav.userAgentData.getHighEntropyValues(["formFactors"]);
        const formFactors = hints?.formFactors;
        if (Array.isArray(formFactors) && formFactors.length > 0) {
          const ff = formFactors[0].toLowerCase();
          if (ff.includes('desktop')) return 'Desktop';
          if (ff.includes('mobile')) return 'Mobile';
          if (ff.includes('tablet')) return 'Tablet';
          if (ff.includes('xr') || ff.includes('watch') || ff.includes('wearable')) return 'Wearable';
          if (ff.includes('tv')) return 'TV';
        }
      } catch (e) {
        // Fallback if high entropy values fails
      }
    }
  } catch (e) {}

  return detectDeviceTypeSync(navigator.userAgent, window.innerWidth, window.matchMedia);
}

export function detectDeviceTypeSync(
  userAgent: string,
  width: number = 1024,
  matchMediaFn = (q: string) => (typeof window !== 'undefined' ? window.matchMedia(q) : { matches: false })
): DeviceType {
  const ua = userAgent || '';

  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  if (nav?.userAgentData?.mobile === true || /Mobi|Android|iPhone|iPod/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
      return 'Tablet';
    }
    return 'Mobile';
  }

  const isTouch = typeof window !== 'undefined' && ((window.navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window);
  let isCoarse = false;
  try {
    if (matchMediaFn) {
      isCoarse = matchMediaFn('(pointer: coarse)').matches;
    }
  } catch (e) {}

  if (
    (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) ||
    (isTouch && isCoarse && width >= 600 && width <= 1400)
  ) {
    return 'Tablet';
  }

  // BUG FIX: removed unreliable "Laptop" guess, replaced with formFactors-based detection
  if (/Windows|Macintosh|Mac OS X|Linux|CrOS|ChromeOS/i.test(ua)) {
    return 'Desktop';
  }

  return 'Unknown';
}

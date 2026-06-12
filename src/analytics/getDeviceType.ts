import { PageViewDevice } from '../types';
import { isBrowser } from '../utils/ssrSafe';

const MOBILE_UA_PATTERN =
  /android|webos|iphone|ipad|ipod|blackberry|bb\d+|meego|iemobile|opera m(ob|in)i|windows phone|mobile/i;

/**
 * Detects the visitor's device class from the user agent.
 * Matches the device enum accepted by the DashTrack analytics engine
 * ('mobile' | 'desktop' | 'unknown'); the backend coerces anything
 * else to 'unknown'.
 *
 * SSR-safe: returns 'unknown' outside the browser.
 */
export function getDeviceType(): PageViewDevice {
  if (!isBrowser() || typeof navigator === 'undefined') return 'unknown';

  try {
    const ua = navigator.userAgent || '';
    if (!ua) return 'unknown';
    return MOBILE_UA_PATTERN.test(ua) ? 'mobile' : 'desktop';
  } catch {
    return 'unknown';
  }
}

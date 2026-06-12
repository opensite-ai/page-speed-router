import { useRef } from 'react';
import {
  PageViewAnalyticsOptions,
  PageViewAnalyticsPayload,
} from '../types';
import { getDeviceType } from './getDeviceType';
import { usePageViews } from './usePageViews';

const DEFAULT_API_BASE_URL = 'https://api.dashtrack.com';
const ENDPOINT_PATH = '/website_page_views';

/**
 * Pages are stored under canonical no-trailing-slash slugs ('/about'), but
 * remain reachable at '/about/' — normalize so attribution always matches.
 */
function normalizePathname(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.replace(/\/+$/, '') || '/';
  }
  return path;
}

/**
 * Fire-and-forget delivery. Analytics must never break the host site, so
 * every failure mode (no fetch, network error, non-2xx) is swallowed.
 * `keepalive` lets in-flight requests survive a full page unload.
 */
function sendPageView(
  apiBaseUrl: string,
  payload: PageViewAnalyticsPayload
): void {
  try {
    if (typeof fetch !== 'function') return;

    fetch(`${apiBaseUrl.replace(/\/+$/, '')}${ENDPOINT_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The endpoint requires the payload nested under `website_page_view`.
      // Nest explicitly rather than relying on Rails wrap_parameters.
      body: JSON.stringify({ website_page_view: payload }),
      keepalive: true,
      credentials: 'omit',
      mode: 'cors',
    }).catch(() => undefined);
  } catch {
    // Never propagate analytics failures.
  }
}

/**
 * Hook that reports page views to the DashTrack analytics engine
 * (`POST /website_page_views`): one for the initial load, then one per
 * client-side navigation.
 *
 * Opt-in: consumers that never call this hook are completely unaffected
 * (tree-shaken away). No-ops during SSR, when `enabled` is false, or when
 * `websiteToken` is absent.
 *
 * The visitor IP is intentionally not sent — the backend derives it from
 * the request. `traffic_source` defaults to `document.referrer`.
 *
 * @example
 * ```tsx
 * usePageViewAnalytics({ websiteToken: website.token });
 * ```
 */
export function usePageViewAnalytics(options: PageViewAnalyticsOptions): void {
  const {
    websiteToken,
    apiBaseUrl = DEFAULT_API_BASE_URL,
    category = 'webpage',
    enabled = true,
    transformPayload,
  } = options;

  // Latest values without re-subscribing the underlying listeners.
  const optionsRef = useRef({ websiteToken, apiBaseUrl, category, transformPayload });
  optionsRef.current = { websiteToken, apiBaseUrl, category, transformPayload };

  usePageViews(
    (view) => {
      const current = optionsRef.current;
      if (!current.websiteToken) return;

      const payload: PageViewAnalyticsPayload = {
        path: normalizePathname(view.path),
        // IMPORTANT: the wire param is named website_id, but the analytics
        // endpoint resolves it via websites.token (the UUID token), NOT the
        // numeric websites.id.
        website_id: current.websiteToken,
        category: current.category,
        device: getDeviceType(),
        traffic_source:
          typeof document !== 'undefined' && document.referrer
            ? document.referrer
            : undefined,
      };

      const finalPayload = current.transformPayload
        ? current.transformPayload(payload, view)
        : payload;

      if (!finalPayload) return;

      sendPageView(current.apiBaseUrl, finalPayload);
    },
    { enabled: Boolean(enabled && websiteToken) }
  );
}

/**
 * Declarative wrapper around `usePageViewAnalytics`. Renders nothing.
 * Drop it anywhere in the tree (inside or outside RouterProvider):
 *
 * @example
 * ```tsx
 * <RouterProvider>
 *   <PageViewAnalytics websiteToken={website.token} />
 *   <App />
 * </RouterProvider>
 * ```
 */
export function PageViewAnalytics(options: PageViewAnalyticsOptions): null {
  usePageViewAnalytics(options);
  return null;
}

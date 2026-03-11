import { useState, useEffect } from 'react';
import { UrlState } from '../types';
import { ssrSafe, isBrowser } from '../utils/ssrSafe';

/**
 * Default URL state for SSR environments
 */
const DEFAULT_URL: UrlState = {
  href: '',
  origin: '',
  protocol: 'https:',
  host: '',
  hostname: '',
  port: '',
  pathname: '/',
  search: '',
  hash: '',
};

/**
 * Hook that provides current URL information
 * Works outside of RouterProvider - uses browser APIs directly
 * SSR-safe with appropriate defaults
 *
 * @returns Current URL state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { pathname, search, hash } = useUrl();
 *
 *   return (
 *     <div>
 *       Current path: {pathname}
 *       Query: {search}
 *       Hash: {hash}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUrl(): UrlState {
  const [url, setUrl] = useState<UrlState>(() =>
    ssrSafe(
      () => ({
        href: window.location.href,
        origin: window.location.origin,
        protocol: window.location.protocol,
        host: window.location.host,
        hostname: window.location.hostname,
        port: window.location.port,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      }),
      DEFAULT_URL
    )
  );

  useEffect(() => {
    if (!isBrowser()) return;

    const updateUrl = () => {
      setUrl({
        href: window.location.href,
        origin: window.location.origin,
        protocol: window.location.protocol,
        host: window.location.host,
        hostname: window.location.hostname,
        port: window.location.port,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
    };

    // Initial sync after hydration
    updateUrl();

    // Listen for navigation events
    window.addEventListener('popstate', updateUrl);
    window.addEventListener('hashchange', updateUrl);

    // Custom event for programmatic navigation
    const handleRouteChange = () => updateUrl();
    window.addEventListener('routechange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', updateUrl);
      window.removeEventListener('hashchange', updateUrl);
      window.removeEventListener('routechange', handleRouteChange);
    };
  }, []);

  return url;
}

/**
 * Hook that provides just the current pathname
 * Convenience wrapper around useUrl
 *
 * @returns Current pathname
 */
export function usePathname(): string {
  const { pathname } = useUrl();
  return pathname;
}

/**
 * Hook that provides query string parameters as an object
 * Convenience wrapper around useUrl
 *
 * @returns Parsed query parameters
 */
export function useSearchParams(): Record<string, string> {
  const { search } = useUrl();
  const params: Record<string, string> = {};

  if (isBrowser() && search) {
    const searchParams = new URLSearchParams(search);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
  }

  return params;
}

/**
 * Hook that provides the current hash (without #)
 * Convenience wrapper around useUrl
 *
 * @returns Current hash value
 */
export function useHash(): string {
  const { hash } = useUrl();
  return hash.replace(/^#/, '');
}
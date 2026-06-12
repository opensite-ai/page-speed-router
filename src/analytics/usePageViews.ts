import { useEffect, useRef } from 'react';
import { PageView, UsePageViewsOptions } from '../types';
import { isBrowser } from '../utils/ssrSafe';

/**
 * Hook that observes page views: fires once for the initial load, then on
 * every client-side navigation (programmatic `routechange` and browser
 * back/forward `popstate`).
 *
 * Analytics-backend agnostic — pair it with any tracking call. For the
 * DashTrack analytics engine, use `usePageViewAnalytics` /
 * `<PageViewAnalytics />` instead, which are built on this hook.
 *
 * Consecutive events for the same pathname are deduped: `navigateTo`
 * dispatches both `popstate` and `routechange` for a single navigation, and
 * hash-only changes keep the same pathname — neither produces a duplicate
 * page view.
 *
 * Works outside of RouterProvider and is SSR-safe (no-ops on the server).
 *
 * @example
 * ```tsx
 * usePageViews(({ path, isInitial }) => {
 *   myAnalytics.track('page_view', { path, isInitial });
 * });
 * ```
 */
export function usePageViews(
  onPageView: (view: PageView) => void,
  options: UsePageViewsOptions = {}
): void {
  const { enabled = true } = options;

  // Keep the latest callback without re-subscribing listeners on each render.
  const callbackRef = useRef(onPageView);
  callbackRef.current = onPageView;

  // Survives re-runs of the effect so toggling `enabled` or remounting the
  // effect never double-fires the current path.
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !isBrowser()) return;

    const track = (isInitial: boolean) => {
      const path = window.location.pathname;
      if (lastPathRef.current === path) return;

      const previousPath = lastPathRef.current;
      lastPathRef.current = path;
      callbackRef.current({ path, previousPath, isInitial });
    };

    track(true);

    const handleNavigation = () => track(false);
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('routechange', handleNavigation);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('routechange', handleNavigation);
    };
  }, [enabled]);
}

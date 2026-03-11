import { useCallback, useContext } from 'react';
import { NavigationAPI, NavigateOptions } from '../types';
import { scrollToAnchor, scrollToTop } from '../utils/scrollToAnchor';
import { isBrowser } from '../utils/ssrSafe';
import { RouterContext } from '../context/RouterContext';

/**
 * Hook that provides navigation functions
 * Works outside of RouterProvider - uses browser APIs directly
 *
 * @returns Navigation API with navigateTo, replace, and reload functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { navigateTo, replace, reload } = useNavigation();
 *
 *   const handleClick = () => {
 *     navigateTo({ path: '/about' });
 *   };
 *
 *   const handleAnchorClick = () => {
 *     navigateTo({ path: '/blog', anchor: 'comments' });
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleClick}>Go to About</button>
 *       <button onClick={handleAnchorClick}>Go to Blog Comments</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useNavigation(): NavigationAPI {
  const context = useContext(RouterContext);
  const scrollBehavior = context?.scrollBehavior || 'smooth';

  const navigateTo = useCallback(
    (options: NavigateOptions | string) => {
      if (!isBrowser()) return;

      // Handle string shorthand
      const navOptions: NavigateOptions =
        typeof options === 'string' ? { path: options } : options;

      const {
        path,
        anchor,
        replace = false,
        smooth = scrollBehavior === 'smooth',
        state,
      } = navOptions;

      // Handle anchor-only navigation on same page
      if (!path && anchor) {
        scrollToAnchor(anchor, smooth);
        return;
      }

      // Build full URL
      let fullPath = path;
      if (anchor) {
        fullPath = `${path}#${anchor}`;
      }

      // Check if it's the same path (anchor navigation only)
      const currentPath = window.location.pathname;
      const currentHash = window.location.hash;
      const newHash = anchor ? `#${anchor}` : '';

      if (currentPath === path && currentHash !== newHash) {
        // Same path, different anchor - just update hash and scroll
        window.history[replace ? 'replaceState' : 'pushState'](
          state || window.history.state,
          '',
          fullPath
        );

        if (anchor) {
          scrollToAnchor(anchor, smooth);
        }

        // Dispatch custom event
        window.dispatchEvent(
          new CustomEvent('routechange', { detail: { path: fullPath } })
        );
        return;
      }

      // Update history
      if (replace) {
        window.history.replaceState(state || null, '', fullPath);
      } else {
        window.history.pushState(state || null, '', fullPath);
      }

      // Dispatch events to trigger updates
      window.dispatchEvent(new PopStateEvent('popstate', { state }));
      window.dispatchEvent(
        new CustomEvent('routechange', { detail: { path: fullPath } })
      );

      // Handle scrolling
      if (anchor) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => scrollToAnchor(anchor, smooth), 0);
      } else if (currentPath !== path) {
        // Scroll to top on regular navigation (different page)
        scrollToTop(smooth);
      }
    },
    [scrollBehavior]
  );

  const replace = useCallback(
    (path: string) => {
      navigateTo({ path, replace: true });
    },
    [navigateTo]
  );

  const reload = useCallback(() => {
    if (!isBrowser()) return;
    window.location.reload();
  }, []);

  return { navigateTo, replace, reload };
}

/**
 * Hook that provides a simple navigation function
 * Convenience wrapper around useNavigation
 *
 * @returns Navigate function
 */
export function useNavigate() {
  const { navigateTo } = useNavigation();
  return navigateTo;
}

/**
 * Hook that provides a function to update query parameters
 *
 * @returns Function to update query params
 */
export function useUpdateSearchParams() {
  const { navigateTo } = useNavigation();

  return useCallback(
    (params: Record<string, string | null>, replace = false) => {
      if (!isBrowser()) return;

      const currentParams = new URLSearchParams(window.location.search);

      // Update or remove params
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          currentParams.delete(key);
        } else {
          currentParams.set(key, value);
        }
      });

      const search = currentParams.toString();
      const newPath = `${window.location.pathname}${search ? `?${search}` : ''}`;

      navigateTo({ path: newPath, replace });
    },
    [navigateTo]
  );
}
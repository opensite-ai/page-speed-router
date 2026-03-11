import { useMemo } from 'react';
import { useUrl } from './useUrl';
import { matchPath } from '../utils/matchPath';
import { PathMatch } from '../types';

/**
 * Hook that tests if the current path matches a pattern
 *
 * @param pattern - Route pattern to match against
 * @param exact - Whether to require an exact match (default: false)
 * @returns Match result with params
 *
 * @example
 * ```tsx
 * function BlogSection() {
 *   const match = useRouteMatch('/blog/:slug');
 *
 *   if (match.isMatch) {
 *     return <BlogPost slug={match.params.slug} />;
 *   }
 *
 *   return <BlogList />;
 * }
 * ```
 */
export function useRouteMatch(pattern: string, exact: boolean = false): PathMatch {
  const { pathname } = useUrl();

  return useMemo(() => {
    return matchPath(pathname, pattern, exact);
  }, [pathname, pattern, exact]);
}

/**
 * Hook that checks if a route is currently active
 * Convenience wrapper around useRouteMatch
 *
 * @param pattern - Route pattern to check
 * @param exact - Whether to require an exact match
 * @returns Boolean indicating if route is active
 *
 * @example
 * ```tsx
 * function NavLink({ to, children }) {
 *   const isActive = useIsActive(to);
 *
 *   return (
 *     <a
 *       href={to}
 *       className={isActive ? 'active' : ''}
 *     >
 *       {children}
 *     </a>
 *   );
 * }
 * ```
 */
export function useIsActive(pattern: string, exact: boolean = false): boolean {
  const match = useRouteMatch(pattern, exact);
  return match.isMatch;
}

/**
 * Hook that matches multiple patterns and returns the first match
 *
 * @param patterns - Array of route patterns
 * @returns First matching pattern or null
 *
 * @example
 * ```tsx
 * function ContentArea() {
 *   const match = useMultiMatch([
 *     '/blog/:slug',
 *     '/products/:id',
 *     '/about'
 *   ]);
 *
 *   if (match?.path.startsWith('/blog')) {
 *     return <BlogPost />;
 *   }
 *   // ...
 * }
 * ```
 */
export function useMultiMatch(
  patterns: Array<{ pattern: string; exact?: boolean }>
): PathMatch | null {
  const { pathname } = useUrl();

  return useMemo(() => {
    for (const { pattern, exact = false } of patterns) {
      const match = matchPath(pathname, pattern, exact);
      if (match.isMatch) {
        return match;
      }
    }
    return null;
  }, [pathname, patterns]);
}
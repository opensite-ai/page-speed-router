import { useContext, useMemo } from 'react';
import { RouterContext } from '../context/RouterContext';
import { RouteParams } from '../types';
import { useUrl } from './useUrl';
import { matchPath } from '../utils/matchPath';
import { parseQueryString, mergeParams } from '../utils/parseParams';

/**
 * Hook that extracts route parameters from the current URL
 * Requires RouterProvider with defined routes
 *
 * @param includeQuery - Whether to include query string parameters (default: false)
 * @returns Route parameters object
 *
 * @example
 * ```tsx
 * // With route pattern: '/blog/:slug'
 * // Current URL: '/blog/hello-world?page=2'
 *
 * function BlogPost() {
 *   const params = useParams(); // { slug: 'hello-world' }
 *   const allParams = useParams(true); // { slug: 'hello-world', page: '2' }
 *
 *   return <div>Post: {params.slug}</div>;
 * }
 * ```
 */
export function useParams(includeQuery: boolean = false): RouteParams {
  const context = useContext(RouterContext);
  const { pathname, search } = useUrl();

  return useMemo(() => {
    // Base case - no context or routes
    if (!context || !context.routes || context.routes.length === 0) {
      if (includeQuery && search) {
        return parseQueryString(search);
      }
      return {};
    }

    const routes = context.routes;
    let routeParams: RouteParams = {};

    // Find matching route
    for (const route of routes) {
      const match = matchPath(pathname, route.path, route.exact);
      if (match.isMatch) {
        routeParams = match.params;
        break;
      }
    }

    // Include query params if requested
    if (includeQuery && search) {
      const queryParams = parseQueryString(search);
      return mergeParams(routeParams, queryParams);
    }

    return routeParams;
  }, [context, pathname, search, includeQuery]);
}

/**
 * Hook that extracts a single route parameter
 * Convenience wrapper around useParams
 *
 * @param paramName - Name of the parameter to extract
 * @returns Parameter value or undefined
 *
 * @example
 * ```tsx
 * function BlogPost() {
 *   const slug = useParam('slug');
 *   return <div>Post: {slug}</div>;
 * }
 * ```
 */
export function useParam(paramName: string): string | undefined {
  const params = useParams();
  return params[paramName];
}

/**
 * Hook that provides both route and query parameters separately
 *
 * @returns Object with route and query parameters
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { routeParams, queryParams } = useAllParams();
 *
 *   return (
 *     <div>
 *       Route: {JSON.stringify(routeParams)}
 *       Query: {JSON.stringify(queryParams)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAllParams(): {
  routeParams: RouteParams;
  queryParams: Record<string, string>;
} {
  const context = useContext(RouterContext);
  const { pathname, search } = useUrl();

  return useMemo(() => {
    let routeParams: RouteParams = {};

    // Extract route params if routes are defined
    if (context?.routes) {
      for (const route of context.routes) {
        const match = matchPath(pathname, route.path, route.exact);
        if (match.isMatch) {
          routeParams = match.params;
          break;
        }
      }
    }

    // Extract query params
    const queryParams = search ? parseQueryString(search) : {};

    return { routeParams, queryParams };
  }, [context, pathname, search]);
}
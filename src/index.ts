/**
 * @page-speed/router
 * Lightweight SSR-compatible routing for the PageSpeed ecosystem
 */

// Context & Provider
export { RouterProvider } from './context/RouterProvider';
export { RouterContext } from './context/RouterContext';

// Core Hooks
export {
  useUrl,
  usePathname,
  useSearchParams,
  useHash,
} from './hooks/useUrl';

export {
  useNavigation,
  useNavigate,
  useUpdateSearchParams,
} from './hooks/useNavigation';

export {
  useGoBack,
  useBack,
  useGoForward,
} from './hooks/useGoBack';

export {
  useParams,
  useParam,
  useAllParams,
} from './hooks/useParams';

export {
  useRouteMatch,
  useIsActive,
  useMultiMatch,
} from './hooks/useRouteMatch';

// Utilities
export {
  scrollToAnchor,
  scrollToTop,
  getScrollPosition,
} from './utils/scrollToAnchor';

export {
  matchPath,
  extractParams,
  findMatchingRoute,
  buildPath,
  normalizePath,
} from './utils/matchPath';

export {
  parseParams,
  serializeParams,
  parseQueryString,
  mergeParams,
  validateParams,
} from './utils/parseParams';

export {
  isBrowser,
  isSSR,
  ssrSafe,
  browserOnly,
  safeWindow,
} from './utils/ssrSafe';

// Types
export type {
  UrlState,
  NavigateOptions,
  NavigationAPI,
  GoBackOptions,
  GoBackAPI,
  RouteParams,
  Route,
  RouterContextValue,
  RouterProviderProps,
  PathMatch,
  ScrollBehavior,
  ScrollOptions,
} from './types';

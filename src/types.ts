// Type definitions for @page-speed/router
import { ReactNode } from 'react';

export interface UrlState {
  href: string;
  origin: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
}

export interface NavigateOptions {
  path: string;
  anchor?: string;
  replace?: boolean;
  smooth?: boolean;
  state?: any;
}

export interface NavigationAPI {
  navigateTo: (options: NavigateOptions | string) => void;
  replace: (path: string) => void;
  reload: () => void;
}

export interface GoBackOptions {
  fallback?: string;
  delta?: number;
}

export interface GoBackAPI {
  goBack: (delta?: number) => void;
  canGoBack: boolean;
}

export type RouteParams = Record<string, string>;

export interface Route {
  path: string;
  exact?: boolean;
}

export interface RouterContextValue {
  routes?: Route[];
  initialPath?: string;
  scrollBehavior?: ScrollBehavior;
  onNavigate?: (path: string) => void;
}

export interface RouterProviderProps {
  children: ReactNode;
  initialPath?: string;
  routes?: Route[];
  scrollBehavior?: ScrollBehavior;
  onNavigate?: (path: string) => void;
}

export interface PathMatch {
  isMatch: boolean;
  params: Record<string, string>;
  path: string;
}

export type ScrollBehavior = 'smooth' | 'auto' | 'instant';

export interface ScrollOptions {
  smooth?: boolean;
  offset?: number;
}

// ─── Analytics (opt-in) ─────────────────────────────────────────────────────

export type PageViewDevice = 'mobile' | 'desktop' | 'unknown';

export interface PageView {
  /** Pathname of the viewed page */
  path: string;
  /** Pathname of the previously viewed page, null for the initial view */
  previousPath: string | null;
  /** True for the first page view after load/hydration */
  isInitial: boolean;
}

export interface UsePageViewsOptions {
  /** Set false to suspend tracking entirely (default true) */
  enabled?: boolean;
}

export interface PageViewAnalyticsPayload {
  path: string;
  /**
   * The website's UUID token (websites.token). The analytics endpoint
   * resolves websites by token even though the wire param is `website_id` —
   * never send the numeric website id here.
   */
  website_id: string;
  category: string;
  device: PageViewDevice;
  traffic_source?: string;
}

export interface PageViewAnalyticsOptions {
  /**
   * The website's UUID token (websites.token), NOT the numeric website id.
   * Tracking no-ops when absent, so consumers without a token are unaffected.
   */
  websiteToken: string | null | undefined;
  /** Analytics API origin (default https://api.dashtrack.com) */
  apiBaseUrl?: string;
  /** Page view category (default 'webpage') */
  category?: string;
  /** Set false to suspend tracking entirely (default true) */
  enabled?: boolean;
  /**
   * Inspect/extend the payload before it is sent, or return null to skip
   * reporting this particular view.
   */
  transformPayload?: (
    payload: PageViewAnalyticsPayload,
    view: PageView
  ) => PageViewAnalyticsPayload | null;
}

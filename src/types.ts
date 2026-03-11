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
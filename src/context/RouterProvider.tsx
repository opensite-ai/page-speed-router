import React, { useEffect, useMemo, useCallback } from 'react';
import { RouterContext } from './RouterContext';
import { RouterProviderProps } from '../types';
import { isBrowser } from '../utils/ssrSafe';

/**
 * RouterProvider component that provides routing context to child components
 * This is optional - many routing hooks work without a provider
 */
export function RouterProvider({
  children,
  initialPath,
  routes = [],
  scrollBehavior = 'smooth',
  onNavigate,
}: RouterProviderProps) {
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      routes,
      initialPath,
      scrollBehavior,
      onNavigate,
    }),
    [routes, initialPath, scrollBehavior, onNavigate]
  );

  // Handle navigation events
  const handleNavigation = useCallback(() => {
    if (!isBrowser() || !onNavigate) return;
    onNavigate(window.location.pathname);
  }, [onNavigate]);

  useEffect(() => {
    if (!isBrowser() || !onNavigate) return;

    // Call onNavigate for initial path if it matches current location
    if (initialPath && window.location.pathname === initialPath) {
      onNavigate(initialPath);
    }

    // Listen for browser navigation events
    const handlePopState = () => {
      handleNavigation();
    };

    // Custom event for programmatic navigation
    const handleRouteChange = (event: CustomEvent) => {
      if (event.detail?.path) {
        onNavigate(event.detail.path);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('routechange', handleRouteChange as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('routechange', handleRouteChange as EventListener);
    };
  }, [initialPath, onNavigate, handleNavigation]);

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}

/**
 * Type guard to check if RouterProvider is being used
 */
export function isRouterProviderAvailable(): boolean {
  if (!isBrowser()) return false;

  // Check if there's a RouterContext in the tree
  try {
    const context = React.useContext(RouterContext);
    return context !== null;
  } catch {
    return false;
  }
}
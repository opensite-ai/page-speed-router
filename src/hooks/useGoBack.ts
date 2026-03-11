import { useCallback, useRef, useEffect } from 'react';
import { GoBackOptions, GoBackAPI } from '../types';
import { useNavigation } from './useNavigation';
import { isBrowser } from '../utils/ssrSafe';

/**
 * Hook that provides safe back navigation with fallback
 *
 * @param options - Configuration options
 * @param options.fallback - Path to navigate to if no history exists (default: '/')
 * @param options.delta - Number of steps to go back (default: -1)
 * @returns Go back API with goBack function and canGoBack flag
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { goBack, canGoBack } = useGoBack({ fallback: '/home' });
 *
 *   return (
 *     <button
 *       onClick={() => goBack()}
 *       disabled={!canGoBack}
 *     >
 *       Go Back
 *     </button>
 *   );
 * }
 * ```
 */
export function useGoBack(options: GoBackOptions = {}): GoBackAPI {
  const { fallback = '/', delta = -1 } = options;
  const { navigateTo } = useNavigation();
  const historyLength = useRef<number>(isBrowser() ? window.history.length : 0);
  const initialLength = useRef<number>(0);

  useEffect(() => {
    if (!isBrowser()) return;

    // Store initial history length
    if (initialLength.current === 0) {
      initialLength.current = window.history.length;
    }

    // Update current length
    historyLength.current = window.history.length;
  }, []);

  // Track if we can go back
  const canGoBack = isBrowser() && window.history.length > initialLength.current;

  const goBack = useCallback(
    (customDelta?: number) => {
      if (!isBrowser()) return;

      const steps = customDelta ?? delta;

      // Check if we have enough history to go back
      if (window.history.length > Math.abs(steps)) {
        try {
          window.history.go(steps);
        } catch (error) {
          console.warn('[page-speed/router] Failed to go back:', error);
          // Fall back to navigation
          navigateTo({ path: fallback, replace: true });
        }
      } else {
        // No sufficient history, use fallback
        navigateTo({ path: fallback, replace: true });
      }
    },
    [delta, fallback, navigateTo]
  );

  return { goBack, canGoBack };
}

/**
 * Hook that provides a simple back function
 * Convenience wrapper around useGoBack
 *
 * @param fallback - Fallback path if no history
 * @returns Go back function
 */
export function useBack(fallback: string = '/') {
  const { goBack } = useGoBack({ fallback });
  return goBack;
}

/**
 * Hook that provides forward navigation
 *
 * @returns Go forward function
 */
export function useGoForward() {
  return useCallback(() => {
    if (!isBrowser()) return;

    try {
      window.history.forward();
    } catch (error) {
      console.warn('[page-speed/router] Failed to go forward:', error);
    }
  }, []);
}
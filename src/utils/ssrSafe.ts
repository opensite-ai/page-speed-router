/**
 * SSR-safe utilities for handling server and client environments
 */

/**
 * Checks if code is running in a browser environment
 */
export const isBrowser = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined';

/**
 * Checks if code is running in a server environment
 */
export const isSSR = (): boolean => !isBrowser();

/**
 * Executes a client-side function if in browser, otherwise returns server value
 * @param clientFn - Function to execute on client
 * @param serverValue - Default value to use on server
 * @returns The result of clientFn on client, serverValue on server
 */
export function ssrSafe<T>(clientFn: () => T, serverValue: T): T {
  return isBrowser() ? clientFn() : serverValue;
}

/**
 * Guards a function to only run in browser environment
 * @param fn - Function to guard
 * @returns A function that only runs in browser
 */
export function browserOnly<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    if (isBrowser()) {
      return fn(...args);
    }
    return undefined;
  };
}

/**
 * Safely access window properties with fallback
 * @param accessor - Function that accesses window property
 * @param fallback - Fallback value if window is undefined
 */
export function safeWindow<T>(accessor: (window: Window) => T, fallback: T): T {
  if (isBrowser() && window) {
    try {
      return accessor(window);
    } catch {
      return fallback;
    }
  }
  return fallback;
}
/**
 * Test utilities for React hook testing
 */

import { type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";

/**
 * Custom render function that wraps components with providers if needed
 */
function customRender(ui: ReactNode, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";

// Override render with our custom version
export { customRender as render };

/**
 * Helper to wait for a specific amount of time
 * Useful for testing debounce/throttle hooks
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to mock matchMedia with specific matches value
 */
export function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/**
 * Helper to create a mock storage event
 */
export function createStorageEvent(
  key: string,
  newValue: string | null,
  storageArea: Storage = localStorage
): StorageEvent {
  return new StorageEvent("storage", {
    key,
    newValue,
    oldValue: null,
    storageArea,
    url: window.location.href,
  });
}

/**
 * Helper to create a mock resize observer entry
 */
export function createResizeObserverEntry(
  target: Element,
  width: number,
  height: number
): ResizeObserverEntry {
  return {
    target,
    contentRect: {
      width,
      height,
      top: 0,
      right: width,
      bottom: height,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    },
    borderBoxSize: [{ blockSize: height, inlineSize: width }],
    contentBoxSize: [{ blockSize: height, inlineSize: width }],
    devicePixelContentBoxSize: [{ blockSize: height, inlineSize: width }],
  };
}


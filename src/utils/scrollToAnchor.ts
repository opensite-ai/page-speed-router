import { isBrowser } from './ssrSafe';

/**
 * Default offset for scroll positioning (in pixels)
 * Provides a small amount of padding from the top of the viewport
 */
const DEFAULT_SCROLL_OFFSET = 20;

/**
 * Smoothly scrolls to an anchor element on the page
 * @param anchor - The ID of the element to scroll to (with or without #)
 * @param smooth - Whether to use smooth scrolling animation
 * @param offset - Offset from the top of the viewport in pixels
 */
export function scrollToAnchor(
  anchor: string,
  smooth: boolean = true,
  offset: number = DEFAULT_SCROLL_OFFSET
): void {
  if (!isBrowser()) return;

  // Remove leading # if present
  const id = anchor.replace(/^#/, '');

  // Try to find the element
  const element = document.getElementById(id);

  if (!element) {
    // Try querySelector as fallback (for complex selectors)
    const fallbackElement = document.querySelector(`[id="${id}"]`);
    if (!fallbackElement) {
      console.warn(`[page-speed/router] Anchor element not found: #${id}`);
      return;
    }
    scrollToElement(fallbackElement as HTMLElement, smooth, offset);
    return;
  }

  scrollToElement(element, smooth, offset);
}

/**
 * Scrolls to a specific element
 * @param element - The element to scroll to
 * @param smooth - Whether to use smooth scrolling
 * @param offset - Offset from the top in pixels
 */
function scrollToElement(
  element: HTMLElement,
  smooth: boolean,
  offset: number
): void {
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  // Perform the scroll
  window.scrollTo({
    top: offsetPosition,
    behavior: smooth ? 'smooth' : 'auto',
  });

  // Update URL hash without jumping
  const id = element.id;
  if (id && window.history.replaceState) {
    // Preserve existing state
    const currentState = window.history.state;
    window.history.replaceState(currentState, '', `#${id}`);
  }

  // Set focus for accessibility (after scroll completes)
  if (smooth) {
    // Wait for smooth scroll to complete (approximate)
    setTimeout(() => {
      element.focus({ preventScroll: true });

      // If element can't receive focus, add tabindex temporarily
      if (document.activeElement !== element) {
        const originalTabIndex = element.getAttribute('tabindex');
        element.setAttribute('tabindex', '-1');
        element.focus({ preventScroll: true });

        // Remove temporary tabindex on blur
        element.addEventListener('blur', () => {
          if (originalTabIndex === null) {
            element.removeAttribute('tabindex');
          } else {
            element.setAttribute('tabindex', originalTabIndex);
          }
        }, { once: true });
      }
    }, 500);
  } else {
    element.focus({ preventScroll: true });
  }
}

/**
 * Scrolls to the top of the page
 * @param smooth - Whether to use smooth scrolling
 */
export function scrollToTop(smooth: boolean = true): void {
  if (!isBrowser()) return;

  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

/**
 * Gets the current scroll position
 * @returns The current Y scroll position
 */
export function getScrollPosition(): number {
  if (!isBrowser()) return 0;
  return window.pageYOffset || document.documentElement.scrollTop || 0;
}
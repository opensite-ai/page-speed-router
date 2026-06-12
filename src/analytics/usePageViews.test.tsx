import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePageViews } from './usePageViews';

function setPath(pathname: string) {
  (window.location as any).pathname = pathname;
}

function dispatchRouteChange(path: string) {
  setPath(path);
  window.dispatchEvent(new CustomEvent('routechange', { detail: { path } }));
}

function dispatchPopState(path: string) {
  setPath(path);
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
}

describe('usePageViews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPath('/');
    (window.location as any).search = '';
    (window.location as any).hash = '';
  });

  it('fires once for the initial page view on mount', () => {
    const onPageView = vi.fn();
    renderHook(() => usePageViews(onPageView));

    expect(onPageView).toHaveBeenCalledTimes(1);
    expect(onPageView).toHaveBeenCalledWith({
      path: '/',
      previousPath: null,
      isInitial: true,
    });
  });

  it('fires on routechange navigation', () => {
    const onPageView = vi.fn();
    renderHook(() => usePageViews(onPageView));

    act(() => {
      dispatchRouteChange('/about');
    });

    expect(onPageView).toHaveBeenCalledTimes(2);
    expect(onPageView).toHaveBeenLastCalledWith({
      path: '/about',
      previousPath: '/',
      isInitial: false,
    });
  });

  it('fires on popstate (browser back/forward)', () => {
    const onPageView = vi.fn();
    renderHook(() => usePageViews(onPageView));

    act(() => {
      dispatchPopState('/menu');
    });

    expect(onPageView).toHaveBeenCalledTimes(2);
    expect(onPageView).toHaveBeenLastCalledWith({
      path: '/menu',
      previousPath: '/',
      isInitial: false,
    });
  });

  it('dedupes the double popstate + routechange dispatched by navigateTo', () => {
    const onPageView = vi.fn();
    renderHook(() => usePageViews(onPageView));

    // useNavigation.navigateTo dispatches BOTH events for a single navigation
    act(() => {
      setPath('/contact');
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
      window.dispatchEvent(
        new CustomEvent('routechange', { detail: { path: '/contact' } })
      );
    });

    // initial + exactly one for /contact
    expect(onPageView).toHaveBeenCalledTimes(2);
  });

  it('does not fire for hash-only changes on the same path', () => {
    const onPageView = vi.fn();
    renderHook(() => usePageViews(onPageView));

    act(() => {
      (window.location as any).hash = '#section1';
      window.dispatchEvent(
        new CustomEvent('routechange', { detail: { path: '/#section1' } })
      );
    });

    expect(onPageView).toHaveBeenCalledTimes(1);
  });

  it('fires again when navigating back to a previously seen path', () => {
    const onPageView = vi.fn();
    renderHook(() => usePageViews(onPageView));

    act(() => {
      dispatchRouteChange('/about');
    });
    act(() => {
      dispatchPopState('/');
    });

    expect(onPageView).toHaveBeenCalledTimes(3);
    expect(onPageView).toHaveBeenLastCalledWith({
      path: '/',
      previousPath: '/about',
      isInitial: false,
    });
  });

  it('does nothing when disabled', () => {
    const onPageView = vi.fn();
    renderHook(() => usePageViews(onPageView, { enabled: false }));

    act(() => {
      dispatchRouteChange('/about');
    });

    expect(onPageView).not.toHaveBeenCalled();
  });

  it('stops listening after unmount', () => {
    const onPageView = vi.fn();
    const { unmount } = renderHook(() => usePageViews(onPageView));

    unmount();

    act(() => {
      dispatchRouteChange('/about');
    });

    expect(onPageView).toHaveBeenCalledTimes(1); // initial only
  });

  it('always invokes the latest callback without re-subscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ cb }: { cb: (view: unknown) => void }) => usePageViews(cb),
      { initialProps: { cb: first } }
    );

    rerender({ cb: second });

    act(() => {
      dispatchRouteChange('/about');
    });

    expect(first).toHaveBeenCalledTimes(1); // initial only
    expect(second).toHaveBeenCalledTimes(1); // the navigation
  });
});

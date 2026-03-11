import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNavigation, useNavigate, useUpdateSearchParams } from './useNavigation';

describe('useNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.location as any).pathname = '/';
    (window.location as any).search = '';
    (window.location as any).hash = '';
  });

  it('should provide navigation functions', () => {
    const { result } = renderHook(() => useNavigation());

    expect(result.current.navigateTo).toBeDefined();
    expect(result.current.replace).toBeDefined();
    expect(result.current.reload).toBeDefined();
  });

  it('should navigate to a new path', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.navigateTo({ path: '/about' });
    });

    expect(window.history.pushState).toHaveBeenCalledWith(
      null,
      '',
      '/about'
    );
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('should navigate with string shorthand', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.navigateTo('/products');
    });

    expect(window.history.pushState).toHaveBeenCalledWith(
      null,
      '',
      '/products'
    );
  });

  it('should navigate with anchor', () => {
    const { result } = renderHook(() => useNavigation());

    const mockElement = document.createElement('div');
    mockElement.id = 'section1';
    const originalGetElementById = document.getElementById;
    document.getElementById = vi.fn().mockReturnValue(mockElement);

    act(() => {
      result.current.navigateTo({ path: '/blog', anchor: 'section1' });
    });

    expect(window.history.pushState).toHaveBeenCalledWith(
      null,
      '',
      '/blog#section1'
    );

    // Note: The actual scrollToAnchor will be called with a timeout
    // so we can't immediately assert on getElementById being called

    // Restore
    document.getElementById = originalGetElementById;
  });

  it('should replace current history entry', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.replace('/new-path');
    });

    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/new-path'
    );
  });

  it('should reload the page', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.reload();
    });

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should handle anchor-only navigation on same page', () => {
    (window.location as any).pathname = '/blog';

    const { result } = renderHook(() => useNavigation());

    const mockElement = document.createElement('div');
    mockElement.id = 'comments';
    document.getElementById = vi.fn().mockReturnValue(mockElement);

    act(() => {
      result.current.navigateTo({ anchor: 'comments' });
    });

    expect(document.getElementById).toHaveBeenCalledWith('comments');
    expect(window.scrollTo).toHaveBeenCalled();
  });
});

describe('useNavigate', () => {
  it('should return navigateTo function', () => {
    const { result } = renderHook(() => useNavigate());

    expect(typeof result.current).toBe('function');

    act(() => {
      result.current({ path: '/test' });
    });

    expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test');
  });
});

describe('useUpdateSearchParams', () => {
  beforeEach(() => {
    (window.location as any).pathname = '/products';
    (window.location as any).search = '?category=electronics';
  });

  it('should update query parameters', () => {
    const { result } = renderHook(() => useUpdateSearchParams());

    act(() => {
      result.current({ sort: 'price' });
    });

    expect(window.history.pushState).toHaveBeenCalledWith(
      null,
      '',
      '/products?category=electronics&sort=price'
    );
  });

  it('should remove query parameters when value is null', () => {
    const { result } = renderHook(() => useUpdateSearchParams());

    act(() => {
      result.current({ category: null });
    });

    expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/products');
  });

  it('should replace history when specified', () => {
    const { result } = renderHook(() => useUpdateSearchParams());

    act(() => {
      result.current({ page: '2' }, true);
    });

    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/products?category=electronics&page=2'
    );
  });
});
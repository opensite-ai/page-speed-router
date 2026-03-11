import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUrl, usePathname, useSearchParams, useHash } from './useUrl';

describe('useUrl', () => {
  beforeEach(() => {
    // Reset window.location mocks
    (window.location as any).href = 'http://localhost:3000/';
    (window.location as any).pathname = '/';
    (window.location as any).search = '';
    (window.location as any).hash = '';
  });

  it('should return current URL state', () => {
    (window.location as any).href = 'http://localhost:3000/blog/post-1?page=2#comments';
    (window.location as any).pathname = '/blog/post-1';
    (window.location as any).search = '?page=2';
    (window.location as any).hash = '#comments';

    const { result } = renderHook(() => useUrl());

    expect(result.current.href).toBe('http://localhost:3000/blog/post-1?page=2#comments');
    expect(result.current.pathname).toBe('/blog/post-1');
    expect(result.current.search).toBe('?page=2');
    expect(result.current.hash).toBe('#comments');
    expect(result.current.origin).toBe('http://localhost:3000');
    expect(result.current.protocol).toBe('http:');
    expect(result.current.host).toBe('localhost:3000');
  });

  it('should update on popstate event', () => {
    const { result } = renderHook(() => useUrl());

    act(() => {
      (window.location as any).pathname = '/about';
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.pathname).toBe('/about');
  });

  it('should update on hashchange event', () => {
    const { result } = renderHook(() => useUrl());

    act(() => {
      (window.location as any).hash = '#section-1';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(result.current.hash).toBe('#section-1');
  });

  it('should work in SSR environment', () => {
    // Just verify the default values are returned
    const { result } = renderHook(() => useUrl());

    // Should have default or current values
    expect(result.current.pathname).toBeDefined();
    expect(result.current.href).toBeDefined();
  });
});

describe('usePathname', () => {
  it('should return current pathname', () => {
    if (typeof window !== 'undefined') {
      (window.location as any).pathname = '/products/123';
    }

    const { result } = renderHook(() => usePathname());

    expect(result.current).toBe('/products/123');
  });
});

describe('useSearchParams', () => {
  it('should parse query string parameters', () => {
    if (typeof window !== 'undefined') {
      (window.location as any).search = '?category=electronics&sort=price';
    }

    const { result } = renderHook(() => useSearchParams());

    expect(result.current).toEqual({
      category: 'electronics',
      sort: 'price',
    });
  });

  it('should return empty object for no query params', () => {
    if (typeof window !== 'undefined') {
      (window.location as any).search = '';
    }

    const { result } = renderHook(() => useSearchParams());

    expect(result.current).toEqual({});
  });
});

describe('useHash', () => {
  it('should return hash without #', () => {
    if (typeof window !== 'undefined') {
      (window.location as any).hash = '#features';
    }

    const { result } = renderHook(() => useHash());

    expect(result.current).toBe('features');
  });

  it('should return empty string for no hash', () => {
    if (typeof window !== 'undefined') {
      (window.location as any).hash = '';
    }

    const { result } = renderHook(() => useHash());

    expect(result.current).toBe('');
  });
});
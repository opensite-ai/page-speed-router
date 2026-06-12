import { render, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  usePageViewAnalytics,
  PageViewAnalytics,
} from './usePageViewAnalytics';
import { getDeviceType } from './getDeviceType';

const WEBSITE_TOKEN = '0a1b2c3d-4e5f-6789-abcd-ef0123456789';

function setPath(pathname: string) {
  (window.location as any).pathname = pathname;
}

function dispatchNavigation(path: string) {
  setPath(path);
  // navigateTo dispatches both events for one navigation
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  window.dispatchEvent(
    new CustomEvent('routechange', { detail: { path } })
  );
}

describe('usePageViewAnalytics', () => {
  const fetchMock = vi.fn(() => Promise.resolve({ ok: true }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    setPath('/');
    (window.location as any).search = '';
    (window.location as any).hash = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function lastRequest() {
    const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as any;
    return { url, init, body: JSON.parse(init.body) };
  }

  it('posts the initial page view to the website_page_views endpoint', () => {
    renderHook(() =>
      usePageViewAnalytics({ websiteToken: WEBSITE_TOKEN })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init, body } = lastRequest();
    expect(url).toBe('https://api.dashtrack.com/website_page_views');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.keepalive).toBe(true);
    expect(init.credentials).toBe('omit');
    // Payload must be explicitly nested — the endpoint requires the
    // website_page_view wrapper key.
    expect(body.website_page_view).toBeDefined();
    expect(body.website_page_view.path).toBe('/');
    // website_id carries the website TOKEN (websites.token), not numeric id
    expect(body.website_page_view.website_id).toBe(WEBSITE_TOKEN);
    expect(body.website_page_view.category).toBe('webpage');
    expect(['mobile', 'desktop', 'unknown']).toContain(
      body.website_page_view.device
    );
  });

  it('posts again on every client-side navigation', () => {
    renderHook(() =>
      usePageViewAnalytics({ websiteToken: WEBSITE_TOKEN })
    );

    act(() => {
      dispatchNavigation('/about');
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lastRequest().body.website_page_view.path).toBe('/about');
  });

  it('does not post when websiteToken is missing', () => {
    renderHook(() => usePageViewAnalytics({ websiteToken: undefined }));
    renderHook(() => usePageViewAnalytics({ websiteToken: null }));
    renderHook(() => usePageViewAnalytics({ websiteToken: '' }));

    act(() => {
      dispatchNavigation('/about');
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not post when disabled', () => {
    renderHook(() =>
      usePageViewAnalytics({ websiteToken: WEBSITE_TOKEN, enabled: false })
    );

    act(() => {
      dispatchNavigation('/about');
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('honors a custom apiBaseUrl, stripping trailing slashes', () => {
    renderHook(() =>
      usePageViewAnalytics({
        websiteToken: WEBSITE_TOKEN,
        apiBaseUrl: 'https://api.staging.example.com/',
      })
    );

    expect(lastRequest().url).toBe(
      'https://api.staging.example.com/website_page_views'
    );
  });

  it('normalizes trailing slashes so paths match canonical page slugs', () => {
    setPath('/about/');
    renderHook(() =>
      usePageViewAnalytics({ websiteToken: WEBSITE_TOKEN })
    );

    expect(lastRequest().body.website_page_view.path).toBe('/about');
  });

  it('does not normalize the root path', () => {
    setPath('/');
    renderHook(() =>
      usePageViewAnalytics({ websiteToken: WEBSITE_TOKEN })
    );

    expect(lastRequest().body.website_page_view.path).toBe('/');
  });

  it('honors a custom category', () => {
    renderHook(() =>
      usePageViewAnalytics({
        websiteToken: WEBSITE_TOKEN,
        category: 'shopping_bag',
      })
    );

    expect(lastRequest().body.website_page_view.category).toBe('shopping_bag');
  });

  it('lets transformPayload extend the payload', () => {
    renderHook(() =>
      usePageViewAnalytics({
        websiteToken: WEBSITE_TOKEN,
        transformPayload: (payload) => ({ ...payload, traffic_source: 'override' }),
      })
    );

    expect(lastRequest().body.website_page_view.traffic_source).toBe('override');
  });

  it('skips the request when transformPayload returns null', () => {
    renderHook(() =>
      usePageViewAnalytics({
        websiteToken: WEBSITE_TOKEN,
        transformPayload: () => null,
      })
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws when fetch rejects', () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('network down')));

    expect(() => {
      renderHook(() => usePageViewAnalytics({ websiteToken: WEBSITE_TOKEN }));
    }).not.toThrow();
  });

  it('never throws when fetch is unavailable', () => {
    vi.stubGlobal('fetch', undefined);

    expect(() => {
      renderHook(() => usePageViewAnalytics({ websiteToken: WEBSITE_TOKEN }));
    }).not.toThrow();
  });
});

describe('PageViewAnalytics component', () => {
  const fetchMock = vi.fn(() => Promise.resolve({ ok: true }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    setPath('/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing and tracks page views', () => {
    const { container } = render(
      <PageViewAnalytics websiteToken={WEBSITE_TOKEN} />
    );

    expect(container.firstChild).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no-ops without a websiteToken', () => {
    render(<PageViewAnalytics websiteToken={undefined} />);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getDeviceType', () => {
  it('returns a valid device enum value', () => {
    expect(['mobile', 'desktop', 'unknown']).toContain(getDeviceType());
  });

  it('detects mobile user agents', () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      configurable: true,
    });

    expect(getDeviceType()).toBe('mobile');

    Object.defineProperty(navigator, 'userAgent', {
      value: original,
      configurable: true,
    });
  });

  it('detects desktop user agents', () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      configurable: true,
    });

    expect(getDeviceType()).toBe('desktop');

    Object.defineProperty(navigator, 'userAgent', {
      value: original,
      configurable: true,
    });
  });
});

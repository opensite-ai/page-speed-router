# @page-speed/router

## Lightweight, SSR-compatible routing for the [OpenSite website platform](https://opensite.ai). Native browser routing with zero dependencies, tree-shakable exports, and < 3KB gzipped.

![Opensite Semantic UI](https://octane.cdn.ing/api/v1/images/transform?url=https://cdn.ing/assets/i/r/293696/32zoxkywq03rohw76y453wyxopbk/banner.png&f=webp)

<br />

[![npm version](https://img.shields.io/npm/v/@page-speed/router?style=for-the-badge)](https://www.npmjs.com/package/@page-speed/router)
[![npm downloads](https://img.shields.io/npm/dm/@page-speed/router?style=for-the-badge)](https://www.npmjs.com/package/@page-speed/router)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge)](./tsconfig.json)
[![Tree-Shakeable](https://img.shields.io/badge/Tree%20Shakeable-Yes-brightgreen?style=for-the-badge)](#tree-shaking)


## Features

- 🚀 **Ultra-lightweight**: < 3KB minified + gzipped
- 🔥 **SSR-safe**: Built for server-side rendering with proper hydration
- 🌲 **Tree-shakable**: Import only what you need
- 🎯 **Native browser APIs**: Uses History API and window.location
- 📦 **Zero dependencies**: Only React as peer dependency
- ⚡ **Performance-first**: Optimized for Core Web Vitals
- 🎨 **TypeScript**: Full type safety
- 🧩 **Modular**: Hooks work independently, provider optional

## Installation

```bash
npm install @page-speed/router
# or
pnpm add @page-speed/router
# or
yarn add @page-speed/router
```

## Quick Start

### Basic Navigation (No Provider Required)

Many hooks work without any provider setup:

```tsx
import { useNavigation, useUrl } from '@page-speed/router';

function App() {
  const { navigateTo } = useNavigation();
  const { pathname } = useUrl();

  return (
    <div>
      <p>Current path: {pathname}</p>
      <button onClick={() => navigateTo('/about')}>
        Go to About
      </button>
    </div>
  );
}
```

### With RouterProvider (For Dynamic Params)

```tsx
import { RouterProvider, useParams } from '@page-speed/router';

const routes = [
  { path: '/' },
  { path: '/blog/:slug' },
  { path: '/products/:category/:id' }
];

function App() {
  return (
    <RouterProvider routes={routes}>
      <BlogPost />
    </RouterProvider>
  );
}

function BlogPost() {
  const { slug } = useParams();
  return <div>Blog post: {slug}</div>;
}
```

## Core Hooks

### `useUrl()`

Get current URL information. Works without RouterProvider.

```tsx
const {
  href,       // Full URL
  pathname,   // Path without query/hash
  search,     // Query string
  hash,       // Hash fragment
  origin,     // Protocol + host
  host,       // Hostname + port
  hostname,   // Just hostname
  port,       // Port number
  protocol    // Protocol (http:, https:)
} = useUrl();
```

### `useNavigation()`

Programmatic navigation. Works without RouterProvider.

```tsx
const { navigateTo, replace, reload } = useNavigation();

// Navigate to path
navigateTo('/about');

// Navigate with options
navigateTo({
  path: '/blog',
  anchor: 'comments',  // Smooth scroll to anchor
  replace: false,      // Use pushState (default)
  smooth: true,        // Smooth scrolling (default)
  state: { from: 'home' }  // History state
});

// Replace current entry
replace('/new-path');

// Reload page
reload();
```

### `useGoBack()`

Safe back navigation with fallback.

```tsx
const { goBack, canGoBack } = useGoBack({
  fallback: '/home'  // Where to go if no history
});

// Go back or fallback
goBack();

// Go back multiple steps
goBack(-2);

// Conditional UI
<button disabled={!canGoBack}>Back</button>
```

### `useParams()`

Extract dynamic route parameters. Requires RouterProvider with routes.

```tsx
// Route: /blog/:slug
// URL: /blog/hello-world

const params = useParams();
// { slug: 'hello-world' }

// Include query params
const allParams = useParams(true);
// { slug: 'hello-world', page: '2' }
```

### `useRouteMatch()`

Check if current path matches a pattern.

```tsx
const match = useRouteMatch('/blog/:slug');

if (match.isMatch) {
  console.log(match.params); // { slug: 'current-slug' }
}
```

## Utility Hooks

### `usePathname()`

```tsx
const pathname = usePathname(); // '/blog/post-1'
```

### `useSearchParams()`

```tsx
const params = useSearchParams();
// URL: /products?category=electronics&sort=price
// Returns: { category: 'electronics', sort: 'price' }
```

### `useHash()`

```tsx
const hash = useHash();
// URL: /blog#comments
// Returns: 'comments' (without #)
```

### `useUpdateSearchParams()`

```tsx
const updateParams = useUpdateSearchParams();

// Add/update params
updateParams({ page: '2', sort: 'date' });

// Remove param
updateParams({ category: null });

// Replace history
updateParams({ page: '3' }, true);
```

## SSR Setup

### Rails Integration

```erb
<!-- customer_websites/chai_index.html.erb -->
<script>
  window.__ROUTER_INITIAL_STATE__ = {
    path: '<%= @initial_path %>',
    params: <%= @initial_params.to_json %>
  };
</script>
<div id="root"></div>
```

```tsx
// Client entry point
import { RouterProvider } from '@page-speed/router';

const initialState = window.__ROUTER_INITIAL_STATE__;

ReactDOM.hydrateRoot(
  document.getElementById('root'),
  <RouterProvider
    initialPath={initialState.path}
    routes={routes}
  >
    <App />
  </RouterProvider>
);
```

### Next.js Integration

```tsx
// _app.tsx
import { RouterProvider } from '@page-speed/router';

export default function App({ Component, pageProps, router }) {
  return (
    <RouterProvider initialPath={router.pathname}>
      <Component {...pageProps} />
    </RouterProvider>
  );
}
```

## Anchor Navigation

Automatic smooth scrolling to anchors:

```tsx
const { navigateTo } = useNavigation();

// Navigate to page and scroll to anchor
navigateTo({
  path: '/docs',
  anchor: 'installation'
});

// Scroll to anchor on current page
navigateTo({ anchor: 'features' });

// Control scroll behavior
navigateTo({
  path: '/about',
  anchor: 'team',
  smooth: false  // Instant scroll
});
```

## Advanced Usage

### Custom Route Matching

```tsx
import { matchPath, buildPath } from '@page-speed/router';

// Match a path
const match = matchPath('/blog/hello', '/blog/:slug');
// { isMatch: true, params: { slug: 'hello' }, path: '/blog/hello' }

// Build a path from pattern
const path = buildPath('/blog/:slug', { slug: 'world' });
// '/blog/world'
```

### Multiple Route Patterns

```tsx
import { useMultiMatch } from '@page-speed/router';

const match = useMultiMatch([
  { pattern: '/blog/:slug' },
  { pattern: '/products/:id' },
  { pattern: '/', exact: true }
]);

if (match?.path.startsWith('/blog')) {
  // Handle blog routes
}
```

### Navigation Events

```tsx
<RouterProvider
  onNavigate={(path) => {
    // Track page views
    analytics.track('page_view', { path });
  }}
>
  <App />
</RouterProvider>
```

## API Reference

### RouterProvider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Child components |
| `initialPath` | `string` | - | Initial path for SSR |
| `routes` | `Route[]` | `[]` | Route patterns for param extraction |
| `scrollBehavior` | `'smooth' \| 'auto'` | `'smooth'` | Default scroll behavior |
| `onNavigate` | `(path: string) => void` | - | Navigation callback |

### Route Object

```tsx
interface Route {
  path: string;    // Pattern like '/blog/:slug'
  exact?: boolean; // Exact match required
}
```

## Performance

- **Bundle Size**: < 3KB minified + gzipped
- **Tree-shaking**: Import individual hooks for smaller bundles
- **No Re-renders**: Optimized context updates
- **Lazy Loading**: Dynamic imports for code splitting
- **60fps Scrolling**: Smooth anchor navigation

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Chrome Android 88+
- Safari iOS 14+

Requires History API and IntersectionObserver support.

## Migration Guide

### From React Router

```tsx
// Before (React Router)
import { useNavigate, useParams } from 'react-router-dom';
const navigate = useNavigate();
navigate('/about');

// After (@page-speed/router)
import { useNavigation, useParams } from '@page-speed/router';
const { navigateTo } = useNavigation();
navigateTo('/about');
```

### From Next.js Router

```tsx
// Before (Next.js)
import { useRouter } from 'next/router';
const router = useRouter();
router.push('/about');

// After (@page-speed/router)
import { useNavigation } from '@page-speed/router';
const { navigateTo } = useNavigation();
navigateTo('/about');
```

## TypeScript

Full TypeScript support with exported types:

```tsx
import type {
  UrlState,
  NavigateOptions,
  RouteParams,
  Route
} from '@page-speed/router';
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

BSD-3-Clause

## Support

- [GitHub Issues](https://github.com/page-speed/router/issues)
- [Documentation](https://github.com/page-speed/router/docs)

---

Built with ❤️ for the PageSpeed ecosystem

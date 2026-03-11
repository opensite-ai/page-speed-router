# API Reference

## Components

### `RouterProvider`

Provider component that supplies routing context to child components. Optional for many hooks.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Child components |
| `initialPath` | `string` | - | Initial path for SSR hydration |
| `routes` | `Route[]` | `[]` | Route patterns for param extraction |
| `scrollBehavior` | `'smooth' \| 'auto' \| 'instant'` | `'smooth'` | Default scroll behavior |
| `onNavigate` | `(path: string) => void` | - | Callback fired on navigation |

#### Example

```tsx
import { RouterProvider } from '@page-speed/router';

const routes = [
  { path: '/', exact: true },
  { path: '/blog/:slug' },
  { path: '/products/:category/:id' }
];

function App() {
  return (
    <RouterProvider
      routes={routes}
      initialPath="/blog/hello"
      scrollBehavior="smooth"
      onNavigate={(path) => console.log('Navigated to:', path)}
    >
      <YourApp />
    </RouterProvider>
  );
}
```

---

## Hooks

### `useUrl()`

Returns current URL information. Works outside RouterProvider.

#### Type Signature

```tsx
function useUrl(): UrlState

interface UrlState {
  href: string;      // Full URL
  origin: string;    // Protocol + host
  protocol: string;  // Protocol (http:, https:)
  host: string;      // Hostname + port
  hostname: string;  // Hostname only
  port: string;      // Port number
  pathname: string;  // Path without query/hash
  search: string;    // Query string with ?
  hash: string;      // Hash fragment with #
}
```

#### Example

```tsx
function CurrentURL() {
  const url = useUrl();

  return (
    <div>
      <p>Path: {url.pathname}</p>
      <p>Query: {url.search}</p>
      <p>Hash: {url.hash}</p>
      <p>Full URL: {url.href}</p>
    </div>
  );
}
```

---

### `useNavigation()`

Provides navigation functions. Works outside RouterProvider.

#### Type Signature

```tsx
function useNavigation(): NavigationAPI

interface NavigationAPI {
  navigateTo: (options: NavigateOptions | string) => void;
  replace: (path: string) => void;
  reload: () => void;
}

interface NavigateOptions {
  path: string;       // Target path
  anchor?: string;    // Anchor ID to scroll to
  replace?: boolean;  // Replace history entry
  smooth?: boolean;   // Smooth scrolling
  state?: any;        // History state
}
```

#### Examples

```tsx
function Navigation() {
  const { navigateTo, replace, reload } = useNavigation();

  return (
    <>
      {/* Simple navigation */}
      <button onClick={() => navigateTo('/about')}>
        About
      </button>

      {/* Navigation with options */}
      <button onClick={() => navigateTo({
        path: '/blog',
        anchor: 'comments',
        smooth: true,
        state: { from: 'home' }
      })}>
        Blog Comments
      </button>

      {/* Replace current entry */}
      <button onClick={() => replace('/new-path')}>
        Replace
      </button>

      {/* Reload page */}
      <button onClick={() => reload()}>
        Reload
      </button>
    </>
  );
}
```

---

### `useGoBack()`

Safe back navigation with fallback support.

#### Type Signature

```tsx
function useGoBack(options?: GoBackOptions): GoBackAPI

interface GoBackOptions {
  fallback?: string;  // Fallback path if no history
  delta?: number;     // Number of steps to go back
}

interface GoBackAPI {
  goBack: (delta?: number) => void;
  canGoBack: boolean;
}
```

#### Example

```tsx
function BackButton() {
  const { goBack, canGoBack } = useGoBack({
    fallback: '/home'
  });

  return (
    <button
      onClick={() => goBack()}
      disabled={!canGoBack}
    >
      Go Back
    </button>
  );
}
```

---

### `useParams()`

Extract route parameters. Requires RouterProvider with defined routes.

#### Type Signature

```tsx
function useParams(includeQuery?: boolean): RouteParams

type RouteParams = Record<string, string>
```

#### Example

```tsx
// Route: /blog/:slug
// URL: /blog/hello-world?page=2

function BlogPost() {
  const params = useParams();        // { slug: 'hello-world' }
  const allParams = useParams(true); // { slug: 'hello-world', page: '2' }

  return <div>Post: {params.slug}</div>;
}
```

---

### `useRouteMatch()`

Check if current path matches a pattern.

#### Type Signature

```tsx
function useRouteMatch(pattern: string, exact?: boolean): PathMatch

interface PathMatch {
  isMatch: boolean;
  params: Record<string, string>;
  path: string;
}
```

#### Example

```tsx
function BlogSection() {
  const match = useRouteMatch('/blog/:slug');

  if (match.isMatch) {
    return <BlogPost slug={match.params.slug} />;
  }

  return <BlogList />;
}
```

---

### `usePathname()`

Returns just the current pathname.

#### Type Signature

```tsx
function usePathname(): string
```

#### Example

```tsx
function CurrentPath() {
  const pathname = usePathname();
  return <p>You are at: {pathname}</p>;
}
```

---

### `useSearchParams()`

Returns query string parameters as an object.

#### Type Signature

```tsx
function useSearchParams(): Record<string, string>
```

#### Example

```tsx
// URL: /products?category=electronics&sort=price

function Filters() {
  const params = useSearchParams();
  // { category: 'electronics', sort: 'price' }

  return (
    <div>
      Category: {params.category}
      Sort: {params.sort}
    </div>
  );
}
```

---

### `useHash()`

Returns current hash without the # symbol.

#### Type Signature

```tsx
function useHash(): string
```

#### Example

```tsx
// URL: /blog#comments

function HashExample() {
  const hash = useHash(); // 'comments'
  return <p>Current section: {hash}</p>;
}
```

---

### `useUpdateSearchParams()`

Update query parameters programmatically.

#### Type Signature

```tsx
function useUpdateSearchParams(): (
  params: Record<string, string | null>,
  replace?: boolean
) => void
```

#### Example

```tsx
function SearchFilters() {
  const updateParams = useUpdateSearchParams();

  return (
    <>
      {/* Add/update param */}
      <button onClick={() => updateParams({ page: '2' })}>
        Next Page
      </button>

      {/* Remove param (set to null) */}
      <button onClick={() => updateParams({ filter: null })}>
        Clear Filter
      </button>

      {/* Replace history */}
      <button onClick={() => updateParams({ sort: 'date' }, true)}>
        Sort by Date
      </button>
    </>
  );
}
```

---

### `useParam()`

Get a single route parameter value.

#### Type Signature

```tsx
function useParam(paramName: string): string | undefined
```

#### Example

```tsx
function ProductPage() {
  const productId = useParam('id');
  return <div>Product ID: {productId}</div>;
}
```

---

### `useAllParams()`

Get both route and query parameters separately.

#### Type Signature

```tsx
function useAllParams(): {
  routeParams: RouteParams;
  queryParams: Record<string, string>;
}
```

#### Example

```tsx
function DetailedParams() {
  const { routeParams, queryParams } = useAllParams();

  return (
    <div>
      <p>Route: {JSON.stringify(routeParams)}</p>
      <p>Query: {JSON.stringify(queryParams)}</p>
    </div>
  );
}
```

---

### `useIsActive()`

Check if a route pattern is currently active.

#### Type Signature

```tsx
function useIsActive(pattern: string, exact?: boolean): boolean
```

#### Example

```tsx
function NavLink({ to, children }) {
  const isActive = useIsActive(to, true);

  return (
    <a
      href={to}
      className={isActive ? 'active' : ''}
    >
      {children}
    </a>
  );
}
```

---

### `useMultiMatch()`

Match against multiple patterns.

#### Type Signature

```tsx
function useMultiMatch(
  patterns: Array<{ pattern: string; exact?: boolean }>
): PathMatch | null
```

#### Example

```tsx
function ContentRouter() {
  const match = useMultiMatch([
    { pattern: '/blog/:slug' },
    { pattern: '/products/:id' },
    { pattern: '/', exact: true }
  ]);

  if (!match) return <NotFound />;

  switch (match.path.split('/')[1]) {
    case 'blog':
      return <BlogPost />;
    case 'products':
      return <Product />;
    default:
      return <Home />;
  }
}
```

---

## Utility Functions

### `matchPath()`

Match a pathname against a pattern.

#### Type Signature

```tsx
function matchPath(
  pathname: string,
  pattern: string,
  exact?: boolean
): PathMatch
```

#### Example

```tsx
const match = matchPath('/blog/hello', '/blog/:slug');
// { isMatch: true, params: { slug: 'hello' }, path: '/blog/hello' }
```

---

### `buildPath()`

Build a path from a pattern and parameters.

#### Type Signature

```tsx
function buildPath(
  pattern: string,
  params: RouteParams
): string
```

#### Example

```tsx
const path = buildPath('/blog/:slug', { slug: 'world' });
// '/blog/world'
```

---

### `scrollToAnchor()`

Scroll to an anchor element.

#### Type Signature

```tsx
function scrollToAnchor(
  anchor: string,
  smooth?: boolean,
  offset?: number
): void
```

#### Example

```tsx
// Smooth scroll to #features with 20px offset
scrollToAnchor('features', true, 20);
```

---

### `parseQueryString()`

Parse a query string into an object.

#### Type Signature

```tsx
function parseQueryString(search: string): Record<string, string>
```

#### Example

```tsx
const params = parseQueryString('?page=2&sort=date');
// { page: '2', sort: 'date' }
```

---

### `serializeParams()`

Serialize an object into a query string.

#### Type Signature

```tsx
function serializeParams(params: Record<string, any>): string
```

#### Example

```tsx
const queryString = serializeParams({ page: 2, sort: 'date' });
// 'page=2&sort=date'
```

---

## SSR Helpers

### `isBrowser()`

Check if code is running in browser.

#### Type Signature

```tsx
function isBrowser(): boolean
```

---

### `isSSR()`

Check if code is running on server.

#### Type Signature

```tsx
function isSSR(): boolean
```

---

### `ssrSafe()`

Execute client code safely with server fallback.

#### Type Signature

```tsx
function ssrSafe<T>(
  clientFn: () => T,
  serverValue: T
): T
```

#### Example

```tsx
const value = ssrSafe(
  () => window.innerWidth,
  1024  // Default for server
);
```
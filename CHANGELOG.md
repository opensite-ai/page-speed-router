# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-10

### Added

#### Core Routing Hooks

- `useUrl()` - Get current URL information (href, pathname, search, hash, origin, host, protocol, port)
- `useNavigation()` - Programmatic navigation with smooth anchor scrolling support
- `useGoBack()` - Safe back navigation with configurable fallback path
- `useParams()` - Extract dynamic route parameters from URL patterns
- `useRouteMatch()` - Check if current path matches a route pattern

#### Utility Hooks

- `usePathname()` - Get current pathname
- `useSearchParams()` - Parse query string into object
- `useHash()` - Get current hash without #
- `useUpdateSearchParams()` - Programmatically update query parameters
- `useParam()` - Get single route parameter value
- `useAllParams()` - Get route and query params separately
- `useIsActive()` - Check if route pattern is currently active
- `useMultiMatch()` - Match against multiple route patterns
- `useNavigate()` - Simplified navigation function
- `useBack()` - Simplified back navigation
- `useGoForward()` - Forward navigation

#### Components

- `RouterProvider` - Optional context provider for dynamic routes and configuration
- Most hooks work without provider (direct browser API access)

#### Utilities

- `matchPath()` - Match paths against route patterns
- `buildPath()` - Build paths from patterns and parameters
- `scrollToAnchor()` - Smooth scroll to anchor elements with offset support
- `scrollToTop()` - Scroll to page top
- `parseQueryString()` - Parse query strings into objects
- `serializeParams()` - Serialize objects to query strings
- `parseParams()` - Extract route params from patterns
- `normalizePath()` - Normalize URL paths
- SSR helper functions (`isBrowser()`, `isSSR()`, `ssrSafe()`, `browserOnly()`)

### Features

- **Ultra-lightweight**: 2.94 KB minified + gzipped
- **SSR-compatible**: Built for server-side rendering with proper hydration
- **Tree-shakable**: Import only what you need
- **Native browser APIs**: Uses History API and window.location
- **Zero dependencies**: Only React as peer dependency
- **TypeScript support**: Full type safety with exported types
- **Smooth scrolling**: Automatic anchor detection and smooth scrolling
- **Rails integration**: Works with Rails 7+ entry points
- **CDN-ready**: UMD build available for CDN deployment

### Performance

- Bundle size: < 3KB gzipped (achieved: 2.94 KB)
- Tree-shakable architecture for optimal bundle sizes
- Optimized for Core Web Vitals
- 60fps smooth scrolling animations
- Memoized route matching for performance
- No unnecessary re-renders

---

## License

[BSD-3-Clause](https://github.com/opensite-ai/page-speed-router/LICENSE) © [OpenSite AI](https://opensite.ai)

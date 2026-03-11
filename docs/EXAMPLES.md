# Examples

## Basic Setup

### Minimal Setup (No Provider)

```tsx
import React from 'react';
import { useNavigation, useUrl } from '@page-speed/router';

function App() {
  const { pathname } = useUrl();
  const { navigateTo } = useNavigation();

  return (
    <div>
      <nav>
        <button onClick={() => navigateTo('/')}>Home</button>
        <button onClick={() => navigateTo('/about')}>About</button>
        <button onClick={() => navigateTo('/blog')}>Blog</button>
      </nav>

      <main>
        <p>Current page: {pathname}</p>
      </main>
    </div>
  );
}
```

### With RouterProvider for Dynamic Routes

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, useParams, useNavigation } from '@page-speed/router';

const routes = [
  { path: '/', exact: true },
  { path: '/blog/:slug' },
  { path: '/products/:category/:id' }
];

function App() {
  return (
    <RouterProvider routes={routes}>
      <Router />
    </RouterProvider>
  );
}

function Router() {
  const { pathname } = useUrl();

  if (pathname.startsWith('/blog/')) {
    return <BlogPost />;
  }
  if (pathname.startsWith('/products/')) {
    return <Product />;
  }
  return <Home />;
}

function BlogPost() {
  const { slug } = useParams();
  return <h1>Blog Post: {slug}</h1>;
}

function Product() {
  const { category, id } = useParams();
  return <h1>Product {id} in {category}</h1>;
}
```

## Navigation Patterns

### Anchor Navigation with Smooth Scrolling

```tsx
import { useNavigation } from '@page-speed/router';

function TableOfContents() {
  const { navigateTo } = useNavigation();

  const sections = [
    { id: 'introduction', title: 'Introduction' },
    { id: 'features', title: 'Features' },
    { id: 'installation', title: 'Installation' },
    { id: 'usage', title: 'Usage' }
  ];

  return (
    <nav className="toc">
      {sections.map(section => (
        <button
          key={section.id}
          onClick={() => navigateTo({
            anchor: section.id,
            smooth: true
          })}
        >
          {section.title}
        </button>
      ))}
    </nav>
  );
}

// The corresponding sections in your content
function Content() {
  return (
    <article>
      <section id="introduction">
        <h2>Introduction</h2>
        <p>...</p>
      </section>

      <section id="features">
        <h2>Features</h2>
        <p>...</p>
      </section>

      <section id="installation">
        <h2>Installation</h2>
        <p>...</p>
      </section>

      <section id="usage">
        <h2>Usage</h2>
        <p>...</p>
      </section>
    </article>
  );
}
```

### Cross-Page Anchor Navigation

```tsx
function BlogList() {
  const { navigateTo } = useNavigation();

  return (
    <div>
      <h2>Recent Posts</h2>

      <article>
        <h3>Understanding React Hooks</h3>
        <p>A deep dive into React hooks...</p>
        <button
          onClick={() => navigateTo({
            path: '/blog/react-hooks',
            anchor: 'comments'
          })}
        >
          View Comments
        </button>
      </article>
    </div>
  );
}
```

### Back Navigation with Fallback

```tsx
import { useGoBack } from '@page-speed/router';

function Header() {
  const { goBack, canGoBack } = useGoBack({
    fallback: '/'
  });

  return (
    <header>
      {canGoBack && (
        <button onClick={() => goBack()}>
          ← Back
        </button>
      )}
      <h1>My App</h1>
    </header>
  );
}
```

## Query Parameters

### Managing Search Filters

```tsx
import { useSearchParams, useUpdateSearchParams } from '@page-speed/router';

function ProductFilters() {
  const searchParams = useSearchParams();
  const updateSearchParams = useUpdateSearchParams();

  const currentCategory = searchParams.category || 'all';
  const currentSort = searchParams.sort || 'relevance';

  return (
    <div className="filters">
      <select
        value={currentCategory}
        onChange={(e) => updateSearchParams({
          category: e.target.value
        })}
      >
        <option value="all">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="books">Books</option>
      </select>

      <select
        value={currentSort}
        onChange={(e) => updateSearchParams({
          sort: e.target.value
        })}
      >
        <option value="relevance">Relevance</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
        <option value="newest">Newest</option>
      </select>

      <button
        onClick={() => updateSearchParams({
          category: null,
          sort: null
        })}
      >
        Clear Filters
      </button>
    </div>
  );
}
```

### Pagination

```tsx
function Pagination({ totalPages }) {
  const searchParams = useSearchParams();
  const updateSearchParams = useUpdateSearchParams();

  const currentPage = parseInt(searchParams.page || '1');

  return (
    <div className="pagination">
      <button
        disabled={currentPage === 1}
        onClick={() => updateSearchParams({
          page: String(currentPage - 1)
        })}
      >
        Previous
      </button>

      <span>Page {currentPage} of {totalPages}</span>

      <button
        disabled={currentPage === totalPages}
        onClick={() => updateSearchParams({
          page: String(currentPage + 1)
        })}
      >
        Next
      </button>
    </div>
  );
}
```

## Active Link Styling

```tsx
import { useIsActive } from '@page-speed/router';

function NavLink({ to, children, exact = false }) {
  const { navigateTo } = useNavigation();
  const isActive = useIsActive(to, exact);

  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        navigateTo(to);
      }}
      className={isActive ? 'nav-link active' : 'nav-link'}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </a>
  );
}

function Navigation() {
  return (
    <nav>
      <NavLink to="/" exact>Home</NavLink>
      <NavLink to="/about">About</NavLink>
      <NavLink to="/blog">Blog</NavLink>
      <NavLink to="/contact">Contact</NavLink>
    </nav>
  );
}
```

## SSR with Rails

### Rails Controller

```ruby
# app/controllers/websites_controller.rb
class WebsitesController < ApplicationController
  def show
    @initial_path = request.path
    @initial_params = extract_route_params(request.path)

    render :show
  end

  private

  def extract_route_params(path)
    # Define your routes
    routes = [
      { pattern: /^\/blog\/(?<slug>[^\/]+)$/ },
      { pattern: /^\/products\/(?<category>[^\/]+)\/(?<id>[^\/]+)$/ }
    ]

    routes.each do |route|
      if match = path.match(route[:pattern])
        return match.named_captures
      end
    end

    {}
  end
end
```

### Rails View

```erb
<!-- app/views/websites/show.html.erb -->
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
    <%= csrf_meta_tags %>

    <script>
      window.__ROUTER_INITIAL_STATE__ = {
        path: '<%= @initial_path %>',
        params: <%= @initial_params.to_json.html_safe %>,
        isSSR: true
      };
    </script>
  </head>

  <body>
    <div id="root">
      <!-- Server-rendered content goes here -->
    </div>

    <%= javascript_include_tag 'application' %>
  </body>
</html>
```

### React Entry Point

```tsx
// app/javascript/application.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@page-speed/router';
import App from './App';

const routes = [
  { path: '/', exact: true },
  { path: '/blog/:slug' },
  { path: '/products/:category/:id' }
];

const initialState = window.__ROUTER_INITIAL_STATE__ || {
  path: '/',
  params: {}
};

const root = document.getElementById('root');

if (initialState.isSSR) {
  // Hydrate server-rendered content
  ReactDOM.hydrateRoot(
    root,
    <RouterProvider
      initialPath={initialState.path}
      routes={routes}
    >
      <App />
    </RouterProvider>
  );
} else {
  // Client-side render
  ReactDOM.createRoot(root).render(
    <RouterProvider routes={routes}>
      <App />
    </RouterProvider>
  );
}
```

## Handling Not Found Pages

```tsx
import { useRouteMatch } from '@page-speed/router';

function App() {
  const homeMatch = useRouteMatch('/', true);
  const aboutMatch = useRouteMatch('/about');
  const blogMatch = useRouteMatch('/blog/:slug');
  const productMatch = useRouteMatch('/products/:category/:id');

  if (homeMatch.isMatch) return <Home />;
  if (aboutMatch.isMatch) return <About />;
  if (blogMatch.isMatch) return <BlogPost {...blogMatch.params} />;
  if (productMatch.isMatch) return <Product {...productMatch.params} />;

  return <NotFound />;
}

function NotFound() {
  const { navigateTo } = useNavigation();

  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <button onClick={() => navigateTo('/')}>
        Go Home
      </button>
    </div>
  );
}
```

## Programmatic Redirects

```tsx
import { useEffect } from 'react';
import { useNavigation, useParams } from '@page-speed/router';

function OldBlogPost() {
  const { navigateTo } = useNavigation();
  const { slug } = useParams();

  useEffect(() => {
    // Redirect old blog URLs to new structure
    const redirectMap = {
      'old-post-1': 'new-post-1',
      'old-post-2': 'new-post-2'
    };

    if (redirectMap[slug]) {
      navigateTo({
        path: `/blog/${redirectMap[slug]}`,
        replace: true // Don't add to history
      });
    }
  }, [slug, navigateTo]);

  return <div>Redirecting...</div>;
}
```

## Analytics Integration

```tsx
import { RouterProvider } from '@page-speed/router';

function App() {
  return (
    <RouterProvider
      routes={routes}
      onNavigate={(path) => {
        // Google Analytics
        if (typeof gtag !== 'undefined') {
          gtag('config', 'GA_MEASUREMENT_ID', {
            page_path: path
          });
        }

        // Custom analytics
        analytics.track('page_view', {
          path,
          timestamp: Date.now(),
          referrer: document.referrer
        });
      }}
    >
      <YourApp />
    </RouterProvider>
  );
}
```

## Scroll Restoration

```tsx
import { useEffect } from 'react';
import { useUrl } from '@page-speed/router';

function ScrollRestoration() {
  const { pathname } = useUrl();

  useEffect(() => {
    // Store scroll position before navigation
    const positions = JSON.parse(
      sessionStorage.getItem('scrollPositions') || '{}'
    );

    return () => {
      positions[pathname] = window.scrollY;
      sessionStorage.setItem(
        'scrollPositions',
        JSON.stringify(positions)
      );
    };
  }, [pathname]);

  useEffect(() => {
    // Restore scroll position after navigation
    const positions = JSON.parse(
      sessionStorage.getItem('scrollPositions') || '{}'
    );

    if (positions[pathname]) {
      window.scrollTo(0, positions[pathname]);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
```
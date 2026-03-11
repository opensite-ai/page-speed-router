Now I have comprehensive context from all the files and external research. Let me compile the complete implementation guide.

---

# OpenSite AI — MVP Implementation Guide: Page Payload System, Rendering Engine & Markdown Library

**Version 1.0 — March 5, 2026**

---

## Table of Contents

1. [Architecture Overview & Decision Summary](#1-architecture-overview)
2. [Phase 1: Page Payload Data Structure & Octane Storage](#phase-1)
3. [Phase 2: `@page-speed/blocks` — The New Rendering Engine](#phase-2)
4. [Phase 3: `@page-speed/markdown` — Markdown-to-JSX Library](#phase-3)
5. [Phase 4: Dynamic Data Feeds (Blog as First Feed)](#phase-4)
6. [Phase 5: `customer-sites` Rails 7 Integration](#phase-5)
7. [Phase 6: End-to-End Wiring & Testing](#phase-6)

---

## 1. Architecture Overview & Decision Summary

### Final Architectural Decisions

**Dynamic Data Strategy (Scenario 1 — Conservative/Opus Approach):** Octane stays fast and CDN-like. It serves page payloads and dedicated feed APIs as separate, independently-cacheable endpoints. The Rust server **never** merges dynamic feed data into page payloads on the fly. Feed resolution is always client-side via a `useFeed` hook in the rendering engine. This provides maximum future flexibility — when dedicated feed APIs are eventually built in Octane for Instagram, reviews, menus, etc., the rendering engine's feed hooks can trivially switch from external API calls to Octane feed endpoints without any architectural changes.

**Storage Strategy (Scenario 2):** Page payloads are stored in Octane's Tigris S3-compatible K/V store (objects ≤128KB sync globally almost instantly). Each page is a JSON document keyed by `websites/{website_id}/pages/{page_id}.json`. Octane serves these via public endpoints with strong ETag caching. Rails/Postgres retains the relational metadata (website → pages, ownership, permissions) but the actual block payload lives in Tigris via Octane.

**Block Identity:** Every block instance in a page payload includes **both** `categoryId` and `blockId`, since block IDs are only unique within a category scope. The import path is deterministically derived as `blocks/{categoryId}/{blockId}` — no lookup needed at render time.

### System Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  @page-speed/blocks (Rendering Engine)               │   │
│  │  ├── BlockRenderer: registry-based, iterates payload │   │
│  │  ├── useFeed hook: calls Octane feed APIs            │   │
│  │  └── @page-speed/markdown: markdown→JSX in feed data │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┬───────────────┘
                  │ page payload              │ feed data
                  ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Octane (Rust/Axum)                                         │
│  ├── GET /pages/{website_id}/{page_id} → Tigris K/V         │
│  ├── GET /feeds/{website_id}/{feed_type}/{feed_id}          │
│  ├── POST /pages/{website_id}/{page_id} (write/update)      │
│  └── Image/Font/Video CDN endpoints (existing)              │
└─────────────────────────────────────────────────────────────┘
                  ▲
                  │ initial HTML + JS bundle
┌─────────────────────────────────────────────────────────────┐
│  customer-sites (Rails 7)                                    │
│  ├── Domain lookup → website_id                              │
│  ├── Route resolution → page_id                              │
│  ├── Injects Tailwind config, meta tags, head setup          │
│  └── Renders @page-speed/blocks entry point in view          │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Page Payload Data Structure & Octane Storage

### 1.1 Page Payload JSON Schema

This is the canonical data structure stored in Tigris and served by Octane:

```typescript
// @page-speed/blocks/src/types/page-payload.ts

export interface PagePayload {
  version: 1;
  pageId: string;
  websiteId: string;
  /** ISO 8601 timestamp — used for ETag generation */
  updatedAt: string;
  /** Page-level metadata for <head> injection */
  meta: PageMeta;
  /** Ordered array of block instances */
  blocks: BlockInstance[];
}

export interface PageMeta {
  title: string;
  description?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
  };
  /** Reference to website's tailwind config endpoint */
  tailwindConfigUrl?: string;
  /** Custom fonts to preload */
  fonts?: FontReference[];
}

export interface FontReference {
  family: string;
  /** URL served by Octane's font CDN */
  url: string;
  weight?: string;
  style?: string;
}

export interface BlockInstance {
  /** Unique instance ID (UUID) for this block on this page */
  id: string;
  /** Category slug from the UI library, e.g. "hero", "contact", "faq" */
  categoryId: string;
  /** Block ID within its category, e.g. "hero-simple-centered-image" */
  blockId: string;
  /** Component name for reference, e.g. "HeroSimpleCenteredImage" */
  componentName: string;
  /** Static props to spread into the component */
  props: Record<string, unknown>;
  /** Dynamic data feed references — resolved client-side by useFeed */
  dataRefs?: DataRef[];
}

/**
 * A reference to a dynamic data feed. The rendering engine resolves
 * these via useFeed hooks — Octane never merges them into the payload.
 */
export interface DataRef {
  /** Which prop path this feed populates, e.g. "posts" or "images" */
  targetProp: string;
  /** Feed type identifier */
  feedType: "blog" | "instagram" | "menu" | "reviews" | "gallery" | "custom";
  /** Feed-specific configuration */
  feedConfig: Record<string, unknown>;
  /** How many items to fetch */
  limit?: number;
  /** Fallback static value if feed fails */
  fallback?: unknown;
}
```

**Key design decisions:**
- `categoryId` + `blockId` together form the unique block identity and deterministically resolve the import path: `@opensite/ui/blocks/{categoryId}/{blockId}`. This matches the `componentPath` values from the UI library API (e.g., `blocks/hero/hero-simple-centered-image`).
- `dataRefs` is optional — most blocks on most pages will have purely static props. Feed resolution is completely decoupled.
- `props` stores serializable JSON only — no React elements, no functions. ReactNode props like icons are represented as serializable descriptors (see §2.4).

### 1.2 Example Page Payload

Based on the attached `page-home-2.tsx`:

```json
{
  "version": 1,
  "pageId": "delo-home",
  "websiteId": "ws_delo_123",
  "updatedAt": "2026-03-05T01:00:00Z",
  "meta": {
    "title": "Delo | Build Success Without Sacrificing What Matters",
    "description": "Business builder turned leadership coach...",
    "openGraph": {
      "title": "Delo | Build Success Without Sacrificing What Matters",
      "description": "Business builder turned leadership coach...",
      "image": "https://cdn.ing/assets/delo-og.png"
    }
  },
  "blocks": [
    {
      "id": "blk_001",
      "categoryId": "hero",
      "blockId": "hero-simple-centered-image",
      "componentName": "HeroSimpleCenteredImage",
      "props": {
        "heading": "Build Success Without Sacrificing What Matters",
        "description": "I've built businesses from scratch...",
        "imageSrc": "https://cdn.ing/assets/ir2902/delo-hero.jpg",
        "imageAlt": "Delo speaking",
        "actions": [
          {
            "label": "Start Here",
            "href": "/about",
            "variant": "default",
            "iconAfter": { "_type": "icon", "name": "lucide/arrow-right", "size": 16 }
          },
          {
            "label": "Explore Built Different",
            "href": "/built-different-community",
            "variant": "secondary"
          }
        ],
        "background": "dark",
        "pattern": "diagonalCrossFadeTop",
        "patternOpacity": 0.15
      }
    },
    {
      "id": "blk_002",
      "categoryId": "features",
      "blockId": "feature-animated-carousel",
      "componentName": "FeatureAnimatedCarousel",
      "props": {
        "heading": "Three Pillars of Sustainable Success",
        "features": [
          { "title": "Protect", "description": "..." },
          { "title": "Connect", "description": "..." }
        ],
        "background": "gray"
      }
    },
    {
      "id": "blk_003",
      "categoryId": "blog",
      "blockId": "blog-carousel-apple",
      "componentName": "BlogCarouselApple",
      "props": {
        "heading": "Latest Insights",
        "background": "white"
      },
      "dataRefs": [
        {
          "targetProp": "posts",
          "feedType": "blog",
          "feedConfig": {
            "categorySlug": "insights",
            "websiteId": "ws_delo_123"
          },
          "limit": 6,
          "fallback": []
        }
      ]
    }
  ]
}
```

### 1.3 Octane (Rust) — Page Payload Endpoints

Add to `src/handlers/pages.rs`:

```rust
// src/handlers/pages.rs

use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    Json,
};
use aws_sdk_s3::Client as S3Client;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use tracing::info;

/// Shared state for page payload endpoints
#[derive(Clone)]
pub struct PageState {
    pub s3_client: S3Client,
    pub bucket: String,
}

/// GET /pages/:website_id/:page_id
/// Public endpoint — serves page payload JSON with strong ETag caching
pub async fn get_page_payload(
    State(state): State<PageState>,
    Path((website_id, page_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    let key = format!("websites/{}/pages/{}.json", website_id, page_id);

    // Fetch from Tigris
    let result = state.s3_client
        .get_object()
        .bucket(&state.bucket)
        .key(&key)
        .send()
        .await;

    match result {
        Ok(output) => {
            let body_bytes = output.body
                .collect()
                .await
                .map(|data| data.into_bytes())
                .unwrap_or_default();

            // Generate strong ETag from content hash
            let mut hasher = Sha256::new();
            hasher.update(&body_bytes);
            let etag = format!("\"{}\"", hex::encode(&hasher.finalize()[..16]));

            // Check If-None-Match for 304
            if let Some(if_none_match) = headers.get(header::IF_NONE_MATCH) {
                if let Ok(client_etag) = if_none_match.to_str() {
                    if client_etag == etag {
                        return (
                            StatusCode::NOT_MODIFIED,
                            [(header::ETAG, etag)],
                        ).into_response();
                    }
                }
            }

            (
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, "application/json".to_string()),
                    (header::ETAG, etag),
                    (header::CACHE_CONTROL, "public, max-age=60, stale-while-revalidate=300".to_string()),
                    // Cloudflare edge cache: 1 hour
                    ("CDN-Cache-Control".parse().unwrap(), "max-age=3600".to_string()),
                    (header::ACCESS_CONTROL_ALLOW_ORIGIN, "*".to_string()),
                ],
                body_bytes,
            ).into_response()
        }
        Err(e) => {
            info!("Page payload not found: {} - {}", key, e);
            (StatusCode::NOT_FOUND, "Page not found").into_response()
        }
    }
}

/// PUT /pages/:website_id/:page_id
/// Protected endpoint — writes/updates page payload
pub async fn put_page_payload(
    State(state): State<PageState>,
    Path((website_id, page_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> Response {
    let key = format!("websites/{}/pages/{}.json", website_id, page_id);

    // Validate payload structure
    if payload.get("version").and_then(|v| v.as_u64()) != Some(1) {
        return (StatusCode::BAD_REQUEST, "Invalid payload: version must be 1").into_response();
    }

    if payload.get("blocks").and_then(|b| b.as_array()).is_none() {
        return (StatusCode::BAD_REQUEST, "Invalid payload: blocks must be an array").into_response();
    }

    // Validate each block has categoryId + blockId
    if let Some(blocks) = payload.get("blocks").and_then(|b| b.as_array()) {
        for (i, block) in blocks.iter().enumerate() {
            if block.get("categoryId").and_then(|c| c.as_str()).is_none() {
                return (
                    StatusCode::BAD_REQUEST,
                    format!("Block at index {} missing categoryId", i),
                ).into_response();
            }
            if block.get("blockId").and_then(|b| b.as_str()).is_none() {
                return (
                    StatusCode::BAD_REQUEST,
                    format!("Block at index {} missing blockId", i),
                ).into_response();
            }
        }
    }

    let body = serde_json::to_vec(&payload).unwrap();

    match state.s3_client
        .put_object()
        .bucket(&state.bucket)
        .key(&key)
        .body(body.into())
        .content_type("application/json")
        .send()
        .await
    {
        Ok(_) => {
            info!("Page payload saved: {}", key);
            (StatusCode::OK, "Page saved").into_response()
        }
        Err(e) => {
            tracing::error!("Failed to save page payload: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to save").into_response()
        }
    }
}
```

Register in `routes.rs`:

```rust
// In routes.rs — add to router setup
use crate::handlers::pages::{get_page_payload, put_page_payload, PageState};

// Inside build_router():
let page_state = PageState {
    s3_client: s3_client.clone(), // from existing Tigris/S3 setup
    bucket: std::env::var("TIGRIS_PAGES_BUCKET")
        .unwrap_or_else(|_| "opensite-pages".to_string()),
};

// Public: page payload read (CDN-cacheable)
router = router.route(
    "/pages/:website_id/:page_id",
    get(get_page_payload).with_state(page_state.clone()),
);

// Protected: page payload write (behind Basic Auth)
router = router.route(
    "/pages/:website_id/:page_id",
    put(put_page_payload).with_state(page_state),
);
```

### 1.4 Octane — Blog Feed Endpoint (First Feed Type)

```rust
// src/handlers/feeds.rs

use axum::{
    extract::{Path, Query, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
};
use serde::Deserialize;
use tokio_postgres::Client as PgClient;
use std::sync::Arc;

#[derive(Clone)]
pub struct FeedState {
    pub db: Arc<PgClient>,
}

#[derive(Deserialize)]
pub struct BlogFeedQuery {
    pub category_slug: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// GET /feeds/:website_id/blog
/// Public endpoint — returns blog posts for a website
pub async fn get_blog_feed(
    State(state): State<FeedState>,
    Path(website_id): Path<String>,
    Query(params): Query<BlogFeedQuery>,
) -> Response {
    let limit = params.limit.unwrap_or(10).min(50);
    let offset = params.offset.unwrap_or(0);

    let query = if let Some(ref cat) = params.category_slug {
        format!(
            "SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.body_markdown,
                    bp.featured_image_url, bp.author_name, bp.author_image_url,
                    bp.author_href, bp.published_at, bp.read_time_minutes,
                    bp.category_slug
             FROM blog_posts bp
             JOIN websites w ON w.id = bp.website_id
             WHERE w.token = $1 AND bp.published = true
               AND bp.category_slug = '{}'
             ORDER BY bp.published_at DESC
             LIMIT {} OFFSET {}",
            cat.replace("'", "''"), limit, offset
        )
    } else {
        format!(
            "SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.body_markdown,
                    bp.featured_image_url, bp.author_name, bp.author_image_url,
                    bp.author_href, bp.published_at, bp.read_time_minutes,
                    bp.category_slug
             FROM blog_posts bp
             JOIN websites w ON w.id = bp.website_id
             WHERE w.token = $1 AND bp.published = true
             ORDER BY bp.published_at DESC
             LIMIT {} OFFSET {}",
            limit, offset
        )
    };

    match state.db.query(&query, &[&website_id]).await {
        Ok(rows) => {
            let posts: Vec<serde_json::Value> = rows.iter().map(|row| {
                serde_json::json!({
                    "id": row.get::<_, String>("id"),
                    "title": row.get::<_, String>("title"),
                    "slug": row.get::<_, String>("slug"),
                    "excerpt": row.get::<_, Option<String>>("excerpt"),
                    "bodyMarkdown": row.get::<_, Option<String>>("body_markdown"),
                    "featuredImageUrl": row.get::<_, Option<String>>("featured_image_url"),
                    "authorName": row.get::<_, Option<String>>("author_name"),
                    "authorImageUrl": row.get::<_, Option<String>>("author_image_url"),
                    "authorHref": row.get::<_, Option<String>>("author_href"),
                    "publishedAt": row.get::<_, Option<String>>("published_at"),
                    "readTimeMinutes": row.get::<_, Option<i32>>("read_time_minutes"),
                    "categorySlug": row.get::<_, Option<String>>("category_slug"),
                })
            }).collect();

            let response = serde_json::json!({
                "success": true,
                "data": posts,
                "meta": {
                    "total": posts.len(),
                    "limit": limit,
                    "offset": offset,
                }
            });

            (
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, "application/json"),
                    (header::CACHE_CONTROL, "public, max-age=30, stale-while-revalidate=120"),
                    (header::ACCESS_CONTROL_ALLOW_ORIGIN, "*"),
                ],
                serde_json::to_string(&response).unwrap(),
            ).into_response()
        }
        Err(e) => {
            tracing::error!("Blog feed query failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Feed error").into_response()
        }
    }
}
```

---

## Phase 2: `@page-speed/blocks` — The New Rendering Engine

### 2.1 Package Setup

```json
{
  "name": "@page-speed/blocks",
  "version": "0.1.0",
  "description": "High-performance block rendering engine for OpenSite AI",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./core": {
      "import": "./dist/core/index.js",
      "require": "./dist/core/index.cjs",
      "types": "./dist/core/index.d.ts"
    },
    "./core/renderer": {
      "import": "./dist/core/PageRenderer.js",
      "require": "./dist/core/PageRenderer.cjs",
      "types": "./dist/core/PageRenderer.d.ts"
    },
    "./hooks/use-feed": {
      "import": "./dist/hooks/useFeed.js",
      "require": "./dist/hooks/useFeed.cjs",
      "types": "./dist/hooks/useFeed.d.ts"
    },
    "./api/fetch-payload": {
      "import": "./dist/api/fetchPayload.js",
      "require": "./dist/api/fetchPayload.cjs",
      "types": "./dist/api/fetchPayload.d.ts"
    }
  },
  "sideEffects": false,
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "@opensite/ui": ">=0.1.0"
  },
  "dependencies": {
    "@page-speed/markdown": "^0.1.0"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "tsup": "^8.0",
    "vitest": "^2.0",
    "@types/react": "^18"
  }
}
```

### 2.2 Block Registry — The Core Mapping System

```typescript
// src/core/registry.ts

import { type ComponentType, lazy } from "react";

/**
 * Registry key format: "{categoryId}/{blockId}"
 * e.g., "hero/hero-simple-centered-image"
 *
 * The registry is built at compile time from @opensite/ui's block exports.
 * No import paths are stored in page payloads — only categoryId + blockId,
 * which this registry resolves to actual React components.
 */

type LazyComponent = ComponentType<Record<string, unknown>>;

const registry = new Map<string, () => Promise<{ default: LazyComponent }>>();

/**
 * Register a block component. Called during app initialization
 * or can be called lazily.
 */
export function registerBlock(
  categoryId: string,
  blockId: string,
  loader: () => Promise<{ default: LazyComponent }>
): void {
  const key = `${categoryId}/${blockId}`;
  registry.set(key, loader);
}

/**
 * Resolve a block by categoryId + blockId to a lazy React component.
 * Returns null if not found.
 */
export function resolveBlock(
  categoryId: string,
  blockId: string
): React.LazyExoticComponent<LazyComponent> | null {
  const key = `${categoryId}/${blockId}`;
  const loader = registry.get(key);
  if (!loader) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[page-speed/blocks] Block not found in registry: ${key}`);
    }
    return null;
  }
  return lazy(loader);
}

/**
 * Check if a block is registered
 */
export function hasBlock(categoryId: string, blockId: string): boolean {
  return registry.has(`${categoryId}/${blockId}`);
}

/**
 * Get the count of registered blocks (useful for diagnostics)
 */
export function registrySize(): number {
  return registry.size;
}
```

### 2.3 Auto-Registration from @opensite/ui

```typescript
// src/core/register-all-blocks.ts
//
// This file is auto-generated by a build script that reads the UI library
// API at https://ui.opensite.dev/api/categories and generates lazy imports.
// For MVP, this can be maintained manually and automated later.

import { registerBlock } from "./registry";

// ─── Hero blocks ──────────────────────────────────────────
registerBlock("hero", "hero-simple-centered-image", () =>
  import("@opensite/ui/blocks/hero/hero-simple-centered-image").then(m => ({
    default: m.HeroSimpleCenteredImage as any,
  }))
);

registerBlock("hero", "hero-premium-split-avatars", () =>
  import("@opensite/ui/blocks/hero/hero-premium-split-avatars").then(m => ({
    default: m.HeroPremiumSplitAvatars as any,
  }))
);

registerBlock("hero", "hero-announcement-badge", () =>
  import("@opensite/ui/blocks/hero/hero-announcement-badge").then(m => ({
    default: m.HeroAnnouncementBadge as any,
  }))
);

// ─── Contact blocks ───────────────────────────────────────
registerBlock("contact", "contact-faq", () =>
  import("@opensite/ui/blocks/contact/contact-faq").then(m => ({
    default: m.ContactFaq as any,
  }))
);

registerBlock("contact", "contact-card", () =>
  import("@opensite/ui/blocks/contact/contact-card").then(m => ({
    default: m.ContactCard as any,
  }))
);

// ─── Features blocks ──────────────────────────────────────
registerBlock("features", "feature-animated-carousel", () =>
  import("@opensite/ui/blocks/features/feature-animated-carousel").then(m => ({
    default: m.FeatureAnimatedCarousel as any,
  }))
);

registerBlock("features", "feature-bento-image-grid", () =>
  import("@opensite/ui/blocks/features/feature-bento-image-grid").then(m => ({
    default: m.FeatureBentoImageGrid as any,
  }))
);

// ─── Blog blocks ──────────────────────────────────────────
registerBlock("blog", "blog-carousel-apple", () =>
  import("@opensite/ui/blocks/blog/blog-carousel-apple").then(m => ({
    default: m.BlogCarouselApple as any,
  }))
);

registerBlock("blog", "blog-grid-author-cards", () =>
  import("@opensite/ui/blocks/blog/blog-grid-author-cards").then(m => ({
    default: m.BlogGridAuthorCards as any,
  }))
);

// ─── Article blocks ───────────────────────────────────────
registerBlock("article", "article-hero-prose", () =>
  import("@opensite/ui/blocks/article/article-hero-prose").then(m => ({
    default: m.ArticleHeroProse as any,
  }))
);

registerBlock("article", "article-split-animated", () =>
  import("@opensite/ui/blocks/article/article-split-animated").then(m => ({
    default: m.ArticleSplitAnimated as any,
  }))
);

// ... continue for all block categories
// This file can be auto-generated by a script that reads the UI library API
```

### 2.4 Props Transformation — Serializable Descriptors to React Elements

```typescript
// src/core/props-transformer.ts

import React from "react";

/**
 * Transforms serializable prop descriptors into live React elements.
 * Handles:
 *   - Icon descriptors: { _type: "icon", name: "lucide/arrow-right", size: 16 }
 *   - Markdown content: { _type: "markdown", content: "# Hello", styleConfig: {...} }
 *   - Nested objects/arrays (recursively)
 */

// Lazy-load DynamicIcon to avoid bundle bloat
let DynamicIconRef: React.ComponentType<any> | null = null;

async function getDynamicIcon() {
  if (!DynamicIconRef) {
    const mod = await import("@opensite/ui/components/dynamic-icon");
    DynamicIconRef = mod.DynamicIcon;
  }
  return DynamicIconRef;
}

export function transformProps(
  props: Record<string, unknown>,
  context?: { optixFlowConfig?: Record<string, unknown> }
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    result[key] = transformValue(value, context);
  }

  return result;
}

function transformValue(
  value: unknown,
  context?: { optixFlowConfig?: Record<string, unknown> }
): unknown {
  if (value === null || value === undefined) return value;

  // Handle descriptor objects
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    // Icon descriptor
    if (obj._type === "icon" && typeof obj.name === "string") {
      // Return a placeholder that will be resolved synchronously
      // DynamicIcon should already be loaded in the bundle via @opensite/ui
      const { DynamicIcon } = require("@opensite/ui");
      return React.createElement(DynamicIcon, {
        name: obj.name,
        size: (obj.size as number) ?? 16,
        className: obj.className as string,
      });
    }

    // Markdown descriptor — resolved by the consuming component
    if (obj._type === "markdown") {
      return obj; // Pass through — components know how to handle this
    }

    // Date descriptor
    if (obj._type === "date" && typeof obj.value === "string") {
      return new Date(obj.value);
    }

    // Recurse into plain objects
    const transformed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      transformed[k] = transformValue(v, context);
    }
    return transformed;
  }

  // Recurse into arrays
  if (Array.isArray(value)) {
    return value.map((item) => transformValue(item, context));
  }

  // Primitives pass through
  return value;
}
```

### 2.5 Page Renderer Component

```tsx
// src/core/PageRenderer.tsx

"use client";

import React, { Suspense, useMemo } from "react";
import type { PagePayload, BlockInstance } from "../types/page-payload";
import { resolveBlock } from "./registry";
import { transformProps } from "./props-transformer";
import { FeedProvider } from "../hooks/useFeed";

export interface PageRendererProps {
  /** Page payload from Octane */
  payload: PagePayload;
  /** Octane base URL for feed API calls */
  feedBaseUrl: string;
  /** OptixFlow config for image optimization */
  optixFlowConfig?: { apiKey: string; compression?: number };
  /** Loading fallback for lazy-loaded blocks */
  blockFallback?: React.ReactNode;
  /** Error boundary fallback */
  errorFallback?: React.ReactNode;
  /** Additional className for the page wrapper */
  className?: string;
}

export function PageRenderer({
  payload,
  feedBaseUrl,
  optixFlowConfig,
  blockFallback,
  errorFallback,
  className,
}: PageRendererProps) {
  const fallback = blockFallback ?? (
    <div className="min-h-[200px] animate-pulse bg-muted/50" />
  );

  return (
    <FeedProvider baseUrl={feedBaseUrl} websiteId={payload.websiteId}>
      <div className={className ?? "relative"}>
        {payload.blocks.map((block, idx) => (
          <BlockRenderer
            key={`${block.id}-${idx}`}
            block={block}
            optixFlowConfig={optixFlowConfig}
            fallback={fallback}
            errorFallback={errorFallback}
          />
        ))}
      </div>
    </FeedProvider>
  );
}

interface BlockRendererProps {
  block: BlockInstance;
  optixFlowConfig?: { apiKey: string; compression?: number };
  fallback: React.ReactNode;
  errorFallback?: React.ReactNode;
}

function BlockRenderer({
  block,
  optixFlowConfig,
  fallback,
  errorFallback,
}: BlockRendererProps) {
  const Component = useMemo(
    () => resolveBlock(block.categoryId, block.blockId),
    [block.categoryId, block.blockId]
  );

  const transformedProps = useMemo(
    () => transformProps(block.props, { optixFlowConfig }),
    [block.props, optixFlowConfig]
  );

  if (!Component) {
    if (process.env.NODE_ENV !== "production") {
      return (
        <div className="border-2 border-dashed border-red-300 p-4 text-red-500 text-sm">
          Block not found: {block.categoryId}/{block.blockId}
        </div>
      );
    }
    return null;
  }

  return (
    <BlockErrorBoundary
      blockId={`${block.categoryId}/${block.blockId}`}
      fallback={errorFallback}
    >
      <Suspense fallback={fallback}>
        <FeedResolver block={block}>
          {(feedProps) => (
            <Component
              {...transformedProps}
              {...feedProps}
              optixFlowConfig={optixFlowConfig}
            />
          )}
        </FeedResolver>
      </Suspense>
    </BlockErrorBoundary>
  );
}

/**
 * Resolves dataRefs for a block, injecting feed data into props
 */
function FeedResolver({
  block,
  children,
}: {
  block: BlockInstance;
  children: (feedProps: Record<string, unknown>) => React.ReactNode;
}) {
  // If no dataRefs, render immediately with no extra props
  if (!block.dataRefs || block.dataRefs.length === 0) {
    return <>{children({})}</>;
  }

  // Use the useFeed hook for each dataRef
  return (
    <FeedResolverInner dataRefs={block.dataRefs}>
      {children}
    </FeedResolverInner>
  );
}

function FeedResolverInner({
  dataRefs,
  children,
}: {
  dataRefs: NonNullable<BlockInstance["dataRefs"]>;
  children: (feedProps: Record<string, unknown>) => React.ReactNode;
}) {
  const { useFeed } = require("../hooks/useFeed");
  const feedProps: Record<string, unknown> = {};

  for (const ref of dataRefs) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data, isLoading, error } = useFeed(ref.feedType, ref.feedConfig, {
      limit: ref.limit,
    });

    if (error && ref.fallback !== undefined) {
      feedProps[ref.targetProp] = ref.fallback;
    } else if (data) {
      feedProps[ref.targetProp] = data;
    } else if (isLoading && ref.fallback !== undefined) {
      feedProps[ref.targetProp] = ref.fallback;
    }
  }

  return <>{children(feedProps)}</>;
}

/**
 * Error boundary for individual blocks
 */
class BlockErrorBoundary extends React.Component<
  {
    blockId: string;
    fallback?: React.ReactNode;
    children: React.ReactNode;
  },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[page-speed/blocks] Error in block ${this.props.blockId}:`, error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
```

### 2.6 Feed Hook

```typescript
// src/hooks/useFeed.ts

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { DataRef } from "../types/page-payload";

interface FeedContextValue {
  baseUrl: string;
  websiteId: string;
  cache: Map<string, { data: unknown; timestamp: number }>;
}

const FeedContext = createContext<FeedContextValue | null>(null);

export function FeedProvider({
  baseUrl,
  websiteId,
  children,
}: {
  baseUrl: string;
  websiteId: string;
  children: React.ReactNode;
}) {
  const cache = useRef(new Map<string, { data: unknown; timestamp: number }>()).current;

  return React.createElement(
    FeedContext.Provider,
    { value: { baseUrl, websiteId, cache } },
    children
  );
}

interface UseFeedResult<T = unknown> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch dynamic feed data from Octane's feed endpoints.
 * Caches results for 30 seconds to avoid redundant requests.
 */
export function useFeed<T = unknown>(
  feedType: DataRef["feedType"],
  feedConfig: Record<string, unknown>,
  options?: { limit?: number; offset?: number }
): UseFeedResult<T> {
  const ctx = useContext(FeedContext);
  if (!ctx) {
    throw new Error("useFeed must be used within a FeedProvider");
  }

  const { baseUrl, websiteId, cache } = ctx;

  const cacheKey = JSON.stringify({ feedType, feedConfig, options });
  const [data, setData] = useState<T | null>(() => {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30_000) {
      return cached.data as T;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.limit) params.set("limit", String(options.limit));
      if (options?.offset) params.set("offset", String(options.offset));

      // Map feedConfig to query params
      for (const [key, value] of Object.entries(feedConfig)) {
        if (value !== undefined && value !== null && key !== "websiteId") {
          params.set(camelToSnake(key), String(value));
        }
      }

      const url = `${baseUrl}/feeds/${websiteId}/${feedType}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Feed request failed: ${response.status}`);
      }

      const json = await response.json();
      const feedData = json.data as T;

      cache.set(cacheKey, { data: feedData, timestamp: Date.now() });
      setData(feedData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, websiteId, feedType, cacheKey]);

  useEffect(() => {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30_000) {
      setData(cached.data as T);
      setIsLoading(false);
      return;
    }
    fetchFeed();
  }, [cacheKey, fetchFeed]);

  return { data, isLoading, error, refetch: fetchFeed };
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
```

### 2.7 Payload Fetcher

```typescript
// src/api/fetchPayload.ts

import type { PagePayload } from "../types/page-payload";

interface FetchPayloadOptions {
  /** Octane base URL, e.g. "https://cdn.ing" */
  baseUrl: string;
  websiteId: string;
  pageId: string;
  /** Request timeout in ms (default: 5000) */
  timeout?: number;
}

/**
 * Fetches a page payload from Octane with ETag caching support.
 * Used by customer-sites Rails app to embed payload in initial HTML,
 * or by client-side navigation for SPA transitions.
 */
export async function fetchPagePayload(
  options: FetchPayloadOptions
): Promise<PagePayload> {
  const { baseUrl, websiteId, pageId, timeout = 5000 } = options;
  const url = `${baseUrl}/pages/${websiteId}/${pageId}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page payload: ${response.status}`);
    }

    return (await response.json()) as PagePayload;
  } finally {
    clearTimeout(timer);
  }
}
```

---

## Phase 3: `@page-speed/markdown` — Markdown-to-JSX Library

### 3.1 Why `markdown-to-jsx`

After evaluating the options:
- **`markdown-to-jsx`**: ~6KB gzipped, zero dependencies, native component overrides via `options.overrides`, built-in sanitizer, GFM support. Perfect fit.[12]
- **`react-markdown`**: ~32KB gzipped (5x larger), requires unified/remark/rehype ecosystem, component overrides via `components` prop but heavier.[13]
- **unified/remark pipeline**: Maximum flexibility but requires assembling 4+ packages (remark-parse, remark-rehype, rehype-react, rehype-raw), total ~60KB+ gzipped.[14]

**Decision:** Build `@page-speed/markdown` as a thin wrapper around `markdown-to-jsx` that provides:
1. Pre-configured component overrides (Pressable for `<a>`, Img for `<img>`, Video for `<video>`)
2. `styleConfig` prop for dynamic Tailwind class injection per element type
3. Security sanitization layer
4. Tree-shakable exports matching the ecosystem pattern

### 3.2 Package Setup

```json
{
  "name": "@page-speed/markdown",
  "version": "0.1.0",
  "description": "Secure, performant markdown-to-JSX with OpenSite component overrides",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./core": {
      "import": "./dist/core/index.js",
      "require": "./dist/core/index.cjs",
      "types": "./dist/core/index.d.ts"
    }
  },
  "sideEffects": false,
  "peerDependencies": {
    "react": ">=18",
    "@opensite/ui": ">=0.1.0"
  },
  "dependencies": {
    "markdown-to-jsx": "^7.7.0"
  }
}
```

### 3.3 Core Implementation

```tsx
// src/core/MarkdownRenderer.tsx

"use client";

import React, { useMemo } from "react";
import Markdown, { compiler } from "markdown-to-jsx";
import type { MarkdownToJSX } from "markdown-to-jsx";

// ─── Types ────────────────────────────────────────────────

export interface StyleConfig {
  /** Tailwind classes for <h1> */
  h1?: string;
  /** Tailwind classes for <h2> */
  h2?: string;
  /** Tailwind classes for <h3> */
  h3?: string;
  /** Tailwind classes for <h4> */
  h4?: string;
  /** Tailwind classes for <h5> */
  h5?: string;
  /** Tailwind classes for <h6> */
  h6?: string;
  /** Tailwind classes for <p> */
  p?: string;
  /** Tailwind classes for <a> */
  a?: string;
  /** Tailwind classes for <img> */
  img?: string;
  /** Tailwind classes for <blockquote> */
  blockquote?: string;
  /** Tailwind classes for <ul> */
  ul?: string;
  /** Tailwind classes for <ol> */
  ol?: string;
  /** Tailwind classes for <li> */
  li?: string;
  /** Tailwind classes for <code> (inline) */
  code?: string;
  /** Tailwind classes for <pre> (code blocks) */
  pre?: string;
  /** Tailwind classes for <table> */
  table?: string;
  /** Tailwind classes for <th> */
  th?: string;
  /** Tailwind classes for <td> */
  td?: string;
  /** Tailwind classes for <hr> */
  hr?: string;
  /** Tailwind classes for <strong> */
  strong?: string;
  /** Tailwind classes for <em> */
  em?: string;
  /** Any additional custom element styles */
  [key: string]: string | undefined;
}

export interface ComponentOverrides {
  /** Override for <a> tags — defaults to Pressable */
  a?: React.ComponentType<any>;
  /** Override for <img> tags — defaults to Img from @page-speed/img */
  img?: React.ComponentType<any>;
  /** Override for <video> tags */
  video?: React.ComponentType<any>;
  /** Any additional component overrides */
  [key: string]: React.ComponentType<any> | undefined;
}

export interface MarkdownRendererProps {
  /** The markdown string to render */
  children: string;
  /** Dynamic style config — maps element types to Tailwind classes */
  styleConfig?: StyleConfig;
  /** Custom component overrides — merged with defaults */
  components?: ComponentOverrides;
  /** OptixFlow config passed to Img components */
  optixFlowConfig?: { apiKey: string; compression?: number };
  /** Additional className for the wrapper */
  className?: string;
  /** Wrapper element (default: "div") */
  wrapper?: React.ElementType | null;
  /** Force block-level rendering */
  forceBlock?: boolean;
  /** Disable raw HTML parsing for extra security */
  disableRawHtml?: boolean;
}

// ─── Security ─────────────────────────────────────────────

/** Allowlist of CSS class characters — blocks injection attacks */
const SAFE_CLASS_RE = /^[a-zA-Z0-9\s\-_:/\[\]().!@#]+$/;

function sanitizeClasses(classes?: string): string {
  if (!classes) return "";
  if (!SAFE_CLASS_RE.test(classes)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[page-speed/markdown] Blocked potentially unsafe class string: ${classes}`
      );
    }
    return "";
  }
  return classes;
}

/** Sanitize href values — block javascript: and data: URIs */
function sanitizeHref(href?: string): string {
  if (!href) return "#";
  const trimmed = href.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return "#";
  }
  return href;
}

// ─── Default Component Overrides ──────────────────────────

/**
 * Creates the default Pressable-based link override.
 * This is THE critical override — without it, all links would use
 * native <a> tags instead of JS routing, destroying SPA UX.
 */
function createLinkOverride(
  PressableComponent: React.ComponentType<any>,
  styleConfig?: StyleConfig
) {
  return function LinkOverride({
    children,
    href,
    title,
    className,
    ...rest
  }: any) {
    return React.createElement(
      PressableComponent,
      {
        href: sanitizeHref(href),
        title,
        className: `${sanitizeClasses(styleConfig?.a)} ${className || ""}`.trim() || undefined,
        ...rest,
      },
      children
    );
  };
}

/**
 * Creates the Img override for optimized image delivery.
 */
function createImgOverride(
  ImgComponent: React.ComponentType<any>,
  optixFlowConfig?: { apiKey: string; compression?: number },
  styleConfig?: StyleConfig
) {
  return function ImgOverride({ src, alt, title, className, ...rest }: any) {
    return React.createElement(ImgComponent, {
      src,
      alt: alt || "",
      title,
      className: `${sanitizeClasses(styleConfig?.img)} ${className || ""}`.trim() || undefined,
      optixFlowConfig,
      ...rest,
    });
  };
}

/**
 * Creates a styled element override for standard HTML tags
 */
function createStyledOverride(
  tag: keyof JSX.IntrinsicElements,
  styleConfig?: StyleConfig
) {
  const classes = styleConfig?.[tag];
  if (!classes) return undefined;

  const sanitized = sanitizeClasses(classes);
  if (!sanitized) return undefined;

  return function StyledElement({ children, className, ...rest }: any) {
    return React.createElement(
      tag,
      {
        className: `${sanitized} ${className || ""}`.trim(),
        ...rest,
      },
      children
    );
  };
}

// ─── Main Component ───────────────────────────────────────

export function MarkdownRenderer({
  children,
  styleConfig,
  components,
  optixFlowConfig,
  className,
  wrapper = "div",
  forceBlock = true,
  disableRawHtml = false,
}: MarkdownRendererProps) {
  const overrides = useMemo(() => {
    const result: MarkdownToJSX.Overrides = {};

    // Load default components lazily to avoid bundling if not used
    // These are the critical overrides:

    // 1. <a> → Pressable (JS routing, external detection, mailto/tel)
    try {
      const { Pressable } = require("@opensite/ui/lib/Pressable");
      result.a = {
        component: components?.a ?? createLinkOverride(Pressable, styleConfig),
      };
    } catch {
      // Fallback if Pressable not available
      if (components?.a) {
        result.a = { component: components.a };
      }
    }

    // 2. <img> → page-speed Img (AVIF/WebP, responsive, CDN-cached)
    try {
      const { Img } = require("@page-speed/img");
      result.img = {
        component: components?.img ?? createImgOverride(Img, optixFlowConfig, styleConfig),
      };
    } catch {
      if (components?.img) {
        result.img = { component: components.img };
      }
    }

    // 3. <video> → @page-speed/video when available
    if (components?.video) {
      result.video = { component: components.video };
    }

    // 4. Security: void dangerous tags
    result.script = { component: () => null } as any;
    result.iframe = { component: () => null } as any;
    result.object = { component: () => null } as any;
    result.style = { component: () => null } as any;
    result.form = { component: () => null } as any;

    // 5. Apply styleConfig to all standard HTML elements
    if (styleConfig) {
      const styledTags: (keyof JSX.IntrinsicElements)[] = [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "blockquote", "ul", "ol", "li",
        "code", "pre", "table", "th", "td",
        "hr", "strong", "em",
      ];

      for (const tag of styledTags) {
        const override = createStyledOverride(tag, styleConfig);
        if (override && !result[tag]) {
          result[tag] = { component: override } as any;
        }
      }
    }

    // 6. Merge any additional custom component overrides
    if (components) {
      for (const [key, comp] of Object.entries(components)) {
        if (comp && !result[key] && key !== "a" && key !== "img" && key !== "video") {
          result[key] = { component: comp } as any;
        }
      }
    }

    return result;
  }, [styleConfig, components, optixFlowConfig]);

  const options = useMemo<MarkdownToJSX.Options>(
    () => ({
      forceBlock,
      wrapper: wrapper ?? undefined,
      overrides,
      disableParsingRawHTML: disableRawHtml,
      // Keep the default sanitizer for href values
    }),
    [forceBlock, wrapper, overrides, disableRawHtml]
  );

  if (!children || typeof children !== "string") {
    return null;
  }

  return (
    <div className={className}>
      <Markdown options={options}>{children}</Markdown>
    </div>
  );
}

// ─── Compiler Export (for server-side or non-component usage) ──

export { compiler as compileMarkdown } from "markdown-to-jsx";
```

### 3.4 Exports

```typescript
// src/index.ts
export { MarkdownRenderer } from "./core/MarkdownRenderer";
export type {
  MarkdownRendererProps,
  StyleConfig,
  ComponentOverrides,
} from "./core/MarkdownRenderer";

// Re-export compiler for advanced usage
export { compiler as compileMarkdown } from "markdown-to-jsx";
```

### 3.5 Usage Examples

**Basic usage in a blog article block:**

```tsx
import { MarkdownRenderer } from "@page-speed/markdown";

function BlogPostContent({ bodyMarkdown }: { bodyMarkdown: string }) {
  return (
    <MarkdownRenderer
      className="prose prose-lg dark:prose-invert max-w-none"
    >
      {bodyMarkdown}
    </MarkdownRenderer>
  );
}
```

**With custom styleConfig (featured post with special callout styling):**

```tsx
import { MarkdownRenderer } from "@page-speed/markdown";

// This is the contentStyleConfig pattern from the proposed usage
<MarkdownRenderer
  styleConfig={{
    p: "text-base leading-relaxed",
    h2: "text-pretty text-2xl md:text-4xl font-bold mt-8 mb-4",
    a: "text-primary hover:underline font-medium",
    blockquote: "border-l-4 border-primary bg-primary/5 rounded-r-lg p-4 my-6 italic",
    img: "my-8 aspect-video w-full rounded-lg object-cover shadow-lg",
    code: "bg-muted px-1.5 py-0.5 rounded text-sm font-mono",
    pre: "bg-muted rounded-lg p-4 overflow-x-auto my-6",
  }}
  optixFlowConfig={{ apiKey: "your-api-key" }}
>
  {markdownContent}
</MarkdownRenderer>
```

**With the existing ArticleHeroProse block (matching attached `proposed-usage-4.md`):**

```tsx
import { ArticleHeroProse } from "@opensite/ui/blocks/article/article-hero-prose";
import { MarkdownRenderer } from "@page-speed/markdown";

export function BlogArticlePage({ post, markdownBody }) {
  return (
    <ArticleHeroProse
      background="dark"
      pattern="gridFadeTopRight"
      patternOpacity={0.15}
      post={post}
      dateFormat="MMMM d, yyyy"
    >
      <MarkdownRenderer
        styleConfig={{
          p: "text-base",
          h2: "text-pretty text-2xl md:text-4xl",
          a: "text-primary hover:underline",
        }}
      >
        {markdownBody}
      </MarkdownRenderer>
    </ArticleHeroProse>
  );
}
```

---

## Phase 4: Dynamic Data Feeds — Blog as First Implementation

### 4.1 Blog Feed Integration in @page-speed/blocks

The blog feed is the first `dataRef` type. Here's how it flows end-to-end:

**Page payload with blog feed reference:**
```json
{
  "id": "blk_blog_grid",
  "categoryId": "blog",
  "blockId": "blog-grid-author-cards",
  "componentName": "BlogGridAuthorCards",
  "props": {
    "heading": "Latest Articles",
    "background": "white"
  },
  "dataRefs": [
    {
      "targetProp": "posts",
      "feedType": "blog",
      "feedConfig": {
        "categorySlug": "insights"
      },
      "limit": 9,
      "fallback": []
    }
  ]
}
```

**The `useFeed` hook fetches:** `GET https://cdn.ing/feeds/ws_123/blog?category_slug=insights&limit=9`

**The blog block receives `posts` as a prop** with the feed data already injected by the `FeedResolver` component inside `PageRenderer`.

### 4.2 Blog Post Detail Page with Markdown Rendering

For individual blog post pages, the body is markdown that needs rendering:

```tsx
// In customer-sites or a page that renders a single blog post

import { ArticleHeroProse } from "@opensite/ui/blocks/article/article-hero-prose";
import { MarkdownRenderer } from "@page-speed/markdown";
import { useFeed } from "@page-speed/blocks/hooks/use-feed";

function BlogPostPage({ websiteId, postSlug }: { websiteId: string; postSlug: string }) {
  const { data: posts } = useFeed("blog", {
    slug: postSlug,
    websiteId,
  }, { limit: 1 });

  const post = posts?.[0];
  if (!post) return null;

  return (
    <ArticleHeroProse
      background="dark"
      pattern="gridFadeTopRight"
      patternOpacity={0.15}
      post={{
        title: post.title,
        authorName: post.authorName,
        authorImage: post.authorImageUrl,
        authorHref: post.authorHref,
        image: post.featuredImageUrl,
        pubDate: new Date(post.publishedAt),
        description: post.excerpt,
      }}
      dateFormat="MMMM d, yyyy"
    >
      <MarkdownRenderer
        optixFlowConfig={{ apiKey: "your-key" }}
        styleConfig={{
          h2: "text-pretty text-2xl md:text-4xl font-bold mt-12 mb-4",
          p: "text-base leading-relaxed mb-4",
          a: "text-primary hover:underline",
          blockquote: "border-l-4 border-primary/50 pl-4 italic my-6",
          img: "my-8 aspect-video w-full rounded-lg object-cover",
        }}
      >
        {post.bodyMarkdown}
      </MarkdownRenderer>
    </ArticleHeroProse>
  );
}
```

---

## Phase 5: `customer-sites` Rails 7 Integration

### 5.1 Controller — Domain Lookup & Page Resolution

```ruby
# app/controllers/pages_controller.rb

class PagesController < ApplicationController
  before_action :set_website

  def show
    page_slug = params[:slug] || "home"
    page = @website.pages.find_by(slug: page_slug)

    unless page
      render file: "#{Rails.root}/public/404.html", status: :not_found
      return
    end

    # Build the config that the React rendering engine needs
    @page_config = {
      octane_base_url: ENV["OCTANE_BASE_URL"] || "https://cdn.ing",
      website_id: @website.token,
      page_id: page.token,
      optix_flow_config: {
        api_key: @website.optix_flow_api_key
      },
      meta: {
        title: page.title,
        description: page.description,
        og_image: page.og_image_url
      },
      tailwind_config_url: "#{ENV['OCTANE_BASE_URL']}/assets/websites/#{@website.id}/tailwind.css"
    }
  end

  private

  def set_website
    # Dynamic subdomain/domain lookup
    @website = Website.find_by_domain(request.host)

    unless @website
      render plain: "Website not found", status: :not_found
    end
  end
end
```

### 5.2 View — Rendering Engine Entry Point

```erb
<%# app/views/pages/show.html.erb %>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= @page_config[:meta][:title] %></title>
  <meta name="description" content="<%= @page_config[:meta][:description] %>">

  <% if @page_config[:meta][:og_image] %>
    <meta property="og:image" content="<%= @page_config[:meta][:og_image] %>">
  <% end %>

  <%# Website-specific Tailwind CSS from Octane CDN %>
  <link
    rel="stylesheet"
    href="<%= @page_config[:tailwind_config_url] %>"
  />

  <%# Preload the page payload for instant rendering %>
  <link
    rel="preload"
    href="<%= @page_config[:octane_base_url] %>/pages/<%= @page_config[:website_id] %>/<%= @page_config[:page_id] %>"
    as="fetch"
    crossorigin
  />

  <%# Font preloads will be injected by the rendering engine %>

  <%= javascript_include_tag "application", defer: true %>
</head>
<body>
  <div
    id="page-root"
    data-config="<%= @page_config.to_json %>"
  ></div>

  <%# Inline the config for immediate access %>
  <script type="application/json" id="page-config">
    <%= raw @page_config.to_json %>
  </script>
</body>
</html>
```

### 5.3 JavaScript Entry Point

```typescript
// app/javascript/application.ts (Rails asset pipeline / esbuild entry)

import { PageRenderer } from "@page-speed/blocks/core/renderer";
import { fetchPagePayload } from "@page-speed/blocks/api/fetch-payload";
import { createRoot } from "react-dom/client";
import React from "react";

// Import block registry — this registers all lazy loaders
import "@page-speed/blocks/core/register-all-blocks";

async function boot() {
  const configEl = document.getElementById("page-config");
  if (!configEl) return;

  const config = JSON.parse(configEl.textContent || "{}");

  // Fetch page payload from Octane (should be near-instant due to preload)
  const payload = await fetchPagePayload({
    baseUrl: config.octane_base_url,
    websiteId: config.website_id,
    pageId: config.page_id,
  });

  const root = createRoot(document.getElementById("page-root")!);

  root.render(
    React.createElement(PageRenderer, {
      payload,
      feedBaseUrl: config.octane_base_url,
      optixFlowConfig: config.optix_flow_config,
    })
  );
}

boot().catch(console.error);
```

---

## Phase 6: End-to-End Wiring & Testing

### 6.1 Full Request Lifecycle

```
1. Browser hits deloconsulting.com/blog
2. customer-sites Rails app:
   a. Looks up Website by domain → website_id="ws_delo"
   b. Resolves /blog → Page(slug="blog", token="pg_blog")
   c. Renders show.html.erb with config JSON
   d. Injects <link rel="preload"> for Octane payload URL

3. Browser loads JS bundle (@page-speed/blocks):
   a. Reads config from #page-config
   b. fetchPagePayload() → GET https://cdn.ing/pages/ws_delo/pg_blog
   c. Octane serves from Tigris K/V (ETag cached, Cloudflare edge-cached)
   d. PageRenderer receives payload, iterates blocks[]

4. For each block:
   a. resolveBlock(categoryId, blockId) → lazy import from @opensite/ui
   b. transformProps() converts icon descriptors, etc.
   c. If block has dataRefs → FeedResolver calls useFeed()
      - useFeed("blog", {...}) → GET https://cdn.ing/feeds/ws_delo/blog?limit=9
      - Octane queries Postgres, returns JSON, cached 30s
   d. Component renders with merged static + feed props

5. Blog posts containing markdown:
   a. MarkdownRenderer receives bodyMarkdown string
   b. markdown-to-jsx compiles to React elements
   c. <a> tags → Pressable (JS routing)
   d. <img> tags → page-speed Img (CDN-optimized)
   e. styleConfig applied to all elements
```

### 6.2 Implementation Order

| Step | Task | Effort | Dependencies |
|------|------|--------|-------------|
| 1 | Define `PagePayload` types in `@page-speed/blocks` | 2h | None |
| 2 | Implement Octane page endpoints (GET/PUT) | 4h | Tigris bucket |
| 3 | Implement Octane blog feed endpoint | 3h | Postgres blog_posts table |
| 4 | Build `@page-speed/markdown` package | 6h | markdown-to-jsx, @opensite/ui Pressable |
| 5 | Build block registry + register-all-blocks | 4h | @opensite/ui exports |
| 6 | Build props transformer | 3h | @opensite/ui DynamicIcon |
| 7 | Build PageRenderer + BlockRenderer | 6h | Steps 5, 6 |
| 8 | Build useFeed hook + FeedProvider | 4h | Step 3 |
| 9 | Build fetchPayload utility | 1h | Step 2 |
| 10 | customer-sites Rails integration | 4h | Steps 7, 8, 9 |
| 11 | Convert one prototype page to payload format | 2h | Steps 1-10 |
| 12 | End-to-end testing | 4h | All |

**Total estimated effort: ~43 hours**

### 6.3 Testing Strategy

```typescript
// __tests__/core/PageRenderer.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PageRenderer } from "../src/core/PageRenderer";
import { registerBlock } from "../src/core/registry";

// Mock block component
const MockHero = ({ heading }: { heading: string }) => (
  <section data-testid="hero">{heading}</section>
);

describe("PageRenderer", () => {
  beforeAll(() => {
    registerBlock("hero", "hero-simple", () =>
      Promise.resolve({ default: MockHero as any })
    );
  });

  it("renders blocks from payload", async () => {
    const payload = {
      version: 1 as const,
      pageId: "test",
      websiteId: "ws_test",
      updatedAt: "2026-03-05T00:00:00Z",
      meta: { title: "Test" },
      blocks: [
        {
          id: "blk_1",
          categoryId: "hero",
          blockId: "hero-simple",
          componentName: "HeroSimple",
          props: { heading: "Hello World" },
        },
      ],
    };

    render(
      <PageRenderer
        payload={payload}
        feedBaseUrl="https://cdn.ing"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("hero")).toHaveTextContent("Hello World");
    });
  });

  it("handles missing blocks gracefully in production", async () => {
    const payload = {
      version: 1 as const,
      pageId: "test",
      websiteId: "ws_test",
      updatedAt: "2026-03-05T00:00:00Z",
      meta: { title: "Test" },
      blocks: [
        {
          id: "blk_1",
          categoryId: "nonexistent",
          blockId: "no-such-block",
          componentName: "NoSuchBlock",
          props: {},
        },
      ],
    };

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const { container } = render(
      <PageRenderer payload={payload} feedBaseUrl="https://cdn.ing" />
    );

    // Should render nothing, not crash
    expect(container.querySelector("[data-testid]")).toBeNull();

    process.env.NODE_ENV = originalEnv;
  });
});
```

```typescript
// __tests__/core/MarkdownRenderer.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "../src/core/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders markdown to JSX", () => {
    render(
      <MarkdownRenderer>{"# Hello\n\nWorld"}</MarkdownRenderer>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
  });

  it("applies styleConfig classes", () => {
    const { container } = render(
      <MarkdownRenderer styleConfig={{ h1: "text-4xl font-bold text-red-500" }}>
        {"# Styled Heading"}
      </MarkdownRenderer>
    );
    const h1 = container.querySelector("h1");
    expect(h1?.className).toContain("text-4xl");
    expect(h1?.className).toContain("font-bold");
    expect(h1?.className).toContain("text-red-500");
  });

  it("blocks dangerous tags", () => {
    const { container } = render(
      <MarkdownRenderer>
        {"<script>alert('xss')</script>\n\n<iframe src='evil.com'></iframe>\n\nSafe content"}
      </MarkdownRenderer>
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("sanitizes javascript: hrefs", () => {
    const { container } = render(
      <MarkdownRenderer>
        {"[Click me](javascript:alert('xss'))"}
      </MarkdownRenderer>
    );
    const link = container.querySelector("a, [href]");
    // Pressable or fallback link should have sanitized href
    expect(link?.getAttribute("href")).not.toContain("javascript:");
  });

  it("blocks unsafe styleConfig values", () => {
    const { container } = render(
      <MarkdownRenderer
        styleConfig={{
          h1: 'text-xl" onclick="alert(1)',
        }}
      >
        {"# Test"}
      </MarkdownRenderer>
    );
    const h1 = container.querySelector("h1");
    // Should not contain the injected onclick
    expect(h1?.className).not.toContain("onclick");
  });
});
```

### 6.4 Bundle Size Targets

| Package | Target (gzipped) | Notes |
|---------|-------------------|-------|
| `@page-speed/blocks` core | < 8KB | Registry + renderer + types |
| `@page-speed/blocks` hooks | < 3KB | useFeed + FeedProvider |
| `@page-speed/markdown` | < 8KB | ~6KB from markdown-to-jsx + ~2KB wrapper |
| Block components | Lazy-loaded per page | Only blocks used on a page are loaded |

### 6.5 Critical Path for MVP Launch

1. **Week 1:** Octane endpoints (page GET/PUT, blog feed) + PagePayload types
2. **Week 2:** `@page-speed/markdown` complete + tested
3. **Week 2-3:** `@page-speed/blocks` (registry, renderer, feed hooks)
4. **Week 3:** Rails integration + one prototype page converted
5. **Week 4:** Testing, bundle analysis, performance validation against Core Web Vitals targets

This plan keeps Octane conservative and CDN-like (per the chosen approach), stores payloads with the critical `categoryId`/`blockId` composite key, provides full component override capability for markdown rendering (Pressable for links, Img for images), and establishes a clean rendering pipeline from Tigris → Octane → Rails → `@page-speed/blocks` → `@opensite/ui` components.
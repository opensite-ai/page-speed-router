import { PathMatch, RouteParams } from '../types';

/**
 * Cache for compiled regex patterns to avoid recompilation
 */
const patternCache = new Map<string, RegExp>();

/**
 * Matches a pathname against a route pattern
 * @param pathname - The current pathname to match
 * @param pattern - The route pattern (e.g., '/blog/:slug')
 * @param exact - Whether to require an exact match
 * @returns Match result with extracted parameters
 */
export function matchPath(
  pathname: string,
  pattern: string,
  exact: boolean = false
): PathMatch {
  const result: PathMatch = {
    isMatch: false,
    params: {},
    path: pathname,
  };

  // Handle root path edge case
  if (pattern === '/' && exact) {
    result.isMatch = pathname === '/';
    return result;
  }

  // Get or create regex for this pattern
  const regex = getPatternRegex(pattern, exact);
  const match = pathname.match(regex);

  if (match) {
    result.isMatch = true;

    // Extract named groups as params
    if (match.groups) {
      result.params = match.groups;
    }
  }

  return result;
}

/**
 * Gets or creates a regex for a route pattern
 * @param pattern - The route pattern
 * @param exact - Whether to match exactly
 * @returns Compiled RegExp
 */
function getPatternRegex(pattern: string, exact: boolean): RegExp {
  const cacheKey = `${pattern}:${exact}`;

  if (patternCache.has(cacheKey)) {
    return patternCache.get(cacheKey)!;
  }

  // Escape special regex characters except for param markers
  let regexPattern = pattern
    // Escape special characters
    .replace(/[.+*?^${}()|[\]\\]/g, '\\$&')
    // Replace :param with named capture groups
    .replace(/:(\w+)/g, '(?<$1>[^/]+)');

  // Add anchors based on exact match requirement
  if (exact) {
    regexPattern = `^${regexPattern}$`;
  } else {
    regexPattern = `^${regexPattern}`;
  }

  const regex = new RegExp(regexPattern);
  patternCache.set(cacheKey, regex);

  return regex;
}

/**
 * Extracts route parameters from a path given a pattern
 * @param pathname - The current pathname
 * @param pattern - The route pattern with parameters
 * @returns Extracted parameters
 */
export function extractParams(pathname: string, pattern: string): RouteParams {
  const match = matchPath(pathname, pattern, true);
  return match.params;
}

/**
 * Checks if a path matches any of the provided patterns
 * @param pathname - The path to check
 * @param patterns - Array of patterns to match against
 * @returns The first matching pattern and its params, or null
 */
export function findMatchingRoute(
  pathname: string,
  patterns: { path: string; exact?: boolean }[]
): PathMatch | null {
  for (const route of patterns) {
    const match = matchPath(pathname, route.path, route.exact);
    if (match.isMatch) {
      return match;
    }
  }
  return null;
}

/**
 * Builds a path from a pattern and params
 * @param pattern - The route pattern
 * @param params - The parameters to substitute
 * @returns The built path
 */
export function buildPath(pattern: string, params: RouteParams): string {
  let path = pattern;

  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, String(value));
  });

  return path;
}

/**
 * Normalizes a path by removing trailing slashes (except for root)
 * @param path - The path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  if (path === '/') return path;
  return path.replace(/\/+$/, '');
}
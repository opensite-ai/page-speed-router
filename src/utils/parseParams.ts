import { RouteParams } from '../types';

/**
 * Parses route parameters from a pathname given a pattern
 * This is a simpler alternative to matchPath for basic param extraction
 * @param pathname - The current pathname
 * @param pattern - The route pattern with parameters
 * @returns Extracted parameters
 */
export function parseParams(pathname: string, pattern: string): RouteParams {
  const params: RouteParams = {};

  // Split paths into segments
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  // If lengths don't match, no params to extract
  if (patternParts.length !== pathParts.length) {
    return params;
  }

  // Extract params from matching segments
  patternParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      const paramName = part.slice(1);
      params[paramName] = decodeURIComponent(pathParts[index]);
    }
  });

  return params;
}

/**
 * Serializes an object of parameters into a query string
 * @param params - The parameters to serialize
 * @returns Query string (without leading ?)
 */
export function serializeParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}

/**
 * Parses query string parameters from a search string
 * @param search - The search string (with or without leading ?)
 * @returns Parsed parameters
 */
export function parseQueryString(search: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Remove leading ? if present
  const queryString = search.startsWith('?') ? search.slice(1) : search;

  if (!queryString) return params;

  const searchParams = new URLSearchParams(queryString);

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Merges route params and query params into a single object
 * @param routeParams - Parameters from the route pattern
 * @param queryParams - Parameters from the query string
 * @returns Merged parameters (query params override route params)
 */
export function mergeParams(
  routeParams: RouteParams,
  queryParams: Record<string, string>
): RouteParams {
  return { ...routeParams, ...queryParams };
}

/**
 * Validates that required params are present
 * @param params - The parameters to validate
 * @param required - Array of required parameter names
 * @returns True if all required params are present
 */
export function validateParams(
  params: RouteParams,
  required: string[]
): boolean {
  return required.every(key => key in params && params[key] !== '');
}
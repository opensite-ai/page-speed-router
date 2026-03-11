import { createContext } from 'react';
import { RouterContextValue } from '../types';

/**
 * Context for sharing router state across the component tree
 * This context is optional - many hooks work without it
 */
export const RouterContext = createContext<RouterContextValue | null>(null);

/**
 * Display name for React DevTools
 */
RouterContext.displayName = 'RouterContext';
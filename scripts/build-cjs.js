import { writeFileSync } from 'fs';
import { join } from 'path';

// Create a proper CommonJS wrapper for the ESM module
const cjsWrapper = `'use strict';

// This is a CommonJS wrapper for the ESM module
// It uses dynamic import to load the ESM module and re-export everything

let esmModule;
const modulePromise = import('./index.js').then(m => {
  esmModule = m;
  return m;
});

// Helper to ensure module is loaded
async function ensureModule() {
  if (!esmModule) {
    await modulePromise;
  }
  return esmModule;
}

// Export all named exports
module.exports = new Proxy({}, {
  get(target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'then') return undefined; // Prevent treating as thenable

    // For synchronous access (which most bundlers use)
    if (esmModule) {
      return esmModule[prop];
    }

    // Return a function that will load the module first
    return async function(...args) {
      const mod = await ensureModule();
      const fn = mod[prop];
      if (typeof fn === 'function') {
        return fn(...args);
      }
      return fn;
    };
  }
});

// Also expose the promise for async initialization
module.exports.__modulePromise = modulePromise;

// Pre-load the module
modulePromise.catch(err => {
  console.error('Failed to load @page-speed/router ESM module:', err);
});
`;

// Write the CommonJS wrapper
writeFileSync(join('dist', 'index.cjs'), cjsWrapper);

console.log('Created CommonJS wrapper at dist/index.cjs');
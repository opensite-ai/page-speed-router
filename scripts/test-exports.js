#!/usr/bin/env node

// Test that all exports are accessible
console.log('Testing @page-speed/router exports...\n');

async function testExports() {
  try {
    // Test ESM imports
    console.log('Testing ESM exports...');
    const esmModule = await import('../dist/index.js');

    const requiredExports = [
      // Hooks used by consuming libraries
      'useNavigation',
      'useUrl',
      'useGoBack',
      'useParams',
      'useRouteMatch',
      'usePathname',
      'useSearchParams',
      'useHash',
      'useNavigate',
      'useUpdateSearchParams',
      'useBack',
      'useGoForward',
      'useParam',
      'useAllParams',
      'useIsActive',
      'useMultiMatch',

      // Utilities
      'isBrowser',
      'isSSR',
      'ssrSafe',
      'browserOnly',
      'safeWindow',
      'scrollToAnchor',
      'scrollToTop',
      'getScrollPosition',
      'matchPath',
      'extractParams',
      'findMatchingRoute',
      'buildPath',
      'normalizePath',
      'parseParams',
      'serializeParams',
      'parseQueryString',
      'mergeParams',
      'validateParams',

      // Components
      'RouterProvider',
      'RouterContext'
    ];

    let allPresent = true;
    for (const exportName of requiredExports) {
      if (!(exportName in esmModule)) {
        console.error(`❌ Missing ESM export: ${exportName}`);
        allPresent = false;
      } else {
        console.log(`✅ ${exportName}`);
      }
    }

    if (allPresent) {
      console.log('\n✅ All ESM exports are present!');
    } else {
      console.error('\n❌ Some ESM exports are missing!');
      process.exit(1);
    }

    // Test CommonJS
    console.log('\nTesting CommonJS exports...');
    const cjsModule = require('../dist/index.cjs');

    allPresent = true;
    for (const exportName of requiredExports) {
      if (!(exportName in cjsModule)) {
        console.error(`❌ Missing CJS export: ${exportName}`);
        allPresent = false;
      }
    }

    if (allPresent) {
      console.log('✅ All CommonJS exports are present!');
    } else {
      console.error('❌ Some CommonJS exports are missing!');
      process.exit(1);
    }

    console.log('\n🎉 All exports verified successfully!');

  } catch (error) {
    console.error('Error testing exports:', error);
    process.exit(1);
  }
}

testExports();
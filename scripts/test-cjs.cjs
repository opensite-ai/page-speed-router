#!/usr/bin/env node

// Test CommonJS exports
console.log('Testing CommonJS exports...\n');

const cjsModule = require('../dist/index.cjs');

const requiredExports = [
  // Critical exports used by consuming libraries
  'useNavigation',
  'useUrl',
  'isBrowser',
];

let allPresent = true;
for (const exportName of requiredExports) {
  if (!(exportName in cjsModule)) {
    console.error(`❌ Missing CJS export: ${exportName}`);
    allPresent = false;
  } else {
    console.log(`✅ ${exportName} is present`);
  }
}

if (allPresent) {
  console.log('\n✅ All critical CommonJS exports are present!');
} else {
  console.error('\n❌ Some CommonJS exports are missing!');
  process.exit(1);
}
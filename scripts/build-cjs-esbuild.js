import { build } from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Get all TypeScript source files
function getEntryPoints(dir, files = {}) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && !entry.includes('test') && !entry.includes('__')) {
      getEntryPoints(fullPath, files);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      if (!entry.includes('.test.') && !entry.includes('.spec.')) {
        // Create output path relative to src
        const relativePath = fullPath.replace('src/', '').replace(/\.tsx?$/, '');
        files[relativePath] = fullPath;
      }
    }
  }
  return files;
}

const entryPoints = getEntryPoints('src');

// Build CommonJS version
await build({
  entryPoints,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outdir: 'dist',
  outExtension: { '.js': '.cjs' },
  sourcemap: true,
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
});

console.log('Built CommonJS modules with esbuild');
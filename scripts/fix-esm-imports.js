import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Function to add .js extensions to relative imports
function fixImports(content) {
  // Fix relative imports that don't have extensions
  return content
    .replace(/from\s+['"](\.\.?\/[^'"]+)(?<!\.js)(?<!\.jsx)(?<!\.ts)(?<!\.tsx)['"]/g, "from '$1.js'")
    .replace(/import\s+['"](\.\.?\/[^'"]+)(?<!\.js)(?<!\.jsx)(?<!\.ts)(?<!\.tsx)['"]/g, "import '$1.js'");
}

// Recursively process all .js files in dist
function processDirectory(dir) {
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (extname(file) === '.js') {
      const content = readFileSync(fullPath, 'utf8');
      const fixed = fixImports(content);
      if (content !== fixed) {
        writeFileSync(fullPath, fixed);
        console.log(`Fixed imports in: ${fullPath}`);
      }
    }
  }
}

// Process the dist directory
processDirectory('dist');
console.log('ESM imports fixed!');
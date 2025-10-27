#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const searchCommand = "rg --files-with-matches 'getJwtSecret' backend/src/routes";
let fileListRaw = '';
try {
  fileListRaw = execSync(searchCommand, { encoding: 'utf8' });
} catch (error) {
  if (error.status === 1 && !error.stdout) {
    console.log('No route files contain getJwtSecret.');
    process.exit(0);
  }
  throw error;
}

const files = fileListRaw
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

if (files.length === 0) {
  console.log('No route files contain getJwtSecret.');
  process.exit(0);
}

const canonicalPath = "../utils/getJwtSecret.js";
const canonicalImport = `import getJwtSecret from '${canonicalPath}';`;

const replacements = [
  /import\s+\{\s*getJwtSecret\s*\}\s+from\s+['"]..\/utils\/(?:jwt|getJwtSecret)\.js['"];?/g,
  /import\s+getJwtSecret\s+from\s+['"]..\/utils\/jwt\.js['"];?/g,
  /import\s+\{\s*getJwtSecret\s*as\s*[^}]+\}\s+from\s+['"]..\/utils\/(?:jwt|getJwtSecret)\.js['"];?/g
];

for (const file of files) {
  const fileDir = path.dirname(file);
  if (!fileDir.endsWith('routes')) {
    // Skip files outside expected directory depth to avoid incorrect import paths.
    // They can be handled manually if they ever appear.
    console.warn(`Skipping ${file} because it is not directly under routes/`);
    continue;
  }
  const original = readFileSync(file, 'utf8');
  let updated = original;
  for (const pattern of replacements) {
    updated = updated.replace(pattern, canonicalImport);
  }

  if (updated !== original) {
    writeFileSync(file, updated, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`No changes needed for ${file}`);
  }
}

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git']);
const SKIP_FILES = new Set(['package-lock.json']);

/**
 * @param {string} dir
 * @param {string[]} files
 */
function collectJsonFiles(dir, files) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (SKIP_DIRS.has(entry.name))
      continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsonFiles(fullPath, files);
      continue;
    }

    if (!entry.name.endsWith('.json') || SKIP_FILES.has(entry.name))
      continue;

    files.push(fullPath);
  }
}

/**
 * @param {string} file
 * @returns {string|null}
 */
function validateJsonFile(file) {
  const source = fs.readFileSync(file, 'utf8');

  if (source.trim() === '')
    return 'file is empty';

  try {
    JSON.parse(source);
    return null;
  } catch (error) {
    return error.message;
  }
}

const files = [];
collectJsonFiles(ROOT, files);
files.sort();

let failed = false;

for (const file of files) {
  const relativePath = path.relative(ROOT, file);
  const errorMessage = validateJsonFile(file);

  if (errorMessage) {
    failed = true;
    console.error(`${relativePath}: ${errorMessage}`);
  }
}

if (failed)
  throw new Error('JSON validation failed');

console.log(`Validated ${files.length} JSON file(s).`);

import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve('src');
const localeDir = path.resolve('src/locales');

function collectKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(collectKeys(obj[k], p));
    } else {
      keys.push(p);
    }
  }
  return keys;
}

function extractUsedKeys() {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'locales') continue;
        walk(full);
      } else if (/\.(tsx?)$/.test(entry.name)) {
        files.push(full);
      }
    }
  }
  walk(srcDir);

  const keys = new Set();
  const regex = /(?<![a-zA-Z])t\(['"]([^'"]+?)['"][^)]*\)/g;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    // Only scan lines that actually contain t( to reduce noise
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.includes('t(')) continue;
      let m;
      while ((m = regex.exec(line))) {
        keys.add(m[1]);
      }
    }
  }
  return keys;
}

function loadLocale(filename) {
  const file = path.join(localeDir, filename);
  if (!fs.existsSync(file)) {
    throw new Error(`Locale file not found: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  const used = extractUsedKeys();
  const zh = loadLocale('zh.json');
  const en = loadLocale('en.json');

  const zhKeys = new Set(collectKeys(zh));
  const enKeys = new Set(collectKeys(en));

  const missingZh = [...used].filter((k) => !zhKeys.has(k));
  const missingEn = [...used].filter((k) => !enKeys.has(k));
  const extraZh = [...zhKeys].filter((k) => !used.has(k));
  const extraEn = [...enKeys].filter((k) => !used.has(k));

  let failed = false;

  if (missingZh.length) {
    console.error(`[check-i18n] Missing in zh.json: ${missingZh.length}`);
    for (const k of missingZh) console.error(`  - ${k}`);
    failed = true;
  }
  if (missingEn.length) {
    console.error(`[check-i18n] Missing in en.json: ${missingEn.length}`);
    for (const k of missingEn) console.error(`  - ${k}`);
    failed = true;
  }
  if (extraZh.length) {
    console.warn(`[check-i18n] Extra in zh.json: ${extraZh.length}`);
    for (const k of extraZh) console.warn(`  - ${k}`);
  }
  if (extraEn.length) {
    console.warn(`[check-i18n] Extra in en.json: ${extraEn.length}`);
    for (const k of extraEn) console.warn(`  - ${k}`);
  }

  if (failed) {
    process.exit(1);
  }
  console.log(`[check-i18n] OK: ${used.size} keys found in src, zh.json and en.json are in sync.`);
}

main();

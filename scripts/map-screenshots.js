/**
 * Map screenshot files to penta records and generate S3 URLs.
 *
 * Screenshots named: YYYYMMDD-ChampionName.ext
 * CDN base: https://images.eallion.com/images/penta/screenshot/
 *
 * Usage: node scripts/map-screenshots.js
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'penta.json');
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshot');
const CDN_BASE = 'https://images.eallion.com/images/penta/screenshot';

const pentas = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const files = fs.readdirSync(SCREENSHOT_DIR);

// Filesystem normalization: lowercase for matching
const fileMap = new Map();
for (const f of files) {
  const stat = fs.statSync(path.join(SCREENSHOT_DIR, f));
  if (stat.isFile()) {
    const key = f.toLowerCase();
    fileMap.set(key, f);
  }
}

function normalizeChampion(name) {
  return name
    .replace(/['\u00A0]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function dateToCompact(dateStr) {
  return dateStr.slice(0, 10).replace(/-/g, '');
}

const matched = [];
const missing = [];

for (const p of pentas) {
  const dateCompact = dateToCompact(p.date);
  const champNorm = normalizeChampion(p.champion);
  const possibleNames = [
    `${dateCompact}-${champNorm}.jpg`,
    `${dateCompact}-${champNorm}.png`,
    `${dateCompact}-${champNorm}.webp`,
  ];

  let found = null;

  // 1. Check standard YYYYMMDD-Champion.ext
  for (const name of possibleNames) {
    if (fileMap.has(name)) {
      found = fileMap.get(name);
      break;
    }
  }

  // 2. Numbered variants (multiple pentas same day: -1-, -2-)
  if (!found) {
    for (let i = 1; i <= 5; i++) {
      for (const ext of ['jpg', 'png', 'webp']) {
        const name = `${dateCompact}-${i}-${champNorm}.${ext}`;
        if (fileMap.has(name)) {
          found = fileMap.get(name);
          break;
        }
      }
      if (found) break;
    }
  }

  // 3. Duowan format: duowan_lol_{champion}_{date}_{time}.ext
  if (!found) {
    const champLower = p.champion.toLowerCase();
    const dateParts = p.date.slice(0, 10).split('-');
    const duowanDate = dateParts.join('');
    for (const ext of ['jpg', 'png', 'webp']) {
      const pattern = `duowan_lol_${champLower}_${duowanDate}`;
      for (const [fname] of fileMap) {
        if (fname.startsWith(pattern)) {
          found = fileMap.get(fname);
          break;
        }
      }
      if (found) break;
    }
  }

  // 4. Try without special characters in champion name (KogMaw → kogmaw)
  if (!found) {
    const bareChamp = champNorm.replace(/[^a-z0-9]/g, '');
    for (const ext of ['jpg', 'png', 'webp']) {
      const name = `${dateCompact}-${bareChamp}.${ext}`;
      if (fileMap.has(name)) {
        found = fileMap.get(name);
        break;
      }
    }
  }

  if (found) {
    matched.push({
      ...p,
      imageUrl: `${CDN_BASE}/${found}`,
      localFile: found
    });
  } else {
    missing.push(p);
  }
}

console.log('=== Screenshot Mapping Results ===\n');
console.log(`Total records: ${pentas.length}`);
console.log(`Matched: ${matched.length}`);
console.log(`Missing: ${missing.length}`);

if (missing.length > 0) {
  console.log('\n=== Missing Screenshots ===\n');
  for (const p of missing) {
    const dateCompact = dateToCompact(p.date);
    const champNorm = normalizeChampion(p.champion);
    const expectedName = `${dateCompact}-${champNorm}.jpg`;
    console.log(`[${p.id}] ${p.date.slice(0,10)} ${p.champion} (${p.name}) — expected: ${expectedName}`);
  }
}

console.log('\n=== KV Data (pentas:all) ===\n');
const kvData = matched.concat(missing.map(p => ({ ...p, imageUrl: '' })));
console.log(JSON.stringify(kvData, null, 2));

const maxId = kvData.reduce((max, r) => Math.max(max, r.id), 0);
console.log(`\n=== pentas:counter ===\n${maxId}`);

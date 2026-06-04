/**
 * Generate KV-ready data with matched screenshot URLs.
 * Usage: node scripts/generate-kv-data.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run the mapping script and capture output
const output = execSync('node ' + path.join(__dirname, 'map-screenshots.js'), { encoding: 'utf-8' });

// Extract the JSON array from the output (between "=== KV Data ===" and "=== pentas:counter ===")
const lines = output.split('\n');
let jsonStart = -1;
let jsonEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (jsonStart < 0 && lines[i].includes('KV Data')) {
    jsonStart = i + 2;
  }
  if (jsonStart > 0 && lines[i].includes('pentas:counter')) {
    jsonEnd = i - 2;
    break;
  }
}

const jsonStr = lines.slice(jsonStart, jsonEnd + 1).join('\n');
const kvData = JSON.parse(jsonStr);
const maxId = kvData.reduce((max, r) => Math.max(max, r.id), 0);

// Strip localFile field for KV storage
const cleanData = kvData.map(({ localFile, ...rest }) => rest);

console.log('=== Key: pentas:all ===\n');
console.log(JSON.stringify(cleanData, null, 2));
console.log(`\n=== Key: pentas:counter ===\n${maxId}`);
console.log(`\n=== Summary ===`);
console.log(`Total: ${cleanData.length}`);
console.log(`With imageUrl: ${cleanData.filter(d => d.imageUrl).length}`);
console.log(`Without imageUrl: ${cleanData.filter(d => !d.imageUrl).length}`);

/**
 * KV Seed Script
 *
 * Reads data/penta.json and outputs KV-ready data for EdgeOne console.
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'penta.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const pentas = JSON.parse(raw);

const records = pentas.map(p => ({
  id: p.id,
  heroId: p.heroId,
  name: p.name,
  champion: p.champion,
  title: p.title,
  date: p.date,
  imageUrl: ''  // Fill with actual COS CDN URL pattern after deployment
}));

const maxId = records.reduce((max, r) => Math.max(max, r.id), 0);

console.log('\n=== KV: pentas:all ===\n');
console.log(JSON.stringify(records, null, 2));

console.log('\n=== KV: pentas:counter ===');
console.log(maxId);

// Helper to generate SHA256 hash for a given password
const crypto = require('crypto');
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

console.log('\n=== KV: config:admin ===');
const password = process.argv[2] || 'your-password-here';
const tokenValue = crypto.randomUUID();
console.log(JSON.stringify({
  passwordHash: sha256(password),
  tokenValue: tokenValue
}, null, 2));

console.log('\n=== KV: config:cos (example — UPDATE WITH YOUR VALUES) ===');
console.log(JSON.stringify({
  secretId: 'your-secret-id',
  secretKey: 'your-secret-key',
  bucket: 'your-bucket',
  region: 'ap-guangzhou',
  pathPrefix: 'penta/images',
  cdnDomain: 'your-cdn-domain.com'
}, null, 2));

console.log(`\n---`);
console.log(`Admin password: ${password}`);
console.log(`Token: ${tokenValue}`);
console.log(`Password SHA256: ${sha256(password)}`);

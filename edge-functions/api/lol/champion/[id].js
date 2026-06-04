const DATADRAGON_BASE = 'https://ddragon.leagueoflegends.com';
const KV_CACHE_KEY = 'lol:champions';
const CACHE_TTL = 86400;

async function getChampionMap() {
  const cached = await KV.get(KV_CACHE_KEY, 'json');
  if (cached) return cached;

  const versionRes = await fetch(`${DATADRAGON_BASE}/api/versions.json`);
  const versions = await versionRes.json();
  const latest = versions[0];

  const [enRes, zhRes] = await Promise.all([
    fetch(`${DATADRAGON_BASE}/cdn/${latest}/data/en_US/champion.json`),
    fetch(`${DATADRAGON_BASE}/cdn/${latest}/data/zh_CN/champion.json`)
  ]);
  const [enData, zhData] = await Promise.all([enRes.json(), zhRes.json()]);

  const map = {};
  for (const [key, val] of Object.entries(enData.data)) {
    const zh = zhData.data[key];
    map[val.key] = {
      id: val.id,
      name: val.name,
      nameZh: zh?.name || val.name,
      title: val.title,
      titleZh: zh?.title || val.title
    };
  }

  await KV.put(KV_CACHE_KEY, JSON.stringify(map), { expirationTtl: CACHE_TTL });
  return map;
}

export async function onRequest(context) {
  try {
    const { id } = context.params;
    const champions = await getChampionMap();
    const champion = champions[id];
    if (!champion) {
      return new Response(JSON.stringify({ error: 'Champion not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify(champion), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
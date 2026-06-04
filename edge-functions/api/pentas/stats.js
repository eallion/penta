export async function onRequest(context) {
  try {
    const pentas = await KV.get('pentas:all', 'json') || [];
    const byChampion = {};
    const byYear = {};
    const byMap = {};
    const championSet = new Set();
    const mapSet = new Set();
    const yearSet = new Set();

    for (const p of pentas) {
      byChampion[p.champion] = (byChampion[p.champion] || 0) + 1;
      championSet.add(p.champion);

      const year = p.date.slice(0, 4);
      byYear[year] = (byYear[year] || 0) + 1;
      yearSet.add(year);

      const map = p.map || '';
      if (map) {
        byMap[map] = (byMap[map] || 0) + 1;
        mapSet.add(map);
      }
    }

    const currentYear = new Date().getFullYear();
    const allYears = [];
    for (let y = 2011; y <= currentYear; y++) {
      allYears.push({ year: String(y), count: byYear[String(y)] || 0 });
    }

    return new Response(JSON.stringify({
      total: pentas.length,
      byChampion,
      byYear,
      byMap,
      years: allYears,
      champions: [...championSet].sort(),
      maps: [...mapSet]
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

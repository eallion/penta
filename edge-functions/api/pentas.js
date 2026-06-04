export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const params = url.searchParams;

    const pentas = await KV.get('pentas:all', 'json') || [];

    let result = pentas;
    if (params.get('champion')) {
      result = result.filter(p => p.champion === params.get('champion'));
    }
    if (params.get('year')) {
      result = result.filter(p => p.date.slice(0, 4) === params.get('year'));
    }
    if (params.get('map')) {
      result = result.filter(p => p.map === params.get('map'));
    }
    if (params.get('title')) {
      result = result.filter(p => p.title === params.get('title'));
    }
    if (params.get('name')) {
      result = result.filter(p => p.name === params.get('name'));
    }

    const sort = params.get('sort') || 'desc';
    if (sort === 'asc') {
      result.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '50');
    const start = (page - 1) * limit;
    const paged = result.slice(start, start + limit);

    return new Response(JSON.stringify({
      data: paged,
      pagination: { page, limit, total: result.length, totalPages: Math.ceil(result.length / limit) }
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

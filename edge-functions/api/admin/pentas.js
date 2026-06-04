async function verifyToken(token) {
  const config = await KV.get('config:admin', 'json') || {};
  return token && config.tokenValue && token === config.tokenValue;
}

export async function onRequest(context) {
  try {
    const auth = context.request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!await verifyToken(auth)) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (context.request.method === 'GET') {
      const pentas = await KV.get('pentas:all', 'json') || [];
      return new Response(JSON.stringify(pentas), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (context.request.method === 'POST') {
      const data = await context.request.json();
      if (!data.champion || !data.imageUrl) {
        return new Response(JSON.stringify({ error: 'champion and imageUrl required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const pentas = await KV.get('pentas:all', 'json') || [];
      let counter = parseInt(await KV.get('pentas:counter') || '0');
      counter++;
      const newPenta = {
        id: counter,
        heroId: data.heroId || '',
        name: data.name || data.champion,
        champion: data.champion,
        title: data.title || '',
        map: data.map || '',
        date: data.date || new Date().toISOString(),
        imageUrl: data.imageUrl
      };
      pentas.push(newPenta);
      await KV.put('pentas:all', JSON.stringify(pentas));
      await KV.put('pentas:counter', String(counter));
      return new Response(JSON.stringify(newPenta), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

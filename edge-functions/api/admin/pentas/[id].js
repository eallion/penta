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

    const id = parseInt(context.params.id);
    const pentas = await KV.get('pentas:all', 'json') || [];
    const index = pentas.findIndex(p => p.id === id);

    if (index === -1) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (context.request.method === 'PUT') {
      const data = await context.request.json();
      pentas[index] = { ...pentas[index], ...data, id };
      await KV.put('pentas:all', JSON.stringify(pentas));
      return new Response(JSON.stringify(pentas[index]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (context.request.method === 'DELETE') {
      pentas.splice(index, 1);
      await KV.put('pentas:all', JSON.stringify(pentas));
      return new Response(JSON.stringify({ success: true }), {
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

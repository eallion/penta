export async function onRequest(context) {
  try {
    const pentas = await KV.get('pentas:all', 'json') || [];
    if (pentas.length === 0) {
      return new Response(JSON.stringify({ error: 'no pentas' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    const penta = pentas[Math.floor(Math.random() * pentas.length)];
    return new Response(JSON.stringify(penta), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function sha256(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  try {
    if (context.request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { password } = await context.request.json();

    // Password priority: env var → KV config → default 'penta'
    let expectedHash;
    if (context.env?.ADMIN_PASSWORD) {
      expectedHash = await sha256(context.env.ADMIN_PASSWORD);
    } else {
      const config = await KV.get('config:admin', 'json');
      if (config?.passwordHash) {
        expectedHash = config.passwordHash;
      } else {
        expectedHash = await sha256('penta');
      }
    }

    const givenHash = await sha256(password);
    if (givenHash !== expectedHash) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get or generate token
    const config = await KV.get('config:admin', 'json') || {};
    const token = config.tokenValue || crypto.randomUUID();

    return new Response(JSON.stringify({ token }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

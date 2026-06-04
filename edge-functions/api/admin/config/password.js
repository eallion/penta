async function sha256(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequest(context) {
  try {
    if (context.request.method !== 'PUT') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Verify admin token
    const auth = context.request.headers.get('Authorization');
    const config = (await KV.get('config:admin', 'json')) || {};
    if (!auth || !config.tokenValue || auth !== `Bearer ${config.tokenValue}`) {
      return unauthorized();
    }

    const { currentPassword, newPassword } = await context.request.json();

    // Verify current password
    let currentHash;
    if (context.env?.ADMIN_PASSWORD) {
      currentHash = await sha256(context.env.ADMIN_PASSWORD);
    } else if (config.passwordHash) {
      currentHash = config.passwordHash;
    } else {
      currentHash = await sha256('penta');
    }

    if (await sha256(currentPassword) !== currentHash) {
      return new Response(JSON.stringify({ error: 'current password is wrong' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!newPassword || newPassword.length < 4) {
      return new Response(JSON.stringify({ error: 'new password must be at least 4 chars' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newHash = await sha256(newPassword);
    const newConfig = {
      ...config,
      passwordHash: newHash
    };
    await KV.put('config:admin', JSON.stringify(newConfig));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

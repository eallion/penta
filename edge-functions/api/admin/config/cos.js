export async function onRequest(context) {
  try {
    const auth = context.request.headers.get('Authorization')?.replace('Bearer ', '');
    const adminConfig = await KV.get('config:admin', 'json') || {};
    if (!auth || !adminConfig.tokenValue || auth !== adminConfig.tokenValue) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (context.request.method === 'GET') {
      const cosConfig = await KV.get('config:cos', 'json') || {};
      const safeConfig = { ...cosConfig };
      delete safeConfig.secretKey;
      return new Response(JSON.stringify({ configured: !!cosConfig.secretId, config: safeConfig }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (context.request.method === 'PUT') {
      const data = await context.request.json();
      if (!data.secretId || !data.secretKey || !data.bucket || !data.region) {
        return new Response(JSON.stringify({ error: 'secretId, secretKey, bucket and region are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const cosConfig = {
        secretId: data.secretId,
        secretKey: data.secretKey,
        bucket: data.bucket,
        region: data.region,
        pathPrefix: data.pathPrefix || '',
        cdnDomain: data.cdnDomain || ''
      };
      await KV.put('config:cos', JSON.stringify(cosConfig));
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

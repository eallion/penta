export async function onRequest(context) {
  try {
    const auth = context.request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const config = await KV.get('config:cos', 'json') || {};
    if (!config.secretId || !config.secretKey) {
      return new Response(JSON.stringify({ error: 'COS not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const uuid = crypto.randomUUID();
    const pathPrefix = config.pathPrefix || 'images';
    const key = `${pathPrefix}/${uuid}.jpg`;
    const now = Math.floor(Date.now() / 1000);
    const expires = now + 600;
    const host = `${config.bucket}.cos.${config.region}.myqcloud.com`;

    const signTime = `${now};${expires}`;
    const keyTime = signTime;
    const signKey = await hmacSha1(config.secretKey, keyTime);
    const httpString = `put\n/${key}\n\nhost=${host}\n`;
    const sha1Hash = await sha1(httpString);
    const stringToSign = `sha1\n${signTime}\n${sha1Hash}\n`;
    const signature = await hmacSha1Hex(signKey, stringToSign);

    const authParams = [
      `q-sign-algorithm=sha1`,
      `q-ak=${config.secretId}`,
      `q-sign-time=${signTime}`,
      `q-key-time=${keyTime}`,
      `q-header-list=host`,
      `q-url-param-list=`,
      `q-signature=${signature}`
    ].join('&');

    const uploadUrl = `https://${host}/${key}?${authParams}`;
    const cdnUrl = config.cdnDomain
      ? `https://${config.cdnDomain}/${key}`
      : `https://${host}/${key}`;

    return new Response(JSON.stringify({
      uploadUrl,
      url: cdnUrl,
      key,
      expires
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function hmacSha1(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function hmacSha1Hex(key, data) {
  const sig = await hmacSha1(key, data);
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha1(data) {
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

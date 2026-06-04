export async function onRequest(context) {
  try {
    const siteKey = context.env?.TURNSTILE_SITE_KEY || '';
    return new Response(JSON.stringify({ siteKey }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

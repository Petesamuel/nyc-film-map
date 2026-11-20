// Password gate for the private Cloudflare copy. The password lives in the
// SITE_PASSWORD environment variable in Cloudflare, never in this repo.
export async function onRequest({ request, env, next }) {
  const pw = env.SITE_PASSWORD;
  if (!pw) return new Response('Site is locked.', { status: 503 });
  const h = request.headers.get('Authorization') || '';
  if (h.startsWith('Basic ')) {
    try {
      const dec = atob(h.slice(6));
      const given = dec.slice(dec.indexOf(':') + 1);
      if (given === pw) return next();
    } catch (e) {}
  }
  return new Response('Password required. Use any name and the password you were sent.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="NYC Then and Now (private preview)", charset="UTF-8"' },
  });
}

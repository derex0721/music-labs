interface Env {
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  VERIFICATION_SESSION_SECRET: string;
  CF_PAGES_BRANCH?: string;
}
const COOKIE = '__Host-ml-verified';
const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
async function key(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function issueSession(host: string, secret: string, now = Date.now()) {
  const payload = `${Math.floor(now / 1000) + 3600}.${crypto.randomUUID()}`;
  return `${payload}.${hex(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(`${host}:${payload}`)))}`;
}
export async function validSession(value: string, host: string, secret: string, now = Date.now()) {
  const match = /^(\d{10})\.([0-9a-f-]{36})\.([0-9a-f]{64})$/.exec(value);
  if (!match || +match[1] <= now / 1000 || +match[1] > now / 1000 + 3600) return false;
  const signature = Uint8Array.from(match[3].match(/../g)!, pair => parseInt(pair, 16));
  return crypto.subtle.verify('HMAC', await key(secret), signature, encoder.encode(`${host}:${match[1]}.${match[2]}`));
}
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
function challenge(sitekey: string) {
  return `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Music Labs · 安全驗證</title><link rel="stylesheet" href="/verification.css"><main><p class="brand">Music Labs</p><h1>進站前，請完成驗證</h1><p>Please verify that you are human to continue.</p><div class="cf-turnstile" data-sitekey="${escape(sitekey)}" data-action="entry" data-callback="verified" data-error-callback="verificationFailed" data-expired-callback="verificationExpired"></div><p id="status" role="status" aria-live="polite">正在載入安全驗證…</p><button id="retry" type="button">重新載入 / Retry</button><noscript>請啟用 JavaScript 以完成驗證。</noscript></main><script src="/verification.js"></script><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script></html>`;
}
export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const respond = (body: BodyInit | null, status = 200, extra: Record<string, string> = {}) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', ...extra } });
  const preview = env.CF_PAGES_BRANCH !== 'main';
  if (url.pathname === '/robots.txt') return respond(preview ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n');
  if (['/verification.js', '/verification.css'].includes(url.pathname) && ['GET', 'HEAD'].includes(request.method)) return next();
  if (!env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY || (env.VERIFICATION_SESSION_SECRET?.length ?? 0) < 32) return respond('安全驗證尚未設定完成，請稍後再試。 Verification unavailable.', 503);
  if (url.pathname === '/__verify') {
    if (request.method !== 'POST') return respond('Method not allowed', 405, { Allow: 'POST' });
    if (request.headers.get('Origin') !== url.origin) return respond('Invalid origin', 403);
    try {
      // Bound the streamed body, including requests without Content-Length.
      const reader = request.body?.getReader();
      if (!reader) return respond('Missing token', 400);
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 4096) { await reader.cancel(); return respond('Request too large', 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const { token } = JSON.parse(new TextDecoder().decode(bytes));
      if (typeof token !== 'string' || !token || token.length > 2048) return respond('Invalid token', 400);
      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token }), signal: AbortSignal.timeout(8000) });
      if (!verification.ok) return respond('Verification unavailable', 503);
      const result = await verification.json() as { success?: boolean; hostname?: string; action?: string };
      if (!result.success || result.hostname !== url.hostname || result.action !== 'entry') return respond('Verification failed. Please retry.', 403);
      const session = await issueSession(url.host, env.VERIFICATION_SESSION_SECRET);
      return respond(null, 204, { 'Set-Cookie': `${COOKIE}=${session}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax` });
    } catch { return respond('Verification unavailable. Please retry.', 503); }
  }
  const cookie = request.headers.get('Cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? '';
  if (!await validSession(cookie, url.host, env.VERIFICATION_SESSION_SECRET)) {
    if (!['GET', 'HEAD'].includes(request.method) || url.pathname.startsWith('/api/')) return respond(JSON.stringify({ error: 'Verification required' }), 401, { 'Content-Type': 'application/json' });
    return respond(request.method === 'HEAD' ? null : challenge(env.TURNSTILE_SITE_KEY), 200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
  }
  const upstream = await next();
  const response = new Response(upstream.body, upstream);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.append('Vary', 'Cookie');
  if (preview) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
};

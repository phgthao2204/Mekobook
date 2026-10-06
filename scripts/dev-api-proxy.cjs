const https = require('node:https');
const PREFIX = '/__mekobook_api';
const MEDIA_PREFIX = '/__mekobook_media';
function allowedMediaRequest(method, path) {
  return (method === 'GET' || method === 'HEAD') && /^\/flipbooks\/[a-z0-9_\-/]+\.(jpe?g|png|webp)$/i.test(path);
}
function allowedRequest(method, path) {
  if (method === 'POST') return path === '/o/oauth2/token';
  return method === 'GET' && (path === '/o/headless-admin-user/v1.0/my-user-account'
    || /^\/o\/c\/(books|chaptertocs|userpreferences|readingprogresses|drmlicenses)(\/\d+)?$/.test(path));
}
function createDevApiProxy(baseUrl, middleware, transport = https) {
  return (req, res, next) => {
    const media = req.url.startsWith(MEDIA_PREFIX + '/');
    if (!media && !req.url.startsWith(PREFIX + '/')) return middleware(req, res, next);
    const fail = status => { if (!res.headersSent) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end('{"error":"dev_proxy_request_failed"}'); } else res.destroy(); };
    let target;
    try {
      const base = new URL(baseUrl);
      if (base.protocol !== 'https:' || base.hostname !== 'serrated-catacomb-vendor.ngrok-free.dev') return fail(503);
      // No arbitrary destinations, redirects, writes, cookies or traversal.
      const rawPath = req.url.slice((media ? MEDIA_PREFIX : PREFIX).length);
      if (/(\.\.|%2e|%2f|%5c|\\)/i.test(rawPath.split('?')[0])) return fail(400);
      target = new URL(rawPath, base.origin);
      if (!(media ? allowedMediaRequest : allowedRequest)(req.method, target.pathname)) return fail(405);
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return fail(403);
    } catch { return fail(400); }
    const headers = { Accept: media ? 'image/*' : 'application/json', 'ngrok-skip-browser-warning': 'true' };
    if (!media && req.headers.authorization) headers.Authorization = req.headers.authorization;
    if (!media && req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    const upstream = transport.request(target, { method: req.method, headers }, response => {
      if (media && response.statusCode === 200 && !/^image\//i.test(response.headers['content-type'] || '')) {
        response.resume(); return fail(502);
      }
      res.writeHead(response.statusCode || 502, {
        'Content-Type': response.headers['content-type'] || 'application/json', 'Cache-Control': 'no-store',
      });
      response.on('error', () => fail(502));
      response.pipe(res);
    });
    upstream.setTimeout(15000, () => { fail(504); upstream.destroy(); });
    upstream.on('error', () => fail(502));
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
  };
}
module.exports = { createDevApiProxy, allowedRequest, allowedMediaRequest };

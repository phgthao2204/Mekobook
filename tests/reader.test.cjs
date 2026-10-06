const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Module = require('node:module');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.test';
const { clampPage, hasReadAccess, normalizePreferences, latestProgress } = require('../src/utils/reader.ts');
const { apiHttp, setApiAccessToken, setSessionRenewal, getMediaRequestHeaders } = require('../src/services/http.ts');
const { getBooks, normalizeServerUrl, getPageImageUrl, normalizeDrmLicense } = require('../src/services/api.ts');
const { prepareReader } = require('../src/services/reader.ts');
const { generateFlipbookHtml } = require('../src/component/flipbook/flipbookEngineHtml.ts');
const { AxiosError } = require('axios');
const { ENV } = require('../src/constants/env.ts');
const { authHttp } = require('../src/services/http.ts');
let storedSession = null;
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'expo-secure-store') return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'test-accessibility',
    getItemAsync: async () => storedSession,
    setItemAsync: async (_key, value) => { storedSession = value; },
    deleteItemAsync: async () => { storedSession = null; },
  };
  return originalLoad.call(this, name, ...args);
};
const auth = require('../src/services/auth.ts');
Module._load = originalLoad;
const book = { id: 1, title: 'Sách kiểm thử', author: 'Tác giả', totalPages: 10,
  coverUrl: 'https://example.test/cover.jpg', flipbookBaseUrl: 'https://example.test/pages/', screenPattern: 'mobile/{page}.jpg', isFree: false };
function respond(config, data) { return { config, data, status: 200, statusText: 'OK', headers: {} }; }

test('web dev proxy only permits documented reads and OAuth grants', () => {
  const { allowedRequest } = require('../scripts/dev-api-proxy.cjs');
  assert.equal(allowedRequest('GET', '/o/c/books'), true);
  assert.equal(allowedRequest('GET', '/o/c/books/32884'), true);
  assert.equal(allowedRequest('POST', '/o/oauth2/token'), true);
  assert.equal(allowedRequest('POST', '/o/c/readingprogresses'), false);
  assert.equal(allowedRequest('DELETE', '/o/c/books/32884'), false);
  assert.equal(allowedRequest('GET', '/o/c/books/../drmlicenses'), false);
  assert.equal(allowedRequest('GET', '/external'), false);
});
test('dev proxy forwards Connect next so Metro fallback routes do not crash', () => {
  const { createDevApiProxy } = require('../scripts/dev-api-proxy.cjs');
  let called = false;
  const next = () => { called = true; };
  const req = { url: '/unhandled-metro-route' };
  const res = {};
  const handler = createDevApiProxy('https://example.test', (request, response, fallback) => {
    assert.equal(request, req);
    assert.equal(response, res);
    assert.equal(fallback, next);
    fallback();
  });
  handler(req, res, next);
  assert.equal(called, true);
});
test('media proxy is restricted to public flipbook images and never arbitrary destinations/writes', () => {
  const { allowedMediaRequest } = require('../scripts/dev-api-proxy.cjs');
  assert.equal(allowedMediaRequest('GET', '/flipbooks/demo/files/mobile/2.jpg'), true);
  assert.equal(allowedMediaRequest('HEAD', '/flipbooks/covers/demo.png'), true);
  assert.equal(allowedMediaRequest('POST', '/flipbooks/demo/files/mobile/2.jpg'), false);
  assert.equal(allowedMediaRequest('GET', '/o/oauth2/token'), false);
  assert.equal(allowedMediaRequest('GET', '/flipbooks/../private.jpg'), false);
  assert.equal(allowedMediaRequest('GET', '/flipbooks/demo/script.js'), false);
});
test('media proxy adds ngrok header, strips credentials and streams image bytes', async () => {
  const { PassThrough } = require('node:stream');
  const { createDevApiProxy } = require('../scripts/dev-api-proxy.cjs');
  const req = new PassThrough();
  Object.assign(req, { url: '/__mekobook_media/flipbooks/demo/mobile/2.jpg', method: 'GET',
    headers: { host: 'localhost:8081', authorization: 'Bearer synthetic-token' } });
  const res = new PassThrough();
  res.writeHead = (status, headers) => { res.statusCode = status; res.headers = headers; };
  const chunks = [];
  res.on('data', value => chunks.push(value));
  const done = new Promise(resolve => res.on('end', resolve));
  const transport = { request: (url, options, callback) => {
    assert.equal(url.origin, 'https://serrated-catacomb-vendor.ngrok-free.dev');
    assert.equal(options.headers['ngrok-skip-browser-warning'], 'true');
    assert.equal(options.headers.Authorization, undefined);
    const response = new PassThrough();
    Object.assign(response, { statusCode: 200, headers: { 'content-type': 'image/jpeg' } });
    callback(response);
    queueMicrotask(() => response.end(Buffer.from([255, 216, 255, 217])));
    const upstream = new PassThrough();
    upstream.setTimeout = () => {};
    return upstream;
  }};
  createDevApiProxy('https://serrated-catacomb-vendor.ngrok-free.dev', () => assert.fail('Unexpected fallback'), transport)(req, res, () => {});
  req.end();
  await done;
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'image/jpeg');
  assert.deepEqual(Buffer.concat(chunks), Buffer.from([255, 216, 255, 217]));
});
test('web dev images use absolute local proxy URLs; native/production/external images stay unchanged', () => {
  const { webDevMediaUrl } = require('../src/utils/media.ts');
  const oldWindow = global.window;
  const oldDev = global.__DEV__;
  try {
    global.window = { location: { origin: 'http://localhost:8081' } };
    global.__DEV__ = true;
    assert.equal(webDevMediaUrl('https://example.test/flipbooks/demo/mobile/2.jpg'), 'http://localhost:8081/__mekobook_media/flipbooks/demo/mobile/2.jpg');
    assert.equal(webDevMediaUrl('https://outside.test/flipbooks/2.jpg'), 'https://outside.test/flipbooks/2.jpg');
    assert.equal(webDevMediaUrl('https://example.test/flipbooks/demo/files/'), 'https://example.test/flipbooks/demo/files/');
    global.__DEV__ = false;
    assert.equal(webDevMediaUrl('https://example.test/flipbooks/2.jpg'), 'https://example.test/flipbooks/2.jpg');
    delete global.window;
    global.__DEV__ = true;
    assert.equal(webDevMediaUrl('https://example.test/flipbooks/2.jpg'), 'https://example.test/flipbooks/2.jpg');
  } finally {
    if (oldWindow === undefined) delete global.window; else global.window = oldWindow;
    if (oldDev === undefined) delete global.__DEV__; else global.__DEV__ = oldDev;
  }
});
test('page clamp and access never grant expired/unknown licenses', () => {
  assert.equal(clampPage(0, 10), 1); assert.equal(clampPage(15, 10), 10);
  assert.equal(clampPage(NaN, 10), 1);
  assert.equal(hasReadAccess(false, [{ status: 'EXPIRED' }]), false);
  assert.equal(hasReadAccess(false, [{ status: 'ACTIVE' }]), true);
  assert.equal(hasReadAccess(true, []), true);
});
test('preferences use documented API names and safe defaults', () => {
  const prefs = normalizePreferences({ themeMode: 'SYSTEM', brightness: 5, pageTurnEffect: 'FADE', dualPageMode: true, pageTurnSoundEnabled: true });
  assert.equal(prefs.brightness, 1); assert.equal(prefs.pageTurnEffect, 'FADE');
  assert.equal(prefs.dualPageMode, true); assert.equal(prefs.pageTurnSoundEnabled, true);
  assert.equal(normalizePreferences({ brightness: NaN, pageTurnEffect: 'bad' }).brightness, 1);
  assert.equal(latestProgress([{ currentPage: 2, lastReadTimestamp: 1 }, { currentPage: 8, lastReadTimestamp: 3 }]).currentPage, 8);
});
test('web dev session storage restores in the tab and clears on logout', async () => {
  const storage = require('../src/services/sessionStorage.web.ts');
  const originalWindow = global.window;
  const values = new Map();
  global.window = { sessionStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }};
  try {
    assert.equal(await storage.getItemAsync('session'), null);
    await storage.setItemAsync('session', 'synthetic-session');
    assert.equal(await storage.getItemAsync('session'), 'synthetic-session');
    await storage.deleteItemAsync('session');
    assert.equal(await storage.getItemAsync('session'), null);
  } finally {
    if (originalWindow === undefined) delete global.window;
    else global.window = originalWindow;
  }
});
test('Liferay workflow objects never become active DRM entitlements or render as objects', () => {
  const license = normalizeDrmLicense({ id: 1, status: { code: 0, label: 'approved' } });
  assert.equal(license.status, 'UNKNOWN');
  assert.equal(license.workflowStatus, 'approved');
  assert.equal(hasReadAccess(false, [license]), false);
  assert.equal(normalizeDrmLicense({ status: 'ACTIVE' }).status, 'ACTIVE');
  assert.equal(normalizeDrmLicense({ status: null }).status, 'UNKNOWN');
});
test('localhost URLs are normalized; unsafe schemes rejected; page numbering preserved', () => {
  assert.equal(normalizeServerUrl('http://localhost:8080/documents/a.jpg'), 'https://example.test/documents/a.jpg');
  assert.equal(normalizeServerUrl('/documents/a.jpg'), 'https://example.test/documents/a.jpg');
  assert.equal(normalizeServerUrl('http://192.168.1.254:8080/flipbooks/a/mobile/1.jpg'), 'https://example.test/flipbooks/a/mobile/1.jpg');
  assert.equal(normalizeServerUrl('http://192.168.1.99:8080/a.jpg'), 'http://192.168.1.99:8080/a.jpg');
  assert.throws(() => normalizeServerUrl('javascript:alert(1)'));
  assert.equal(getPageImageUrl(book, 1), 'https://example.test/pages/mobile/1.jpg');
});
test('media does not leak access token to a different content origin', () => {
  setApiAccessToken('test-token');
  assert.equal(getMediaRequestHeaders('https://example.test/cover.jpg').Authorization, 'Bearer test-token');
  assert.equal(getMediaRequestHeaders('https://other.test/cover.jpg').Authorization, undefined);
  setApiAccessToken(null);
});
test('catalog paginates and does not return fictional books on server errors', async () => {
  let calls = 0;
  apiHttp.defaults.adapter = async config => { calls++; return respond(config, { items: [{ ...book, id: calls }], lastPage: 2 }); };
  assert.equal((await getBooks()).length, 2); assert.equal(calls, 2);
  apiHttp.defaults.adapter = async config => { throw new AxiosError('Server failure', 'ERR_BAD_RESPONSE', config, null, { status: 500 }); };
  await assert.rejects(getBooks());
});
test('reader rechecks DRM, restores progress and applies preferences; only GET endpoints', async () => {
  let active = true;
  apiHttp.defaults.adapter = async config => {
    assert.equal(config.method, 'get');
    if (config.url.endsWith('/books/1')) return respond(config, book);
    if (config.url.endsWith('/drmlicenses')) return respond(config, { items: [{ id: 4, bookId: 1, status: active ? 'ACTIVE' : 'EXPIRED' }] });
    if (config.url.endsWith('/readingprogresses')) {
      assert.equal(config.params.filter, 'bookId eq 1');
      return respond(config, { items: [{ bookId: 1, currentPage: 7, percentage: 70 }] });
    }
    if (config.url.endsWith('/userpreferences')) return respond(config, { items: [{ themeMode: 'DARK', dualPageMode: true }] });
    throw new Error('Unexpected API');
  };
  const result = await prepareReader(1, 'continue');
  assert.equal(result.initialPage, 7); assert.equal(result.preferences.themeMode, 'DARK');
  assert.equal((await prepareReader(1, 'start')).initialPage, 1);
  active = false; await assert.rejects(prepareReader(1, 'continue'), /giấy phép/);
});
test('concurrent 401 responses share one renewal and retry only once', async () => {
  let renewals = 0;
  setApiAccessToken('old');
  setSessionRenewal(async () => { renewals++; await new Promise(resolve => setTimeout(resolve, 5)); setApiAccessToken('new'); return 'new'; });
  apiHttp.defaults.adapter = async config => {
    if (config.headers.Authorization === 'Bearer new') return respond(config, { ok: true });
    throw new AxiosError('Unauthorized', 'ERR_BAD_RESPONSE', config, null, { status: 401 });
  };
  await Promise.all([apiHttp.get('/a'), apiHttp.get('/b')]); assert.equal(renewals, 1);
  setSessionRenewal(async () => 'still-invalid'); setApiAccessToken('old');
  apiHttp.defaults.adapter = async config => { throw new AxiosError('Unauthorized', 'ERR_BAD_RESPONSE', config, null, { status: 401 }); };
  await assert.rejects(apiHttp.get('/a'));
  setSessionRenewal(null); setApiAccessToken(null);
});
test('generated engine scripts parse and wire preferences/zoom/load before ready safely', () => {
  for (const effect of ['CURL_3D', 'SLIDE', 'FADE']) {
    const html = generateFlipbookHtml({ book: { ...book, title: '<script>alert(1)</script>' }, initialPage: 7,
      preferences: normalizePreferences({ pageTurnEffect: effect, dualPageMode: true }) });
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 2);
    scripts.forEach(([, source]) => new vm.Script(source));
    assert.ok(html.indexOf("pageFlipInstance.on('init'") < html.indexOf('pageFlipInstance.loadFromHTML'));
    assert.ok(html.includes('await waitForPage(initialPage)'));
    assert.ok(html.includes("case 'ZOOM'"));
    assert.ok(!html.includes('<title><script>'));
  }
});

test('engine bridge initializes once, sends ready, zooms/pans and applies effects', async () => {
  for (const effect of ['CURL_3D', 'SLIDE', 'FADE']) {
    const messages = [], windowEvents = {}, bookEvents = {}, handlers = {};
    const images = Array.from({ length: 10 }, () => ({ complete: true, naturalWidth: 100,
      src: '', getAttribute: () => 'https://example.test/p.jpg', removeAttribute() {}, addEventListener() {}, removeEventListener() {} }));
    const bookEl = { style: {}, addEventListener: (name, handler) => { bookEvents[name] = handler; }, setPointerCapture() {}, animate() {} };
    const loadingEl = { style: {} }, container = { style: {} };
    const pages = images.map((image, i) => ({ getAttribute: () => String(i + 1), querySelector: () => image }));
    let instances = 0, turns = 0, current = 6;
    const document = {
      body: { style: {} }, getElementById: id => ({ book: bookEl, 'loading-indicator': loadingEl, 'flipbook-container': container })[id],
      querySelectorAll: () => pages, querySelector: query => images[Number(query.match(/data-page="(\d+)"/)[1]) - 1], addEventListener() {},
    };
    const window = { innerWidth: 390, innerHeight: 800,
      ReactNativeWebView: { postMessage: value => messages.push(JSON.parse(value)) },
      addEventListener: (name, handler) => { windowEvents[name] = handler; } };
    class PageFlip {
      constructor() { instances++; }
      on(name, handler) { handlers[name] = handler; }
      loadFromHTML() { handlers.init(); }
      getCurrentPageIndex() { return current; }
      getState() { return 'read'; }
      flipNext() { turns++; current++; handlers.flip({ data: current }); }
      flipPrev() { turns++; current--; handlers.flip({ data: current }); }
      flip(index) { turns++; current = index; handlers.flip({ data: current }); }
      turnToPage(index) { this.flip(index); }
      destroy() {}
    }
    const html = generateFlipbookHtml({ book, initialPage: 7, preferences: normalizePreferences({ pageTurnEffect: effect, brightness: 0.5 }) });
    const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
    vm.runInNewContext(script, { window, document, St: { PageFlip }, setTimeout, clearTimeout, console });
    await window.onload();
    assert.equal(instances, 1); assert.equal(messages[0].type, 'ENGINE_READY');
    assert.ok(bookEl.style.filter.includes('brightness(0.5)'));
    windowEvents.message({ data: { type: 'ZOOM', scale: 2 } });
    assert.ok(bookEl.style.transform.includes('scale(2)'));
    bookEvents.pointerdown({ clientX: 10, clientY: 10, pointerId: 1, preventDefault() {}, stopImmediatePropagation() {} });
    bookEvents.pointermove({ clientX: 45, clientY: 70, preventDefault() {}, stopImmediatePropagation() {} });
    assert.ok(bookEl.style.transform.includes('translate(35px,60px)'));
    windowEvents.message({ data: { type: 'TURN_NEXT' } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(turns, 1); assert.equal(instances, 1);
    assert.ok(messages.some(message => message.type === 'PAGE_CHANGED' && message.page === 8));
  }
});

function mockAuth() {
  // Synthetic test values only; no project credentials are used by this suite.
  ENV.OAUTH.CLIENT_ID = 'synthetic-client';
  ENV.OAUTH.CLIENT_SECRET = 'synthetic-secret';
  authHttp.defaults.adapter = async config => {
    if (config.url.endsWith('/oauth2/token')) {
      const form = new URLSearchParams(config.data);
      assert.ok(['password', 'refresh_token'].includes(form.get('grant_type')));
      return respond(config, { access_token: form.get('grant_type') === 'password' ? 'token-one' : 'token-two',
        refresh_token: 'refresh-one', expires_in: 3600 });
    }
    return respond(config, { id: 3, name: 'Test Reader', emailAddress: 'reader@example.test' });
  };
}
test('login/restore/refresh/logout persist tokens but not the password', async () => {
  mockAuth();
  const session = await auth.login('reader', 'synthetic-password');
  assert.equal(session.user.name, 'Test Reader');
  assert.equal(session.accessToken, 'token-one');
  assert.equal(storedSession.includes('synthetic-password'), false);
  assert.equal(storedSession.includes('synthetic-secret'), false);
  assert.equal((await auth.restoreSession()).accessToken, 'token-one');
  assert.equal((await auth.refreshSession(session)).accessToken, 'token-two');
  await auth.logout(); assert.equal(storedSession, null);
  assert.equal(getMediaRequestHeaders('https://example.test/cover.jpg').Authorization, undefined);
});
test('refresh response after logout cannot resurrect a session', async () => {
  mockAuth();
  const session = await auth.login('reader', 'synthetic-password');
  let release;
  authHttp.defaults.adapter = async config => {
    if (config.url.endsWith('/oauth2/token')) return new Promise(resolve => { release = () => resolve(respond(config, { access_token: 'stale-token', expires_in: 3600 })); });
    return respond(config, { id: 3, name: 'Test Reader' });
  };
  const pending = auth.refreshSession(session);
  const rejected = assert.rejects(pending, /Phiên đăng nhập đã thay đổi/);
  await new Promise(resolve => setImmediate(resolve));
  await auth.logout(); release(); await rejected;
  assert.equal(storedSession, null);
  assert.equal(getMediaRequestHeaders('https://example.test/cover.jpg').Authorization, undefined);
});
test('invalid credentials and expired stored refresh token do not open the app', async () => {
  mockAuth();
  const session = await auth.login('reader', 'synthetic-password');
  authHttp.defaults.adapter = async config => ({ ...respond(config, { error: 'invalid_grant' }), status: 401 });
  await assert.rejects(auth.login('reader', 'wrong-test-password'), /không chính xác/);
  storedSession = JSON.stringify({ ...session, expiresAt: 1 });
  assert.equal(await auth.restoreSession(), null);
  assert.equal(storedSession, null);
});
test('OAuth configuration errors and missing refresh tokens are reported explicitly', async () => {
  mockAuth();
  authHttp.defaults.adapter = async config => ({ ...respond(config, { error: 'invalid_client' }), status: 400 });
  await assert.rejects(auth.login('reader', 'synthetic-password'), /cấu hình OAuth client/);
  authHttp.defaults.adapter = async config => respond(config, { access_token: 'synthetic-token', expires_in: 3600 });
  await assert.rejects(auth.login('reader', 'synthetic-password'), /chưa cấp refresh token/);
  assert.equal(storedSession, null);
});

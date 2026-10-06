// Read-only staging check. Supply test credentials through the process
// environment, never EXPO_PUBLIC variables or a tracked file.
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'expo-secure-store') return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 0,
    getItemAsync: async () => null,
    setItemAsync: async () => {},
    deleteItemAsync: async () => {},
  };
  return originalLoad.call(this, name, ...args);
};
const auth = require('../src/services/auth.ts');
Module._load = originalLoad;
const api = require('../src/services/api.ts');
const reader = require('../src/services/reader.ts');

(async () => {
  if (!process.env.MEKOBOOK_TEST_USERNAME || !process.env.MEKOBOOK_TEST_PASSWORD) {
    throw new Error('Missing test credentials');
  }
  const session = await auth.login(process.env.MEKOBOOK_TEST_USERNAME, process.env.MEKOBOOK_TEST_PASSWORD);
  console.log(JSON.stringify({ login: true, profileAvailable: !session.user.profileUnavailable }));
  const renewed = await auth.refreshSession(session);
  console.log(JSON.stringify({ refresh: !!renewed.accessToken }));
  const books = await api.getBooks();
  const preferences = await api.getUserPreferences();
  console.log(JSON.stringify({ bookCount: books.length, preferenceCount: preferences.length }));
  const book = books.find(value => value.isFree && !value.isEncrypted);
  if (book) {
    const prepared = await reader.prepareReader(book.id, 'continue');
    console.log(JSON.stringify({ prepared: true, initialPage: prepared.initialPage,
      totalPages: prepared.book.totalPages, preferenceTheme: prepared.preferences.themeMode }));
    const image = await fetch(api.getPageImageUrl(prepared.book, prepared.initialPage), {
      headers: { 'ngrok-skip-browser-warning': 'true' }, signal: AbortSignal.timeout(15000),
    });
    console.log(JSON.stringify({ pageImageStatus: image.status, pageImageType: image.headers.get('content-type') }));
    await image.body?.cancel();
  }
  for (const paid of books.filter(value => !value.isFree)) {
    const access = await reader.getBookAccess(paid.id);
    if (!access.licenses.length) continue;
    console.log(JSON.stringify({ paidBookCanRead: access.canRead, licenseCount: access.licenses.length,
      unknownDrmStatus: access.licenses.some(value => value.status === 'UNKNOWN') }));
    break;
  }
})().catch(() => {
  // Never print Axios error objects: they can contain credential headers/body.
  console.error('Live API check failed; inspect the server contract/configuration without logging credentials.');
  process.exitCode = 1;
}).finally(() => auth.logout());

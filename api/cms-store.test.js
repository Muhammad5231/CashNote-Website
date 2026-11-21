'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_CONTENT, CmsError, normalizeContent, validateAssetPath, createCmsStore } = require('./lib/cms-store');

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeRepoFetch(initialFiles = {}) {
  const files = new Map(Object.entries(initialFiles).map(([path, content]) => [path, { content, sha: `sha-${path}` }]));
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname.split('/contents/')[1] || '');
    calls.push({ method: options.method || 'GET', path, headers: options.headers || {} });
    if ((options.method || 'GET') === 'GET') {
      const file = files.get(path);
      if (!file) return jsonResponse({ message: 'Not Found' }, 404);
      return jsonResponse({ type: 'file', sha: file.sha, content: Buffer.from(file.content).toString('base64') });
    }
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body);
      const current = files.get(path);
      if (current && body.sha !== current.sha) return jsonResponse({ message: 'SHA mismatch' }, 409);
      if (!current && body.sha) return jsonResponse({ message: 'File missing' }, 409);
      const content = Buffer.from(body.content, 'base64').toString('utf8');
      const sha = `updated-${calls.length}`;
      files.set(path, { content, sha });
      return jsonResponse({ content: { sha }, commit: { sha: 'commit-test', html_url: 'https://github.com/Muhammad5231/CashNote-Website/commit/commit-test' } }, current ? 200 : 201);
    }
    return jsonResponse({ message: 'Unsupported' }, 405);
  };
  return { fetchImpl, files, calls };
}

const defaultFiles = {
  'public/cms/content.json': JSON.stringify(DEFAULT_CONTENT),
  'public/assets/screens/transactions.webp': 'asset1',
  'public/assets/screens/account-picker.webp': 'asset2',
  'public/assets/screens/preferences.webp': 'asset3',
  'public/assets/images/hero-test.webp': 'asset4',
  'public/assets/videos/tour-test.mp4': 'asset5'
};
function storeWith(fetchImpl) {
  return createCmsStore({ owner: 'Muhammad5231', repo: 'CashNote-Website', branch: 'main', contentPath: 'public/cms/content.json', token: 'ghp_testtoken_12345678901234567890', fetchImpl });
}

test('defaults supply existing bundled screenshot paths', () => {
  const content = normalizeContent({});
  assert.equal(content.media.galleryTransactions, '/assets/screens/transactions.webp');
  assert.equal(content.media.galleryProfiles, '/assets/screens/account-picker.webp');
  assert.equal(content.media.galleryPreferences, '/assets/screens/preferences.webp');
});

test('accepts only local files under /assets with matching media extensions', () => {
  assert.equal(validateAssetPath('/assets/images/hero.webp', 'heroImage'), '/assets/images/hero.webp');
  assert.equal(validateAssetPath('/assets/videos/walkthrough.mp4', 'tourVideo'), '/assets/videos/walkthrough.mp4');
  assert.throws(() => validateAssetPath('https://example.com/hero.webp', 'heroImage'), CmsError);
  assert.throws(() => validateAssetPath('/assets/images/../secret.webp', 'heroImage'), CmsError);
  assert.throws(() => validateAssetPath('/assets/videos/walkthrough.mp4', 'heroImage'), CmsError);
  assert.throws(() => validateAssetPath('/assets/screens/walkthrough.mp4', 'tourVideo'), CmsError);
  assert.throws(() => validateAssetPath('/assets/images/app.js', 'heroImage'), CmsError);
});

test('loads content.json from GitHub Contents API', async () => {
  const repo = makeRepoFetch(defaultFiles);
  const store = storeWith(repo.fetchImpl);
  const result = await store.getContent();
  assert.equal(result.content.heroTitle, DEFAULT_CONTENT.heroTitle);
  assert.equal(result.sha, 'sha-public/cms/content.json');
  assert.ok(repo.calls.every(call => call.headers.Authorization === 'Bearer ghp_testtoken_12345678901234567890'));
});

test('saves text and media paths as a GitHub commit after checking asset existence', async () => {
  const repo = makeRepoFetch(defaultFiles);
  const store = storeWith(repo.fetchImpl);
  const content = normalizeContent({ ...DEFAULT_CONTENT, heroTitle: 'Money, in focus', media: { ...DEFAULT_CONTENT.media, heroImage: '/assets/images/hero-test.webp', tourVideo: '/assets/videos/tour-test.mp4' } });
  const result = await store.saveContent(content);
  assert.equal(result.ok, true);
  assert.match(result.commitUrl, /github\.com/);
  const saved = JSON.parse(repo.files.get('public/cms/content.json').content);
  assert.equal(saved.heroTitle, 'Money, in focus');
  assert.equal(saved.media.heroImage, '/assets/images/hero-test.webp');
  assert.ok(repo.calls.some(call => call.method === 'PUT' && call.path === 'public/cms/content.json'));
});

test('refuses a media path that has not been committed to the website repo', async () => {
  const repo = makeRepoFetch(defaultFiles);
  const store = storeWith(repo.fetchImpl);
  const content = normalizeContent({ ...DEFAULT_CONTENT, media: { ...DEFAULT_CONTENT.media, heroImage: '/assets/images/not-pushed.webp' } });
  await assert.rejects(() => store.saveContent(content), error => error.code === 'ASSET_NOT_FOUND' && error.status === 400);
});

test('refuses to run CMS writes without a server-side GitHub token', async () => {
  const store = createCmsStore({ owner: 'Muhammad5231', repo: 'CashNote-Website', token: '', fetchImpl: async () => { throw new Error('should not be called'); } });
  await assert.rejects(() => store.getContent(), error => error.code === 'CMS_NOT_CONFIGURED' && error.status === 503);
});

test('serializes simultaneous content saves to avoid GitHub SHA conflicts', async () => {
  const repo = makeRepoFetch(defaultFiles);
  const store = storeWith(repo.fetchImpl);
  const a = normalizeContent({ ...DEFAULT_CONTENT, heroTitle: 'First edit' });
  const b = normalizeContent({ ...DEFAULT_CONTENT, heroTitle: 'Second edit' });
  const results = await Promise.all([store.saveContent(a), store.saveContent(b)]);
  assert.equal(results.length, 2);
  assert.equal(JSON.parse(repo.files.get('public/cms/content.json').content).heroTitle, 'Second edit');
});

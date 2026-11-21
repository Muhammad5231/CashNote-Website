'use strict';

const DEFAULT_CONTENT = Object.freeze({
  heroTitle: 'Your money,',
  heroAccent: 'in focus.',
  heroCopy: 'A more considered way to manage everyday money. Track income and expenses, plan budgets, reuse common entries and review reports — with your records kept on your computer.',
  featuresTitle: 'Personal finance, with more clarity.',
  aboutTitle: 'Built independently. Made with intention.',
  tourCaption: 'Explore the CashNote desktop experience.',
  media: {
    heroImage: '',
    tourVideo: '',
    galleryTransactions: '/assets/screens/transactions.webp',
    galleryProfiles: '/assets/screens/account-picker.webp',
    galleryPreferences: '/assets/screens/preferences.webp'
  }
});

const TEXT_LIMITS = Object.freeze({
  heroTitle: 90,
  heroAccent: 60,
  heroCopy: 500,
  featuresTitle: 120,
  aboutTitle: 120,
  tourCaption: 220
});
const MEDIA_KEYS = Object.freeze(['heroImage', 'tourVideo', 'galleryTransactions', 'galleryProfiles', 'galleryPreferences']);
const IMAGE_KEYS = new Set(['heroImage', 'galleryTransactions', 'galleryProfiles', 'galleryPreferences']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm']);

class CmsError extends Error {
  constructor(message, status = 500, code = 'CMS_ERROR') {
    super(message);
    this.name = 'CmsError';
    this.status = status;
    this.code = code;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function validateAssetPath(value, key) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > 400) throw new CmsError(`Invalid media path for ${key}.`, 400, 'INVALID_MEDIA_PATH');
  const path = value.trim();
  if (!path.startsWith('/assets/') || path.startsWith('//') || /[\\?#%\u0000-\u001f]/.test(path) || path.includes('..')) {
    throw new CmsError(`${key}: use a local path beginning with /assets/ and do not include a domain, query string or .. segments.`, 400, 'INVALID_MEDIA_PATH');
  }
  const parts = path.split('/');
  if (parts.some((part, index) => index > 1 && (!part || part === '.' || part === '..'))) throw new CmsError(`${key}: the media path contains an invalid folder name.`, 400, 'INVALID_MEDIA_PATH');
  if (!/^\/assets\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpg|jpeg|png|webp|avif|mp4|webm)$/i.test(path)) {
    throw new CmsError(`${key}: use a JPG, PNG, WEBP or AVIF image path, or an MP4/WEBM video path.`, 400, 'INVALID_MEDIA_PATH');
  }
  const ext = require('node:path').extname(path).toLowerCase();
  if (key === 'tourVideo' && !path.startsWith('/assets/videos/')) throw new CmsError('Product tour video must be placed under public/assets/videos/.', 400, 'INVALID_MEDIA_PATH');
  if (key !== 'tourVideo' && path.startsWith('/assets/videos/')) throw new CmsError(`${key} must point to an image folder, not the videos folder.`, 400, 'INVALID_MEDIA_PATH');
  if (key === 'tourVideo' ? !VIDEO_EXTENSIONS.has(ext) : !IMAGE_EXTENSIONS.has(ext)) {
    throw new CmsError(key === 'tourVideo' ? 'Product tour video must be MP4 or WEBM.' : `${key} must point to an image file.`, 400, 'INVALID_MEDIA_TYPE');
  }
  return path;
}

function normalizeContent(input) {
  if (!isPlainObject(input)) throw new CmsError('Website content must be a JSON object.', 400, 'INVALID_CONTENT');
  const result = {
    ...DEFAULT_CONTENT,
    media: { ...DEFAULT_CONTENT.media }
  };
  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    const value = input[key] === undefined ? DEFAULT_CONTENT[key] : input[key];
    if (typeof value !== 'string') throw new CmsError(`${key} must be text.`, 400, 'INVALID_CONTENT_FIELD');
    result[key] = value.trim().slice(0, limit);
  }
  const media = input.media === undefined ? {} : input.media;
  if (!isPlainObject(media)) throw new CmsError('Media paths must be provided as an object.', 400, 'INVALID_MEDIA');
  for (const key of MEDIA_KEYS) result.media[key] = validateAssetPath(media[key] === undefined ? result.media[key] : media[key], key);
  return result;
}

function createCmsStore({ owner, repo, branch = 'main', contentPath = 'public/cms/content.json', token, fetchImpl = globalThis.fetch }) {
  const config = { owner: String(owner || '').trim(), repo: String(repo || '').trim(), branch: String(branch || 'main').trim(), contentPath: String(contentPath || 'public/cms/content.json').trim() };
  let writeQueue = Promise.resolve();
  let readCache = { value: null, expiresAt: 0 };

  function assertConfigured() {
    if (!/^[A-Za-z0-9_.-]{1,100}$/.test(config.owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(config.repo) || !/^[A-Za-z0-9._/-]{1,240}$/.test(config.contentPath) || !config.contentPath.startsWith('public/cms/')) {
      throw new CmsError('GitHub CMS repository settings are invalid.', 503, 'CMS_NOT_CONFIGURED');
    }
    if (!token || String(token).trim().length < 20) throw new CmsError('GitHub CMS is not configured. Add a fine-grained GitHub token with Contents: Read and write permission to the Render environment.', 503, 'CMS_NOT_CONFIGURED');
  }

  function apiUrl(filePath) {
    const safePath = filePath.split('/').map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${safePath}?ref=${encodeURIComponent(config.branch)}`;
  }

  async function githubRequest(url, options = {}) {
    assertConfigured();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetchImpl(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'CashNote-Website-CMS/2.6',
          ...(options.headers || {})
        }
      });
      return response;
    } catch (error) {
      if (error && error.name === 'AbortError') throw new CmsError('GitHub did not respond in time. Please retry.', 504, 'GITHUB_TIMEOUT');
      throw new CmsError('Could not connect to GitHub. Check the Render API service and try again.', 502, 'GITHUB_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }
  }

  async function readFile(filePath, allowMissing = false) {
    const response = await githubRequest(apiUrl(filePath));
    if (response.status === 404 && allowMissing) return null;
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new CmsError('GitHub rejected the CMS token. Check its repository access and Contents: Read and write permission.', 503, 'GITHUB_AUTH');
      if (response.status === 404) throw new CmsError(`GitHub file not found: ${filePath}`, 404, 'GITHUB_FILE_NOT_FOUND');
      throw new CmsError(`GitHub could not read ${filePath} (HTTP ${response.status}).`, 502, 'GITHUB_READ_FAILED');
    }
    return response.json();
  }

  async function getContent() {
    if (readCache.value && readCache.expiresAt > Date.now()) return { content: readCache.value, sha: readCache.sha || null };
    const file = await readFile(config.contentPath, true);
    let parsed = {};
    let sha = null;
    if (file) {
      if (file.type !== 'file' || typeof file.content !== 'string') throw new CmsError('The CMS content path is not a normal GitHub file.', 500, 'INVALID_GITHUB_FILE');
      try { parsed = JSON.parse(Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8')); }
      catch (_) { throw new CmsError('public/cms/content.json is not valid JSON. Restore a valid content backup before editing.', 500, 'INVALID_CONTENT_JSON'); }
      sha = file.sha || null;
    }
    const content = normalizeContent(parsed);
    readCache = { value: content, sha, expiresAt: Date.now() + 15000 };
    return { content, sha };
  }

  async function verifyAssetPaths(content) {
    const entries = Object.entries(content.media).filter(([, value]) => value);
    for (const [key, value] of entries) {
      const repoPath = `public${value}`;
      const file = await readFile(repoPath, true);
      if (!file || file.type !== 'file') throw new CmsError(`${key}: ${value} was not found in the GitHub repository. Add the file under public${value}, push it to main, then save the path again.`, 400, 'ASSET_NOT_FOUND');
    }
  }

  async function saveContent(input) {
    const content = normalizeContent(input);
    const operation = writeQueue.then(async () => {
      await verifyAssetPaths(content);
      const currentFile = await readFile(config.contentPath, true);
      const payload = {
        message: 'Update CashNote website content from Admin CMS',
        content: Buffer.from(`${JSON.stringify(content, null, 2)}\n`, 'utf8').toString('base64'),
        branch: config.branch,
        ...(currentFile?.sha ? { sha: currentFile.sha } : {})
      };
      const response = await githubRequest(apiUrl(config.contentPath), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.status === 409 || response.status === 422) throw new CmsError('The website content changed in GitHub while you were editing. Reload the Admin Panel and try again.', 409, 'CMS_CONFLICT');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new CmsError('GitHub denied the write. Check that the fine-grained token has Contents: Read and write permission for CashNote-Website.', 503, 'GITHUB_WRITE_AUTH');
        throw new CmsError(`GitHub could not save the content (HTTP ${response.status}).`, 502, 'GITHUB_WRITE_FAILED');
      }
      const result = await response.json();
      readCache = { value: content, sha: result.content?.sha || null, expiresAt: Date.now() + 15000 };
      return {
        ok: true,
        content,
        commitUrl: result.commit?.html_url || null,
        commitSha: result.commit?.sha || null,
        message: 'Content committed to GitHub. Render will redeploy the static website automatically; allow the deployment to finish before checking the public pages.'
      };
    });
    writeQueue = operation.catch(() => {});
    return operation;
  }

  function status() {
    return {
      configured: Boolean(token && String(token).trim().length >= 20),
      owner: config.owner,
      repository: config.repo,
      branch: config.branch,
      contentPath: config.contentPath
    };
  }

  return { getContent, saveContent, status, verifyAssetPaths };
}

module.exports = { DEFAULT_CONTENT, MEDIA_KEYS, CmsError, normalizeContent, validateAssetPath, createCmsStore };

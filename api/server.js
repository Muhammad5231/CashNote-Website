'use strict';

const http = require('node:http');

const PORT = Number(process.env.PORT || 10000);
const GITHUB_OWNER = (process.env.GITHUB_OWNER || 'Muhammad5231').trim();
const GITHUB_REPO = (process.env.GITHUB_REPO || 'CashNote-Releases').trim();
const SITE_URL = (process.env.SITE_URL || 'https://cashnote-website.onrender.com').replace(/\/$/, '');
const CACHE_TTL_MS = Math.max(60, Number(process.env.STATS_CACHE_SECONDS || 180)) * 1000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://cashnote-website.onrender.com,http://localhost:8080,http://127.0.0.1:8080')
  .split(',').map((value) => value.trim()).filter(Boolean);
const INSTALLER_PATTERN = /^CashNote-Setup-.*-Windows-x64\.exe$/i;

let snapshotCache = { expiresAt: 0, value: null };
let snapshotPromise = null;

function isMobileUserAgent(userAgent = '') {
  return /android|webos|iphone|ipod|ipad|blackberry|iemobile|opera mini|mobile|windows phone|kindle|silk|tablet/i.test(userAgent);
}

function isWindowsDesktop(userAgent = '') {
  return /Windows NT/i.test(userAgent) && !isMobileUserAgent(userAgent);
}

function baseHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  }
}

function validateRepoConfig() {
  const validPart = /^[A-Za-z0-9_.-]{1,100}$/;
  if (!validPart.test(GITHUB_OWNER) || !validPart.test(GITHUB_REPO)) {
    throw new Error('Invalid GitHub owner or repository configuration.');
  }
}

async function getReleaseSnapshot() {
  const now = Date.now();
  if (snapshotCache.value && snapshotCache.expiresAt > now) return snapshotCache.value;
  if (snapshotPromise) return snapshotPromise;

  snapshotPromise = (async () => {
    validateRepoConfig();
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/releases?per_page=100`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetch(apiUrl, {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'CashNote-Download-Gateway/1.0'
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = response.status === 404
        ? 'The public CashNote release repository or release list was not found.'
        : `GitHub Releases returned HTTP ${response.status}.`;
      throw new Error(detail);
    }

    const releases = await response.json();
    const published = Array.isArray(releases) ? releases.filter((release) => !release.draft && !release.prerelease) : [];
    const matching = [];

    // GitHub returns the latest published releases first. We inspect up to 100 releases.
    for (const release of published) {
      const assets = Array.isArray(release.assets) ? release.assets : [];
      for (const asset of assets) {
        if (INSTALLER_PATTERN.test(asset.name || '') && asset.browser_download_url) {
          matching.push({
            release,
            asset,
            downloadCount: Number.isFinite(Number(asset.download_count)) ? Number(asset.download_count) : 0
          });
        }
      }
    }

    const totalDownloads = matching.reduce((sum, item) => sum + item.downloadCount, 0);
    const latest = matching[0] || null;
    const value = {
      configured: true,
      available: Boolean(latest),
      downloads: totalDownloads,
      countSource: 'GitHub Releases asset download_count',
      releaseCount: new Set(matching.map((item) => item.release.id)).size,
      latest: latest ? {
        version: String(latest.release.tag_name || latest.release.name || 'Latest').replace(/^v/i, ''),
        tag: latest.release.tag_name || '',
        publishedAt: latest.release.published_at || null,
        assetName: latest.asset.name,
        assetSizeBytes: Number(latest.asset.size || 0),
        releaseUrl: latest.release.html_url || null,
        downloadUrl: latest.asset.browser_download_url
      } : null,
      updatedAt: new Date().toISOString()
    };
    snapshotCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  })();

  try {
    return await snapshotPromise;
  } finally {
    snapshotPromise = null;
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': status === 200 ? 'public, max-age=60, stale-while-revalidate=120' : 'no-store'
  });
  res.end(body);
}

function sendDeviceMessage(res, { title, message, status = 403 }) {
  const safeTitle = String(title).replace(/[<>]/g, '');
  const safeMessage = String(message).replace(/[<>]/g, '');
  const body = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101011"><title>${safeTitle} · CashNote</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;background:#101011;color:#f4f0fb}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 50% 0,rgba(177,140,240,.14),transparent 55%),#101011}.card{width:min(100%,560px);padding:38px;border:1px solid #38303f;border-radius:24px;background:#18171b;box-shadow:0 24px 80px #0008}.brand{display:flex;align-items:center;gap:13px;margin-bottom:30px}.brand img{width:54px;height:54px;object-fit:contain;border-radius:14px}.brand strong{font-size:23px;letter-spacing:-1px}.brand em{font-style:normal;color:#29c99a}.kicker{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b18cf0;font-weight:800}h1{font-size:clamp(30px,7vw,42px);line-height:1.12;letter-spacing:-1.5px;margin:12px 0}p{color:#b8b1c2;font-size:16px;line-height:1.7}.note{display:flex;gap:12px;margin-top:26px;padding:15px;border:1px solid #39313f;background:#201d25;border-radius:14px;color:#d8d0e4;font-size:13px;line-height:1.55}.button{display:inline-flex;margin-top:24px;padding:12px 17px;border-radius:12px;background:#b18cf0;color:#18121f;font-weight:750;text-decoration:none}@media(max-width:480px){.card{padding:27px 22px}}
</style></head><body><main class="card"><div class="brand"><img src="${SITE_URL}/assets/cashnote-app-icon.png" alt=""><strong>Cash<em>Note</em></strong></div><span class="kicker">Windows desktop application</span><h1>${safeTitle}</h1><p>${safeMessage}</p><div class="note">CashNote is currently built for Windows 10 and Windows 11 desktop computers. Your device can still explore the product website and its features.</div><a class="button" href="${SITE_URL}/">Back to CashNote</a></main></body></html>`;
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  baseHeaders(res);
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);

  if (url.pathname.startsWith('/api/')) applyCors(req, res);
  if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { ok: true, service: 'cashnote-download-gateway' });
  }

  if (req.method === 'GET' && url.pathname === '/api/download-stats') {
    try {
      const data = await getReleaseSnapshot();
      return sendJson(res, 200, data);
    } catch (error) {
      return sendJson(res, 503, {
        configured: true,
        available: false,
        downloads: null,
        error: 'Download information is temporarily unavailable.',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  if (url.pathname === '/download') {
    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET', 'Cache-Control': 'no-store' });
      return res.end('Method not allowed.');
    }
    const userAgent = req.headers['user-agent'] || '';
    if (isMobileUserAgent(userAgent)) {
      return sendDeviceMessage(res, {
        title: 'CashNote is for desktop computers.',
        message: 'You are viewing CashNote on a mobile device. The Windows installer is not available for phones or tablets.'
      });
    }
    if (!isWindowsDesktop(userAgent)) {
      return sendDeviceMessage(res, {
        title: 'A Windows PC is required.',
        message: 'CashNote is currently available for Windows 10 and Windows 11 desktop computers. Please open this page on a Windows PC to download the installer.'
      });
    }

    try {
      const snapshot = await getReleaseSnapshot();
      if (!snapshot.available || !snapshot.latest?.downloadUrl) {
        return sendDeviceMessage(res, {
          title: 'The installer is not published yet.',
          message: 'The next public Windows release is being prepared. Please check back after the installer is published.',
          status: 503
        });
      }
      res.writeHead(302, {
        Location: snapshot.latest.downloadUrl,
        'Cache-Control': 'no-store'
      });
      return res.end();
    } catch (_error) {
      return sendDeviceMessage(res, {
        title: 'Downloads are temporarily unavailable.',
        message: 'CashNote could not verify the latest public release right now. Please try again in a little while.',
        status: 503
      });
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found.');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CashNote download gateway listening on 0.0.0.0:${PORT}`);
  console.log(`Release source: ${GITHUB_OWNER}/${GITHUB_REPO}`);
});

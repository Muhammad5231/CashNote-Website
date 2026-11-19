# CashNote Website v2.1 — Render Deployment Guide

## What you are deploying

This Blueprint creates two Render services:

| Service | Render type | Purpose |
|---|---|---|
| `cashnote-website` | Static Site | Public pages, screenshots, SEO and mobile download guidance |
| `cashnote-download-api` | Node Web Service | Device gate, latest installer redirect and GitHub download counter API |

Keeping the pages static means search engines can crawl the website without waiting for the API service to wake up.

## Before you deploy: prepare GitHub Releases

Create a public releases repository. The default is `Muhammad5231/CashNote-Releases`; adjust `GITHUB_OWNER` and `GITHUB_REPO` in `render.yaml` if needed.

Publish a Release with a Windows installer asset named like:

`CashNote-Setup-1.3.1-Windows-x64.exe`

The matching rule is `CashNote-Setup-*-Windows-x64.exe`. Keep release assets public so the gateway can resolve the public browser download URL and the website can read GitHub's official `download_count` metadata.

## Deploy with Render Blueprint

1. Push the complete project folder to your website GitHub repository.
2. In Render, choose **New → Blueprint**.
3. Connect the website repository.
4. Confirm the Blueprint sees `render.yaml` at the repository root.
5. Deploy both services.

### Static website service

- Name: `cashnote-website`
- Runtime: Static
- Build command: `echo "CashNote website is ready to publish"`
- Publish directory: `./public`

### Download API service

- Name: `cashnote-download-api`
- Runtime: Node
- Root directory: `api`
- Build command: `echo "CashNote download gateway uses Node.js built-ins only"`
- Start command: `npm start`
- Health check: `/health`
- Plan: Free

## Set the API environment

In Render, open `cashnote-download-api` → Environment. Confirm these values:

```text
GITHUB_OWNER=Muhammad5231
GITHUB_REPO=CashNote-Releases
SITE_URL=https://cashnote-website.onrender.com
ALLOWED_ORIGINS=https://cashnote-website.onrender.com
STATS_CACHE_SECONDS=180
```

If you use a custom domain, update `SITE_URL`, add that exact `https://` origin to `ALLOWED_ORIGINS`, and update the `cashnote-download-api` meta tag on all three site pages if the API URL changes.

## Test the services

1. Visit `/health` on the API. It should return `ok: true`.
2. Visit `/api/download-stats`. It should report the total of matching installer asset download counts from published GitHub Releases.
3. On a Windows PC, the website should enable the download CTA after the stats API confirms a matching installer asset.
4. On a phone/tablet, the CTA should be disabled and a desktop-only explanation should appear.
5. Test the API directly with a mobile User-Agent; `/download` should return HTTP 403 with a branded explanation.
6. Test a normal Windows User-Agent; with a published installer, `/download` should redirect to the matching GitHub Release asset.

## What the download number means

The number comes from GitHub's `download_count` field for matching release assets. It counts release asset downloads, including repeat downloads and downloads opened directly from GitHub. It does not show unique people, installs, first launches or downloads from this website alone. The counter sums matching assets across up to 100 latest published releases.

The mobile gate applies to the CashNote website and its download gateway. Since the release repository is public, a direct GitHub asset URL can still be shared or opened outside the website; this is not DRM and cannot prevent a determined user from spoofing a User-Agent.

## Free-tier cold starts

Render Free Web Services spin down after 15 minutes of inactivity and can take around a minute to start. The static pages stay served by Render's CDN, but the stats/download API can be slow on its first request after idle time. The website retries the stats request while the API wakes up.

## Google Search Console

After the website's actual domain is live:

1. Add a URL-prefix property in Google Search Console.
2. Verify with the HTML meta tag or DNS method supplied by Google.
3. Submit `https://YOUR-DOMAIN/sitemap.xml`.
4. Inspect the homepage, `/features/`, and `/about/` URLs.

Sitemap submission does not guarantee indexing or a specific ranking position.

## v2.2 design update

The Home hero and Home “A closer look” section now use original CSS/HTML illustrations rather than application screenshots. The creator/About page uses a stylized faceless illustration. Product screenshots remain on the Features page only. Scroll animations use GSAP 3.12.5 and ScrollTrigger from cdnjs, with a native IntersectionObserver fallback and `prefers-reduced-motion` support. No build step is required for the static website.

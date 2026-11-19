# CashNote Website v2.1 — Desktop Download Gate & Live Release Counts

A responsive three-page public product website for CashNote, with a separate lightweight Node.js download gateway. The public pages remain a Render Static Site for fast, crawlable SEO pages. A second Render Web Service provides device checks and reads official download totals from GitHub Releases.

## What's new in v2.1

- Mobile and tablet visitors see a clear Windows-desktop-only message; download buttons are disabled on mobile.
- The download gateway checks the request User-Agent again and rejects mobile and non-Windows requests.
- Windows desktop visitors are sent to the latest matching public GitHub Release installer.
- The visible download total is read from GitHub's official release-asset `download_count` values. It does not increase when someone merely clicks the CashNote website button.
- The total covers matching CashNote installer assets in the latest 100 published GitHub releases.
- No database, visitor account, cookie, analytics SDK, or custom IP/visitor tracking is added.
- The website stays on Render Static Site hosting; the small gateway is a separate Render Web Service.

## Important download-count wording

The displayed number is **GitHub installer-asset downloads**, not unique people, successful installations, or active users. Repeated downloads count again. Downloads made directly from the public GitHub Release page also contribute to the same total. GitHub's release asset metadata provides the `download_count` value.

The website and gateway block normal mobile-device download requests. GitHub Release assets are public, however, so a person who obtains a direct GitHub asset URL can access it outside the CashNote website. This is a practical device gate, not DRM or a guarantee against User-Agent spoofing.

## Project structure

```text
CashNote-Website-Ready-for-Render/
  api/
    server.js                # Device-aware download gateway + GitHub release stats
    package.json             # Node.js start script; no third-party runtime packages
    .env.example             # Environment variable reference
  public/
    index.html               # Home
    features/index.html      # Features
    about/index.html         # Creator, privacy and product boundaries
    assets/                  # CashNote brand and product screenshots
    assets/site.js           # Mobile gate, release counter, navigation and lightbox
    assets/site.css          # App-aligned design system
    robots.txt
    sitemap.xml
    404.html
  render.yaml                # Static website + download gateway Blueprint
  DEPLOYMENT-GUIDE.md
  RELEASE-PUBLISHING-GUIDE.md
```

## 1. Create the public GitHub Releases repository

The default Render configuration points to:

- Owner: `Muhammad5231`
- Repository: `CashNote-Releases`

Create a **public** repository with that name under your GitHub account, or change `GITHUB_OWNER` and `GITHUB_REPO` in `render.yaml` to the public repository you choose.

For each CashNote version, publish a GitHub Release and upload the Windows Setup file with a filename matching:

`CashNote-Setup-<version>-Windows-x64.exe`

Example:

`CashNote-Setup-1.3.1-Windows-x64.exe`

The actual installer file is not stored in this website repository. This keeps the website repo small and allows GitHub to deliver the large installer binary. GitHub documents a per-release asset size limit of less than 2 GiB and no release bandwidth quota: <https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases>.

## 2. Deploy both Render services

1. Push the full project folder to a GitHub repository for the website.
2. Open Render and choose **New → Blueprint**.
3. Connect the website repository and deploy the included `render.yaml`.
4. The Blueprint creates two services:
   - `cashnote-website` — Render Static Site, publishes `./public`.
   - `cashnote-download-api` — Render Node Web Service, starts `node server.js` from `api/`.
5. Wait until both services are live.

Expected default URLs:

- Website: `https://cashnote-website.onrender.com`
- Download gateway: `https://cashnote-download-api.onrender.com`

If Render assigns different URLs or you add a custom domain, update these settings:

### Website HTML

In `public/index.html`, `public/features/index.html`, and `public/about/index.html`, update:

```html
<meta name="cashnote-download-api" content="https://cashnote-download-api.onrender.com">
```

### Download API environment variables

In Render → `cashnote-download-api` → Environment, set:

- `GITHUB_OWNER` — public releases repository owner.
- `GITHUB_REPO` — public releases repository name.
- `SITE_URL` — the public website origin, without a trailing slash.
- `ALLOWED_ORIGINS` — comma-separated website origins allowed to call the stats API. Include the Render URL and every custom domain, for example `https://cashnote-website.onrender.com,https://cashnote.example.com`.
- `STATS_CACHE_SECONDS` — leave at `180` unless you have a reason to change it.

No GitHub token is required for a public release repository.

## 3. Verify deployment

Open these endpoints:

- `https://cashnote-download-api.onrender.com/health` — should return `{ "ok": true, ... }`.
- `https://cashnote-download-api.onrender.com/api/download-stats` — after the public release repository contains a matching installer asset, should return `available: true`, a `downloads` number and latest release information.

Then open the website on a Windows PC. The download button becomes active only after the gateway confirms a published installer. On an Android phone, iPhone or tablet, the website shows the desktop-only message and disables the button. The gateway itself also returns a mobile-block page if `/download` is requested with a mobile User-Agent.

## 4. Render Free service behaviour

The public website is a Render Static Site and remains available through Render's CDN. The small API is a Free Web Service in the included Blueprint. Render Free Web Services spin down after 15 minutes without traffic and can take around a minute to start again. The website retries the stats request while the API wakes up; a first download immediately after a long idle period may take longer. Upgrade the API service to a paid always-on instance if you need consistently immediate download checks.

## Local preview

Preview the public pages:

```bash
python -m http.server 8080 --directory public
```

For the gateway, open PowerShell in `api/` and set environment variables:

```powershell
$env:PORT="10000"
$env:GITHUB_OWNER="Muhammad5231"
$env:GITHUB_REPO="CashNote-Releases"
$env:SITE_URL="http://localhost:8080"
$env:ALLOWED_ORIGINS="http://localhost:8080"
npm start
```

The page's API meta tag currently points to the Render API. For local end-to-end testing, temporarily change it to `http://localhost:10000` in all three HTML pages.

## Search engine readiness

The existing pages include separate titles/descriptions, canonical links, Open Graph metadata, SoftwareApplication structured data, `robots.txt`, `sitemap.xml`, and semantic headings. Update canonical URLs, Open Graph URLs, `robots.txt`, and `sitemap.xml` if your final website domain differs from `cashnote-website.onrender.com`. Then verify the site in Google Search Console and submit `/sitemap.xml`.

## Accuracy and privacy notes

- No fake download total, user count, review score or testimonial is included.
- The download number is sourced from GitHub release asset metadata and is refreshed by the API cache.
- The count is not unique users, website-only downloads, installations or active users.
- The gateway does not store visitor IP addresses, names or a per-user download history. Render may maintain its normal infrastructure/request logs.
- The app is described as local-first. Do not claim that financial files are encrypted at rest unless the desktop application is changed to implement and verify that protection.

## What's new in v2.2 — visual storytelling & motion

- Replaced the Home hero screenshot with a custom HTML/CSS finance-dashboard illustration. Its values are explicitly labelled as sample figures.
- Replaced the Home transaction screenshot panel with an illustrative transaction ledger built in HTML/CSS.
- Rebuilt the Home “A closer look” area as three original UI-inspired visual cards for records, budgets and insights. No screenshots are used in the Home hero, transaction visual or “A closer look” section.
- Reworked the About page with an original faceless creator illustration, editorial introduction, product principles and a clearer privacy explanation.
- Added GSAP 3.12.5 and ScrollTrigger for entrance reveals, staggered card reveals, subtle visual parallax and a scroll progress line. If the CDN is unavailable, a native IntersectionObserver fallback still reveals content. The site respects `prefers-reduced-motion`.
- Product screenshots remain on the Features page as detailed product evidence; they are not used in the Home hero or “A closer look” section.

### Motion dependency

GSAP and ScrollTrigger are loaded from cdnjs. If you prefer not to rely on a third-party CDN, vendor the two minified files under `public/assets/vendor/` and update the script URLs in all three HTML pages. The website itself remains static and the fallback reveal system works without GSAP.

# CashNote Website v2.6 — Render Free + GitHub Assets CMS

## Architecture

This Blueprint keeps the public website static and crawlable. The Node API is a small stateless service for the Windows download gate, GitHub release statistics and authenticated Admin Panel.

| Service | Render type | Plan | Purpose |
|---|---|---|---|
| `cashnote-website` | Static Site | Free | Public pages, SEO, product images/video and `public/cms/content.json` |
| `cashnote-download-api` | Node Web Service | Free | Device-aware download redirect, release counter, admin login and GitHub CMS API proxy |

**No Persistent Disk or external database is used.** The Admin Panel writes text and media paths to `public/cms/content.json` in the `CashNote-Website` GitHub repository. Media binaries are added manually to `public/assets/` using VS Code/Git. The Render API holds no persistent CMS files.

Render Free Web Services sleep after 15 minutes without inbound traffic; first wake-up may take about a minute. Static pages/assets remain served by the Render Static Site. See Render's Free service limitations: https://render.com/docs/free.

## Existing repositories

- Website source and CMS content: `Muhammad5231/CashNote-Website`
- Installer releases/counter: `Muhammad5231/CashNote-Releases`

## 1. Add GitHub content files

The project includes `public/cms/content.json` and media folders:

- `public/assets/images/`
- `public/assets/videos/`
- `public/assets/screens/` (existing screenshots)

Add image/video files to the repository with VS Code, then push them to the `main` branch. Example:

```bash
git add public/assets
 git commit -m "Add CashNote website media"
git push origin main
```

The `public/cms/content.json` file contains site copy and the relative `/assets/...` paths. The Admin Panel edits this JSON file through GitHub; do not store binary uploads on the Render API.

## 2. Create a GitHub Fine-grained token for CMS writes

Create a Fine-grained Personal Access Token with:

- Owner: `Muhammad5231`
- Repository access: only `CashNote-Website`
- Repository permissions: `Contents` → **Read and write**
- No Workflows permission required

Store the token only in the Render API environment as `CMS_GITHUB_TOKEN`. Never put it in the frontend or commit it to Git.

## 3. Deploy the Blueprint

1. Push the complete project to `Muhammad5231/CashNote-Website`.
2. Render → New → Blueprint, or open your existing `CashNote-Website` Blueprint.
3. Sync/apply the updated `render.yaml`.
4. Confirm the Blueprint contains two services and **no disk resource**.
5. Confirm `cashnote-download-api` is a Free Node Web Service with root directory `api`, start command `npm start` and health check `/health`.
6. Deploy both services.

The static site publishes `./public`. The API runs without third-party npm dependencies.

## 4. Configure Render Environment

Open `cashnote-download-api` → Environment and confirm:

```text
NODE_VERSION=22
GITHUB_OWNER=Muhammad5231
GITHUB_REPO=CashNote-Releases
STATS_CACHE_SECONDS=180
SITE_URL=https://cashnote-website.onrender.com
ALLOWED_ORIGINS=https://cashnote-website.onrender.com
CMS_GITHUB_OWNER=Muhammad5231
CMS_GITHUB_REPO=CashNote-Website
CMS_GITHUB_BRANCH=main
CMS_CONTENT_PATH=public/cms/content.json
CMS_GITHUB_TOKEN=<your fine-grained token>
ADMIN_PASSWORD=<unique password, at least 16 characters>
ADMIN_SESSION_SECRET=<random secret, at least 32 characters>
```

Render generates `ADMIN_SESSION_SECRET` when using the Blueprint. Do not rotate it unless you intend to expire existing sessions. If you use a custom domain, add that exact HTTPS origin to `ALLOWED_ORIGINS` and change `SITE_URL`.

No `CASHNOTE_DATA_DIR`, `PUBLIC_API_URL`, `disk:` resource or media upload directory is used in v2.6.

## 5. Test after deployment

1. `/health` on the API returns `ok: true` and a CMS configured status.
2. `/cms/content.json` on the website returns the current public content JSON.
3. `/api/download-stats` on the API returns the current GitHub Releases snapshot when releases are available.
4. `/admin/` on the API shows the sign-in page.
5. Sign in and verify that text and media paths load from GitHub.
6. Add an image/video under `public/assets/`, push it to GitHub, wait for static deployment, then enter its `/assets/...` path in the Admin Panel.
7. Saving Admin changes creates a commit in `CashNote-Website` and triggers the Render Static Site deployment.
8. Test the Home, Features and About pages in desktop and mobile widths.
9. Test `/download` with Windows and mobile User-Agents; mobile users must be rejected and Windows users redirected to the latest matching installer.

## 6. Download counter and publishing

The counter reads official GitHub Release asset `download_count` values for matching `CashNote-Setup-*-Windows-x64.exe` assets across up to 100 published releases. It is not a unique-user, install or first-launch count. Keep the `CashNote-Releases` repository public so website visitors and the gateway can access public release metadata.

## 7. Admin usage

The Admin Panel lives at `https://cashnote-download-api.onrender.com/admin/`. It edits only text and media paths. On Save, the API validates each path against the repository, then commits `public/cms/content.json` through GitHub Contents API. Render redeploys the static website from that commit. See `ADMIN-SETUP-GUIDE.md`.

For video, use compressed MP4/WEBM stored in `public/assets/videos/`. For larger product tours, prefer an embedded YouTube video instead of a large Git binary.

## 8. Google Search Console

After deploy, submit `https://cashnote-website.onrender.com/sitemap.xml` in Search Console and inspect the Home, Features and About URLs. Sitemap submission does not guarantee indexing or rank position.

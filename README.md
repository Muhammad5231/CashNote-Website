# CashNote Website v2.6 — GitHub Assets CMS

A responsive three-page public website for CashNote, with a lightweight Render download gateway and private admin panel. This version replaces the disk-based upload CMS with a GitHub-backed content manager designed for the Render Free tier.

## What's new in v2.6

- Removed Render Persistent Disk and the paid Starter requirement.
- Added `public/assets/images/` and `public/assets/videos/` for media files that you add from VS Code and push to GitHub.
- Added `public/cms/content.json` as the public source for editable website copy and media paths.
- Admin Panel now edits text and media paths only; it does not accept binary uploads.
- Admin validates that every non-empty `/assets/...` path points to an existing file in the website GitHub repository.
- Admin saves changes to `public/cms/content.json` through GitHub Contents API. The commit triggers Render Static Site auto-deploy.
- GitHub Fine-grained token remains server-side in Render environment variables.
- Public pages read CMS JSON directly from the Static Site, so website rendering does not depend on the API being awake.
- Existing Windows download gate, GitHub Releases counter, mobile device block, SEO pages and visual design are retained.

## Architecture

| Service | Hosting | Data |
|---|---|---|
| `cashnote-website` | Render Static Site — Free | HTML/CSS/JS, screenshots, media and `cms/content.json` from GitHub |
| `cashnote-download-api` | Render Node Web Service — Free | Stateless download/API and signed admin sessions; GitHub-backed CMS writes |

No Render Persistent Disk, Postgres, MongoDB, Supabase or separate database is required. Render Free web services have ephemeral filesystems and may spin down after inactivity; this API stores no durable CMS data locally. See <https://render.com/docs/free>.

## Repository layout

```text
CashNote-Website/
├── api/
│   ├── admin-ui/
│   │   ├── index.html
│   │   └── admin.js
│   ├── lib/
│   │   └── cms-store.js
│   ├── cms-store.test.js
│   ├── package.json
│   ├── server.js
│   └── .env.example
├── public/
│   ├── assets/
│   │   ├── images/          # add custom images here
│   │   ├── videos/          # add compressed MP4 / WEBM here
│   │   ├── screens/         # bundled product screenshots
│   │   ├── site-cms.js
│   │   ├── site.js
│   │   └── site.css
│   ├── cms/
│   │   └── content.json     # public text + media paths
│   ├── about/index.html
│   ├── admin/index.html
│   ├── features/index.html
│   └── index.html
├── render.yaml
├── ADMIN-SETUP-GUIDE.md
└── DEPLOYMENT-GUIDE.md
```

## Quick setup

1. Push the complete project to `Muhammad5231/CashNote-Website`.
2. Apply the included `render.yaml` Blueprint. It creates/updates two Free services and no disk resource.
3. Create a GitHub Fine-grained Personal Access Token restricted to `CashNote-Website` with `Contents: Read and write` repository permission.
4. Set `CMS_GITHUB_TOKEN`, `ADMIN_PASSWORD` (16+ characters), and `ADMIN_SESSION_SECRET` (32+ characters) in the Render API service. Keep the token secret; never put it in browser code or Git.
5. Deploy both Render services.
6. Open `https://cashnote-download-api.onrender.com/admin/`.

See [ADMIN-SETUP-GUIDE.md](ADMIN-SETUP-GUIDE.md) and [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for detailed steps.

## Add an image or video

Add the file under `public/assets/` using VS Code. Example:

```text
public/assets/images/dashboard.webp
public/assets/videos/product-tour.mp4
```

Push the asset:

```bash
git add public/assets
git commit -m "Add CashNote website assets"
git push origin main
```

After Render's Static Site deployment completes, enter the matching path in Admin, for example `/assets/images/dashboard.webp`. Admin verifies the file exists in GitHub before it commits the CMS JSON. Do not use an external URL or a Windows filesystem path.

Supported image paths: JPG, JPEG, PNG, WEBP, AVIF. Product video paths: MP4, WEBM. For large videos, use an embedded YouTube video rather than committing large binaries to the website repository.

## CMS save workflow

The Admin Panel sends text and paths to the API. The API validates them, checks the media paths with GitHub Contents API, reads the current content file SHA and updates `public/cms/content.json` with a commit on `main`. The Render Static Site watches the same repository and redeploys. Public pages load `/cms/content.json` directly.

GitHub API documentation: <https://docs.github.com/en/rest/repos/contents>.

## Download service

The API continues to read public release metadata from `Muhammad5231/CashNote-Releases`. It redirects eligible Windows desktop visitors to the latest matching public asset named `CashNote-Setup-*-Windows-x64.exe`. Mobile/non-Windows user agents receive a device explanation. Download totals are GitHub Release asset download counts, not unique people or successful installations.

## Test

```bash
cd api
npm test
npm start
```

The CMS tests use mocked GitHub API responses and do not require a real token. For local Admin login, set the environment values in `api/.env` (never commit this file). Full production verification should be completed after configuring the Render Environment and pushing to the repository.

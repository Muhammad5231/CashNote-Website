# CashNote Website Admin — v2.6 GitHub-backed CMS

The Admin Panel edits small public website text and media paths. The actual images and videos are added manually to the website repository under `public/assets/`. The CMS stores its content in `public/cms/content.json` through the GitHub Contents API.

**No Render Persistent Disk, Render database or third-party database is used.** The Render API service is stateless and can run on the Free plan. Render Free Web Services can sleep after inactivity, so the first Admin Panel request may take time to wake the API.

## 1. GitHub token setup

Create a Fine-grained Personal Access Token in GitHub:

1. Open GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens.
2. Generate a token and give it a descriptive name, for example `CashNote Website CMS`.
3. Resource owner: `Muhammad5231`.
4. Repository access: **Only select repositories** → `CashNote-Website`.
5. Repository permissions: **Contents: Read and write**. Metadata read-only is included by GitHub. No Workflows permission is needed.
6. Create the token and copy it once.

Never paste this token into website HTML, JavaScript, GitHub commits, screenshots or this Admin Panel. It belongs only in the Render API Environment Variables.

## 2. Render environment

Open Render → `cashnote-download-api` → Environment and set:

| Variable | Value |
|---|---|
| `CMS_GITHUB_OWNER` | `Muhammad5231` |
| `CMS_GITHUB_REPO` | `CashNote-Website` |
| `CMS_GITHUB_BRANCH` | `main` |
| `CMS_CONTENT_PATH` | `public/cms/content.json` |
| `CMS_GITHUB_TOKEN` | Your fine-grained token |
| `ADMIN_PASSWORD` | A unique password of at least 16 characters |
| `ADMIN_SESSION_SECRET` | A random secret of at least 32 characters |
| `GITHUB_OWNER` | `Muhammad5231` |
| `GITHUB_REPO` | `CashNote-Releases` |
| `SITE_URL` | `https://cashnote-website.onrender.com` |
| `ALLOWED_ORIGINS` | `https://cashnote-website.onrender.com` |
| `STATS_CACHE_SECONDS` | `180` |

Render Blueprint can generate `ADMIN_SESSION_SECRET`; keep it stable. Do not rotate it unless you intentionally want to invalidate active admin sessions.

## 3. Add media with VS Code / GitHub

The repository includes these folders:

```text
public/
  assets/
    images/       # custom poster and new screenshots
    videos/       # MP4 / WEBM product tour
    screens/      # existing bundled screenshots
  cms/
    content.json  # saved website copy and media paths
```

Add files from VS Code / File Explorer. For example:

- `public/assets/images/product-poster.webp`
- `public/assets/images/transactions-new.webp`
- `public/assets/videos/product-tour.mp4`

Then commit and push the files:

```bash
git add public/assets
git commit -m "Add CashNote website media assets"
git push origin main
```

Wait for the Render Static Site deployment to finish. Then copy the website-relative path into Admin:

- `/assets/images/product-poster.webp`
- `/assets/images/transactions-new.webp`
- `/assets/videos/product-tour.mp4`

Paths must point to files that already exist on the selected GitHub branch. Admin checks the paths against GitHub before it saves them. It rejects external URLs, path traversal, wrong file types and missing files.

Supported image extensions: JPG, JPEG, PNG, WEBP and AVIF. Supported product-tour video extensions: MP4 and WEBM. Add video files with Git; the admin does not upload binary files. Keep committed media reasonably small; for a large product walkthrough, use a YouTube embed or a dedicated video host rather than a very large Git object.

## 4. Edit text and media paths

1. Open `https://cashnote-download-api.onrender.com/admin/`.
2. Sign in with `ADMIN_PASSWORD`.
3. Edit text fields and/or paste media paths.
4. Check the previews.
5. Click **Save website changes**.

The API creates a commit that updates `public/cms/content.json` in `CashNote-Website`. Render's Static Site automatically redeploys from the updated branch. Public pages read `/cms/content.json` directly, so they do not depend on the API service to display saved content. Allow the static deployment to finish before checking the live site.

## 5. Backups and restore

Use **Download JSON backup** before significant content changes. Restore accepts a previous JSON backup and writes its content through the same validation and GitHub commit path. Asset files themselves remain in the Git repository; the JSON backup stores paths, not binary assets.

## Security notes

- GitHub token is stored only in Render environment variables and is used server-side.
- Fine-grained token is restricted to the `CashNote-Website` repository with Contents read/write.
- Admin login uses a signed HttpOnly, SameSite=Strict cookie and an eight-hour session.
- Login attempts are rate-limited in memory. Render Free can restart/sleep the service, so this is best-effort throttling, not a persistent account database.
- `/admin/` is `noindex`; it is not a substitute for a strong password and token secrecy.
- No uploaded media or CMS content is stored on the Render filesystem.
- Admin mutation endpoints accept browser requests only from the API service's own origin; the public static website origin cannot make credentialed admin writes.

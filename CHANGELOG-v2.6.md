# CashNote Website v2.6 — Asset-Based GitHub CMS

## CMS architecture
- Replaced Render Persistent Disk content/media storage with GitHub-backed `public/cms/content.json`.
- Added `public/assets/images/` and `public/assets/videos/` as manually managed media folders.
- Admin Panel now edits text and asset paths only; binary upload endpoints are disabled.
- GitHub Contents API saves JSON changes with the current file SHA and commits them to the configured branch.
- Admin validates allowed local paths, media extensions and file existence before saving.
- Public site scripts load CMS content from the static `/cms/content.json` file.
- Product tour keeps its animated motion-graphic fallback when no video path is set.

## Render Free compatibility
- Removed the API Persistent Disk and Starter plan from `render.yaml`.
- The Node API is stateless and configured for Render Free.
- No external database, Render Disk or local CMS data directory is required.
- Added `/cms/content.json` no-cache headers so changes appear after the static deploy.

## Admin security
- GitHub token is server-side only and must be a Fine-grained token limited to `CashNote-Website` with Contents read/write.
- Retained signed HttpOnly admin sessions, password configuration and login attempt throttling.
- Added serialized CMS writes to avoid simultaneous file SHA conflicts.
- Added a JSON content/path backup and restore workflow.

## Verification
- Unit tests cover media-path validation, GitHub reads/writes, missing media rejection, missing token and concurrent saves.
- See `RELEASE-CHECKLIST-v2.6.md` before production deployment.

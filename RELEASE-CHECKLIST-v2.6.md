# CashNote Website v2.6 Release Checklist

## GitHub repository
- [ ] Update the original `Muhammad5231/CashNote-Website` repository without deleting `.git`.
- [ ] Confirm `public/cms/content.json` is committed.
- [ ] Confirm existing screenshots exist under `public/assets/screens/`.
- [ ] Add any custom images/videos to `public/assets/images/` or `public/assets/videos/` and push them before setting Admin paths.
- [ ] Never commit `.env`, GitHub tokens, admin passwords or session secrets.

## Render Blueprint
- [ ] Apply updated `render.yaml` to the existing CashNote Website Blueprint.
- [ ] Confirm both services are Free.
- [ ] Confirm there is no `disk:` resource and no Persistent Disk is needed by this CMS.
- [ ] Confirm API root directory is `api`, start command is `npm start`, health path is `/health`.
- [ ] Set `CMS_GITHUB_TOKEN` using a Fine-grained token restricted to the website repository with Contents read/write permission.
- [ ] Set/confirm `ADMIN_PASSWORD` (16+ characters) and `ADMIN_SESSION_SECRET` (32+ characters).
- [ ] Confirm CMS owner/repo/branch/path environment variables.

## Tests
- [ ] Run `cd api && npm test` (7 tests).
- [ ] Check API `/health` and verify `cms.configured: true`.
- [ ] Check website `/cms/content.json` returns valid JSON.
- [ ] Open API `/admin/` and sign in.
- [ ] Edit a heading and save; verify a commit appears in the original website repository.
- [ ] Wait for Static Site auto-deploy and verify the public heading changes.
- [ ] Enter an existing screenshot path and verify path validation + preview.
- [ ] Enter a missing asset path and confirm save is blocked with a useful error.
- [ ] Enter an external URL or `../` path and confirm validation rejects it.
- [ ] Set `tourVideo` to a committed MP4/WEBM under `/assets/videos/`; confirm it appears.
- [ ] Clear `tourVideo`; confirm the motion-graphic fallback appears again.
- [ ] Verify `/api/download-stats` and `/download` continue working.
- [ ] Test mobile download blocking and desktop redirect.
- [ ] Test Home, Features and About at desktop and mobile viewport sizes.

## Admin security
- [ ] Confirm GitHub token is only in Render Environment and never sent to the browser.
- [ ] Confirm admin login uses a signed HttpOnly cookie.
- [ ] Confirm `/admin/` and admin JS are noindex/no-store.
- [ ] Confirm the Admin Panel has no binary file upload controls.

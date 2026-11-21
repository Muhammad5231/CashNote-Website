# CashNote Website v2.5 Release Checklist

## Before deployment
- [ ] Review the Home, Features and About pages on desktop and mobile.
- [ ] Confirm the new release-download metric remains hidden until live API data arrives and then displays the exact GitHub asset count.
- [ ] Confirm the product-tour motion preview is shown when no video is uploaded.
- [ ] Confirm uploaded MP4/WEBM video replaces the motion preview.
- [ ] Confirm all three screenshots load and remain responsive.
- [ ] Confirm admin redirect from `https://cashnote-website.onrender.com/admin/` opens `https://cashnote-download-api.onrender.com/admin/`.
- [ ] Set `ADMIN_PASSWORD` (16+ characters) and verify `ADMIN_SESSION_SECRET` (32+ characters).
- [ ] Confirm API service has the 1 GB Render Persistent Disk mounted at `/var/data`.
- [ ] Test login, text save, content backup/restore, image upload, screenshot upload and video upload.
- [ ] Verify unauthorized admin requests return 401 and unsupported uploads are rejected.
- [ ] Back up `/var/data/cashnote-site`.

## After deployment
- [ ] Test `/health`, `/api/download-stats` and `/api/site-content`.
- [ ] Verify the Windows-only download gate and GitHub download counter.
- [ ] Verify the admin is not indexed.
- [ ] Verify sitemap at `/sitemap.xml` and submit it in Google Search Console.
- [ ] Check mobile layout at 360px, 390px and tablet widths.

## Infrastructure note
The CMS requires Render Starter + Persistent Disk for durable edits and uploads. This is a paid Render service/disk, but it uses a small JSON file and local media storage rather than a separate managed database.

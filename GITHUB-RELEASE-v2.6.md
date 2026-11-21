# CashNote Website v2.6 — Asset-Based GitHub CMS

This website update changes the admin content system to work on Render Free without a Persistent Disk or external database.

## Highlights
- Admin Panel edits website copy and asset paths only.
- Add images and videos manually to `public/assets/` using VS Code/Git.
- Admin validates that each entered path points to an existing file in the `CashNote-Website` GitHub repository.
- Content is saved to `public/cms/content.json` through GitHub Contents API.
- Every admin save creates a GitHub commit and triggers a Render Static Site redeploy.
- Public website pages read the static CMS JSON directly.
- Render API remains stateless and can run on the Free plan.
- No Render disk, Postgres, MongoDB or separate storage service is required.
- Existing download gate, official GitHub release counter, mobile blocking and SEO pages are retained.

## Required setup
- Render Blueprint updated from `render.yaml`.
- GitHub Fine-grained token limited to `CashNote-Website` with Contents: Read and write.
- Render environment variables `CMS_GITHUB_TOKEN`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` configured.
- Images/videos committed under `public/assets/` before their paths are entered in Admin.

## Admin
`https://cashnote-download-api.onrender.com/admin/`

## Deployment notes
The first request to a Render Free API may be delayed while the service wakes. Saving content commits `public/cms/content.json`; wait for the static-site deployment to finish before validating the public pages.

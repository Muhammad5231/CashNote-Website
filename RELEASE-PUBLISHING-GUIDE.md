# Publishing a CashNote Windows Installer

1. Build and test the Windows installer from the CashNote desktop project.
2. Open the public GitHub repository configured in Render (default: `Muhammad5231/CashNote-Releases`).
3. Create a new GitHub Release with a version tag such as `v1.3.1`.
4. Upload the tested Setup EXE as a release asset.
5. Name it using this pattern:

   `CashNote-Setup-1.3.1-Windows-x64.exe`

6. Publish the release.
7. Open the CashNote website. The API refreshes GitHub Release information every 3 minutes; the latest matching release becomes the download target.

The release asset must be below GitHub's 2 GiB per-file limit. GitHub's release asset `download_count` is the source for the website's total. The count can include repeat downloads and direct GitHub downloads; it does not prove installation or identify unique people.

Recommended release notes:
- Version number and publication date.
- Main changes and fixes.
- Supported Windows versions and architecture.
- SHA-256 checksum of the installer.
- Known issues and update instructions.

Do not label the public counter as "installed users", "active users" or "people using CashNote".

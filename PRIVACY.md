# Privacy Policy — OpenSubtitles Uploader PRO

**Last updated: August 12, 2026**

This privacy policy describes how the OpenSubtitles Uploader PRO desktop application ("the App") handles your data. The App is developed by OpenSubtitles and is open source — every claim below can be verified in the [source code](https://github.com/opensubtitles/OpenSubtitles-Uploader-PRO).

This policy covers the App only. Use of OpenSubtitles online services is additionally governed by the [OpenSubtitles Privacy Policy](https://www.opensubtitles.com/en/privacy/).

## Summary

- The App contains **no analytics, no telemetry, and no advertising**.
- Your files stay on your computer. Only the data required to identify movies and upload subtitles is sent to OpenSubtitles servers.
- Your password is used only to log in to OpenSubtitles and is never stored on disk.

## Data the App Processes

### Processed locally (never leaves your computer)
- Video files: read to calculate a movie hash (a 64-bit checksum of file fragments) and to extract technical metadata (duration, resolution, codecs).
- Subtitle files: read for pairing, preview, and upload preparation.

### Sent to OpenSubtitles servers (api.opensubtitles.com, api.opensubtitles.org)
- Subtitle files you choose to upload, together with the metadata you confirm (movie title, IMDb ID, language, release name, FPS, your comments).
- Movie hashes, file names, and file sizes — used to identify the movie or episode.
- Subtitle file content for automatic language detection.
- Your OpenSubtitles username and password during login. The password is transmitted for authentication only and is not stored by the App; the resulting session token and public profile data (username, rank, preferred languages) are stored locally on your device.
- Standard connection data inherent to any HTTP request (your IP address, App user agent). Server-side handling of this data is described in the [OpenSubtitles Privacy Policy](https://www.opensubtitles.com/en/privacy/).

### Sent to third parties
- **GitHub** (github.com, api.github.com): the App checks GitHub Releases for updates and downloads update packages from there. GitHub receives your IP address and standard request headers. See [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement).
- **unpkg.com** (CDN): the App downloads the FFmpeg WebAssembly component on demand for local video metadata extraction. The CDN receives your IP address and standard request headers.
- **Connectivity diagnostics**: the built-in connection troubleshooter may send simple test requests (to Cloudflare 1.1.1.1, httpbin.org, and a Google ad-script URL) solely to detect whether your network or an ad blocker is interfering with the App. No personal data is transmitted, and no advertising is loaded or displayed.

## What the App Does NOT Do

- No analytics or usage tracking of any kind.
- No telemetry or crash reporting to remote servers.
- No advertising.
- No selling or sharing of personal data.
- No reading of files you did not explicitly select or drop into the App.

## Local Storage

The App stores the following on your device only (browser localStorage inside the App and standard application data directories):

- OpenSubtitles session token and login timestamp
- Your public OpenSubtitles profile data (username, rank, preferred languages)
- App preferences (theme, default language, upload options)
- Caches of API responses (movie metadata, language lists) to reduce network requests

You can remove all of this at any time by logging out and/or uninstalling the App.

## Data Retention

The App itself retains no data outside your device. Data submitted to OpenSubtitles (uploaded subtitles, account data) is retained according to the [OpenSubtitles Privacy Policy](https://www.opensubtitles.com/en/privacy/). Server logs are kept for a maximum of 7 days.

## Your Rights

Under the GDPR and similar laws you have the right to access, correct, delete, restrict processing of, and port your personal data, and to withdraw consent and lodge a complaint with a supervisory authority. For any request concerning data held by OpenSubtitles, contact us via the [OpenSubtitles Help Center](https://opensubtitles.tawk.help/) or the [contact form](https://www.opensubtitles.org/en/contact).

## Children's Privacy

The App is not directed at children under 16 and does not knowingly collect data from them.

## Changes to This Policy

Changes will be published in this file in the App's GitHub repository; the revision history is available in the [commit log](https://github.com/opensubtitles/OpenSubtitles-Uploader-PRO/commits/main/PRIVACY.md).

## Contact

- OpenSubtitles Help Center: https://opensubtitles.tawk.help/
- Contact form: https://www.opensubtitles.org/en/contact
- Issues: https://github.com/opensubtitles/OpenSubtitles-Uploader-PRO/issues

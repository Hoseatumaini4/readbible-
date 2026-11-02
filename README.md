# Bible Reading Hours — Offline Installable App

This is a static Progressive Web App (PWA). It can be hosted free on GitHub Pages or Netlify.

## Features
- Installable on supported browsers and devices.
- Offline app shell cached by the service worker.
- Reading progress and notes saved locally in the browser on this device.
- No paid database, account, or server required.
- Love, Hope and Faith hourly rotation and Day / Week / Month / Year summaries retained.

## Free hosting: GitHub Pages
1. Create a GitHub repository (for example `bible-reading-hours`).
2. Upload the contents of this folder (the `index.html`, `manifest.webmanifest`, `sw.js`, `icons` folder and this README) to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. Wait for the published URL shown in Settings → Pages. Open it using HTTPS.

## Install
- **Android / Chrome:** open the hosted URL, then use the browser's Install app prompt or menu → Install app.
- **Desktop Chrome / Edge:** use the install icon in the address bar, or the app's Install app button when offered.
- **iPhone / iPad:** open the URL in Safari → Share → Add to Home Screen.

## Offline use
Open the hosted app once while online so the service worker can cache the app. Then it can reopen offline. Your readings and notes are stored in that browser's local storage on that device. They do not automatically sync between devices; export/backup is not included in this version.

## Updating
When publishing a new version, change the cache name in `sw.js` (for example `bible-reading-hours-v2`) so devices fetch the new app shell.

# Bible Reading Hours — installable offline app

## Important
A ZIP file cannot be installed directly. Extract this folder and publish its contents to an HTTPS host. GitHub Pages and Netlify offer free hosting. Do not open `index.html` by double-clicking it; service workers require HTTPS (or localhost).

## GitHub Pages (free)
1. Create a GitHub repository.
2. Upload the **contents** of this folder (`index.html`, `manifest.webmanifest`, `sw.js`, and `icons/`) to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. Wait for the published HTTPS URL. Open it once while online.

## Install
- **Android / Chrome:** open the HTTPS URL, tap the browser menu, choose **Install app** or **Add to Home screen**.
- **Windows / macOS / Linux:** open the URL in Chrome or Edge and use the install icon in the address bar or menu → **Install app**.
- **iPhone / iPad:** open the URL in Safari → Share → **Add to Home Screen**.

After the first online visit, the app shell is cached for offline opening. Notes and progress are stored locally on that device and do not automatically sync to other devices.

# Online PDF Text Editor

The frontend is built with Vite and Apryse WebViewer. Users open a PDF, edit selectable text in the browser, and save an edited copy. The Express/Puppeteer backend is not used by the frontend.

## Run locally

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. Choose **Open PDF**, edit text in the page, and choose **Save edited PDF**. The original file is not overwritten.

## Deploy to GitHub Pages

The repository workflow at `.github/workflows/deploy-pages.yml` builds this frontend and deploys it to GitHub Pages whenever a commit is pushed to `main`.

In GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. Then commit and push the project to `main`. The workflow deploys the built site; no backend server is required.

To use a licensed Apryse key, add a repository Actions secret named `VITE_APRYSE_LICENSE_KEY`. The key is embedded in the frontend bundle and visible to visitors, so use one licensed for the deployed domain. Without a production key, trial exports include an evaluation watermark.

The Pages build outputs to `dist/`. `base: "./"` in `vite.config.js` supports the repository subpath, and `.nojekyll` keeps the WebViewer assets available to Pages.

## Limitations

Editing works on selectable text. Scanned pages require OCR first. Complex layouts and embedded or subset fonts can affect how edited text appears, so review the downloaded copy.

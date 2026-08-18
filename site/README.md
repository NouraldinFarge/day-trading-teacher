# Visual project site

`index.html` and `styles.css` form the static, privacy-reviewed companion to the repository README. The site reuses only the synthetic or isolated-browser images listed in [`docs/images/manifest.json`](../docs/images/manifest.json); it does not contain analytics, third-party scripts, live account data, or remote fonts.

The `Project site` workflow validates documentation links, image dimensions and hashes, privacy classification, release wording, and required site content on every relevant pull request. Pushes to `main` deploy only after that contract passes. Deployment fails visibly until the repository owner enables **Settings → Pages → Build and deployment → GitHub Actions**; a missing deployment is never reported as a successful publication.

Until the expected public URL returns HTTP 200 from a signed-out browser, review the full-size screenshots and project tour in the root [`README.md`](../README.md), or open `index.html` locally. After owner access is restored, enable the setting, rerun the workflow, verify `https://nouraldinfarge.github.io/day-trading-teacher/`, and only then replace the README's source-preview link with the live URL.

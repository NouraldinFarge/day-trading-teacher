# Visual project site

`index.html` and `styles.css` form the static, privacy-reviewed companion to the repository README. The site reuses only the synthetic or isolated-browser images listed in [`docs/images/manifest.json`](../docs/images/manifest.json); it does not contain analytics, third-party scripts, live account data, or remote fonts.

The `Project site` workflow validates documentation links, image dimensions and hashes, privacy classification, release wording, and required site content on every relevant pull request. Pushes to `main` deploy only after that contract passes. GitHub Pages is configured for workflow deployment, and the `github-pages` environment accepts only `main`.

Publication is complete only when `https://nouraldinfarge.github.io/day-trading-teacher/` returns HTTP 200 from a signed-out browser. A green validation job or an enabled setting is not enough. If that check fails, review the full-size screenshots and project tour in the root [`README.md`](../README.md), inspect `index.html` locally, rerun the workflow, and keep the failed deployment visible until the URL passes.

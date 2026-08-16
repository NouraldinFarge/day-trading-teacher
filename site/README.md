# Visual project site

`index.html` and `styles.css` form the static, privacy-reviewed companion to the repository README. The site reuses only the synthetic or isolated-browser images listed in [`docs/images/manifest.json`](../docs/images/manifest.json); it does not contain analytics, third-party scripts, live account data, or remote fonts.

The `Project site` workflow always stages and checks the presentation on relevant pushes. Deployment is intentionally skipped with a successful notice until the repository owner enables **Settings → Pages → Build and deployment → GitHub Actions**. GitHub requires that one-time repository setting before a standard `GITHUB_TOKEN` can deploy a custom Pages workflow. After enablement, rerun the workflow once; subsequent presentation pushes deploy automatically.

Until Pages is enabled, review the rendered screenshots and project tour in the root [`README.md`](../README.md), or open `index.html` locally.

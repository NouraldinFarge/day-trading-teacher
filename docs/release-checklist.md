# Release checklist

Use this checklist for every source build, portable activation, tag, and GitHub release. A version is not complete until the evidence below is retained by CI or the local release report.

## Product and version

- `VERSION`, JavaScript package versions, Tauri/Rust versions, changelog heading, and `VERSION_MANIFEST.json` agree.
- The changelog describes observable behavior and limitations without learner-derived facts.
- `node scripts/generate-release-notes.mjs --version <version> --output <path>` produces a complete release body.
- README release text and current product images match the candidate.

## Safety and privacy

- `npm run privacy:check` passes.
- Only synthetic fixtures appear in tests, screenshots, example imports, and documentation.
- The ZIP contains no runtime learner data, provider configuration, credentials, logs, caches, or developer paths.
- Fidelity remains a read-only local-file workflow; no credentials, scraping, screen watching, undocumented API, or order placement has been introduced.
- External-AI handoffs remain explicit, redacted, draft-only, and review-before-apply.

## Quality

- Formatting, linting, type checking, unit/integration tests, accessibility checks, and production build pass.
- Rust formatting, Clippy with warnings denied, tests, and the machine-checked dependency-advisory policy pass.
- Both `Complete JavaScript lockfile` and `Rust advisory policy` finish green for the exact candidate head; a documented exception without its reachability check is not sufficient.
- Portable deployment tests cover first install, upgrade, data/config preservation, checksum rejection, rollback, and paths containing spaces.
- Bundle and chart-performance budgets remain within their recorded thresholds.

## Artifact review

- Launch the extracted portable app directly with no terminal window.
- Confirm the graphical executable does not depend on a localhost development server.
- Confirm `licenses/` contains the generated third-party license report and the release includes an SPDX SBOM.
- Verify the ZIP against its SHA-256 file and inspect its top-level inventory.
- Confirm build provenance is attached to every distributable artifact.
- When the `WINDOWS_CERTIFICATE_BASE64` and `WINDOWS_CERTIFICATE_PASSWORD` release secrets are configured, verify the executable signature and timestamp; otherwise confirm release metadata states that the binary is unsigned.

## Publish and observe

- Publish from a protected tag only after the required checks pass.
- Use reviewed generated notes, immutable assets, and a `Full Changelog` comparison link.
- Test the download and first launch on a clean Windows profile.
- Verify GitHub Pages from a signed-out browser and require HTTP 200 for the expected URL; a green staging job or owner-only settings page is not publication evidence.
- Verify README images, release links, issue templates, and repository topics.
- Record known limits and any credential-bound or platform-bound step that could not be activated.

# Repository-control activation checklist

This file is preparation for owner-only GitHub settings. It does **not** claim that a ruleset, Pages publication, or required check is active. Apply these controls only after the public repository and project-site URLs return HTTP 200 from a signed-out browser and the exact `main` head matches the reviewed local head.

## `main` protection

Create a branch ruleset for `main` with these requirements:

- changes arrive through a pull request;
- at least one approval and all review conversations resolved;
- the branch is current before merge;
- force pushes and branch deletion are blocked;
- required status checks use the exact job names below.

Required checks:

- `Windows verification`
- `Browser accessibility and responsive flows`
- `Analyze JavaScript and TypeScript`
- `Complete JavaScript lockfile`
- `Rust advisory policy`
- `Project-site contract` when the change touches site or presentation paths

Do not require the Pages deployment job on every pull request: deployment runs only after merge and requires the protected `github-pages` environment. Keep the environment restricted to `main`; require a reviewer there if an independent deployment approval is desired.

## Activation proof

After applying the settings, open a documentation-only test pull request and confirm that direct merge, deletion, and force-push controls behave as configured; each required check appears under its exact name; the project-site contract passes on the pull request; and the post-merge Pages deployment completes. Record the ruleset URL and run URLs in the maintenance log. If any URL is still externally unavailable, stop—do not treat the setting page or a green staging job as proof of public deployment.

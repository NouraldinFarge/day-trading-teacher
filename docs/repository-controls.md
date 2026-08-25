# Repository controls

Audit snapshot: **2026-08-25**. GitHub branch protection, signed commits, selected Actions, private vulnerability reporting, secret scanning, and the `github-pages` environment are active. The Pages API is enabled, HTTPS is enforced, and a signed-out request to the public project URL returned HTTP 200.

## Observed state

- `main` blocks force pushes and deletion, enforces administrators, requires signed commits, and requires an up-to-date branch.
- Changes are required to arrive through a pull request, but the approval count is currently zero and stale reviews are not dismissed.
- Required checks are `Windows verification` and `Analyze JavaScript and TypeScript`.
- Repository Actions are enabled with read-only default workflow permissions; GitHub-owned actions and the pinned `anchore/sbom-action` pattern are allowed.
- The `github-pages` environment has a custom deployment-branch policy restricted to `main`.
- The Pages build type is `workflow`; HTTPS is enforced.

## `main` protection

Tighten the existing `main` protection with these requirements:

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

The path-filtered `Project-site contract` must pass whenever a change touches site or presentation paths, but do not add that conditional job as a classic globally required status check: on unrelated pull requests it does not run and would leave the branch permanently waiting. If project-site validation should become globally required, first make its workflow report the same check on every pull request or enforce the workflow with a ruleset.

Do not require the Pages deployment job on every pull request: deployment runs only after merge and requires the protected `github-pages` environment. Keep the environment restricted to `main`; require a reviewer there if an independent deployment approval is desired.

## Activation proof

After applying the remaining settings, open a documentation-only test pull request and confirm that direct merge, deletion, and force-push controls behave as configured; each globally required check appears under its exact name; the project-site contract passes when its paths are changed; and the post-merge Pages deployment completes. Record the protection URL and run URLs in the maintenance log. If any URL becomes externally unavailable, stop—do not treat the setting page or a green validation job as proof of public deployment.

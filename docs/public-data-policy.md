# Public-data policy

Day-Trading Teacher is local-first. The public repository and every release must be useful to reviewers without revealing what a learner imported, wrote, configured, or practiced privately.

## Allowed in public artifacts

- Source code, schemas, tests, and documentation.
- Clearly labeled synthetic fixtures designed for tests or screenshots.
- Aggregate claims derived only from those synthetic fixtures.
- Product screenshots captured from a clean documentation profile.
- Reviewed changelog and release-note text that describes capabilities rather than a learner's results.

## Excluded from public artifacts

- Orders, positions, balances, journals, screenshots, provider credentials, account fragments, file inventories, or machine-specific paths.
- Counts or behavioral summaries derived from private Trading Records, even when the raw rows are absent.
- Generated external-AI evidence packages or returned journal drafts.
- Runtime `data/`, `config/`, `cache/`, `logs/`, `active-build/`, `portable-builds/`, or `versions/` contents.
- Private assessment answers or unlicensed market data.

## Enforcement

`npm run privacy:check` inventories tracked and unignored candidate files, rejects forbidden runtime paths, scans public text for known secret and private-data shapes, and verifies the release manifest's privacy assertions. It is part of `npm run verify` and therefore blocks source-built portable releases and tagged GitHub releases.

The check is a backstop, not a substitute for review. Before publishing, a maintainer must inspect the staged diff, generated release notes, screenshots, SBOM, ZIP inventory, and checksum manifest using [`release-checklist.md`](release-checklist.md).

## Existing history

If private-derived metadata is discovered in an already published immutable release, stop adding new copies, document the exposure privately, assess whether repository-history rewriting or release revocation is necessary, and avoid destructive history changes without an explicit owner decision. Forward sanitization must happen immediately even when historical remediation requires a separate decision.

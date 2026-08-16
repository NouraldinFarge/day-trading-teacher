# Contributing

Day-Trading Teacher welcomes focused improvements that strengthen deliberate practice, evidence, accessibility, reliability, or review without crossing the educational boundary. Because the repository is published under an all-rights-reserved portfolio license, open an issue before investing in a substantial change so scope and contribution terms are clear.

## Before opening a change

1. Read the [product boundary](README.md#product-boundary-by-design), [privacy policy](PRIVACY.md), [architecture overview](docs/architecture/overview.md), and [roadmap non-goals](ROADMAP.md#non-goals).
2. Open the most specific issue template and describe the learner or reviewer problem, the evidence of success, and the smallest useful scope.
3. Use synthetic or fully redacted examples. Never add credentials, account data, personal journals, secure assessments, generated releases, or unlicensed market data.
4. Keep provider identity, timestamps, limitations, provenance, and missing evidence visible.
5. Add deterministic regression coverage for changes to calculations, imports, assessment, achievements, persistence, or release behavior.

## Local workflow

```powershell
npm ci
npm run dev
```

Use `npm run tauri:dev` when the change depends on native persistence, file operations, Fidelity detection, provider credentials, or the portable layout. Browser preview mode is intentionally not the production authority.

Before submitting:

```powershell
npm run docs:check
npm run verify
npm run e2e
```

## Pull-request checklist

- Explain the user-facing outcome and how it was verified.
- Link the issue or decision record that defines the scope.
- Include tests for every new boundary or failure mode.
- Check keyboard operation, visible focus, reduced motion, narrow Windows layouts, and both appearance modes when the UI changes.
- Update the README, documentation hub, screenshots, architecture, changelog, and release notes only where behavior actually changed.
- Keep screenshots authentic, synthetic, and readable; follow [`docs/images/README.md`](docs/images/README.md).
- Run `npm run privacy:check` and confirm that public text, metadata, fixtures, screenshots, and release notes reveal no learner-derived records or aggregates.
- Confirm that the change adds no live signal, order placement, brokerage authentication, screen scraping, hidden AI call, or engagement pressure.

## Review priorities

Reviewers evaluate financial-safety boundaries, privacy, calculation determinism, persistence and rollback, import ambiguity, accessibility, evidence quality, and testability before visual polish or feature breadth. A passing test suite does not justify a claim that the implementation or curriculum does not support.

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/NouraldinFarge/day-trading-teacher/security/advisories/new), not a public issue.

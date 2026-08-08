# Security policy

## Supported version

Security fixes are applied to the latest published Day-Trading Teacher release. Older portable builds should be upgraded before reporting or reproducing an issue. The current release is available from [GitHub Releases](https://github.com/NouraldinFarge/day-trading-teacher/releases/latest).

## Report privately

Use [GitHub private vulnerability reporting](https://github.com/NouraldinFarge/day-trading-teacher/security/advisories/new) for credential handling, unsafe imports, path traversal, local-data exposure, provider allowlist bypass, state/export leakage, packaged-runtime vulnerabilities, or a way to cross the no-orders/no-signals boundary.

Include the affected version, Windows version, smallest reproducible sequence, expected boundary, and a synthetic proof when safe. Do not open a public issue or attach brokerage account numbers, order histories, API keys, journals, personal financial data, or secure assessment material.

## Trust-boundary summary

| Boundary | Expected behavior |
| --- | --- |
| Brokerage | No brokerage authentication, credential storage, account scraping, screen watching, or order placement |
| AI | No embedded model, automatic ChatGPT call, remote tutor, or hidden prompt/data transmission |
| Lesson import | Bounded inert JSON; schema, source, skill, URL, active-content, and facilitator-material validation before approval |
| CSV import | Local parsing of supported fields; account identifiers and raw rows are not stored as journal evidence |
| Historical providers | Explicit provider configuration, local separated credentials, allowlisted requests, visible provider/freshness context |
| State and exports | Desktop-owned persistence, migration and validation, secret-shaped-field rejection, and export sanitization |
| Calculations | Validated decimal inputs and deterministic Rust authority with a tested development fallback |
| Release | Verified Windows build, checksum, SBOM, provenance attestation, immutable release, and portable upgrade/rollback checks |

## Important limitations

- Imported files remain untrusted even when they come from a known application; review warnings and unresolved evidence.
- Browser development mode uses browser local storage and fallback calculations. It is visibly labeled and is not the production security boundary.
- Historical bars, backtests, paper trades, and descriptive analytics are learning evidence, not live quotes, forecasts, or execution guidance.
- The current completed-position model does not claim complete brokerage-ledger fidelity for unsupported instruments or corporate events.

Architecture details and code locations are in [`docs/architecture/overview.md`](docs/architecture/overview.md). Dependency-specific findings and narrowly justified exceptions are in [`docs/dependency-audit.md`](docs/dependency-audit.md).

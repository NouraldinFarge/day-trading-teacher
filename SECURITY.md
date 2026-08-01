# Security policy

## Supported version

Security fixes are applied to the latest published Day-Trading Teacher release. Older portable builds should be upgraded before reporting an issue.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/NouraldinFarge/day-trading-teacher/security/advisories/new). Do not open a public issue for credential handling, unsafe imports, path traversal, local-data exposure, provider allowlist bypass, or packaged-runtime vulnerabilities.

Use synthetic or fully redacted inputs. Never attach brokerage account numbers, order histories, API keys, journals, personal financial data, or secure assessment material.

## Security and product boundaries

- The application does not authenticate to brokerages, scrape accounts, place orders, or generate live buy/sell signals.
- User-supplied market-data credentials remain local and outside normal state exports.
- Imported lesson plans, chart files, and order histories are untrusted and must pass schema and boundary validation.
- Provider identity, timestamp, and freshness limitations remain attached to downloaded historical data.
- The desktop authority owns local persistence and file operations; browser development mode is not the production security boundary.


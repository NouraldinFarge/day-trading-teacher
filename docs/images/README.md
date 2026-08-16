# Product media

The repository images are authentic captures of application version 0.37.0, not reconstructed UI mockups. They were refreshed on 2026-08-15 from an isolated browser-development origin after completing the normal first-run flow. The isolated origin prevents existing local practice data from entering public media.

## Gallery and provenance

| File | Captured state | Data classification |
| --- | --- | --- |
| [`day-trading-teacher-lessons.png`](day-trading-teacher-lessons.png) | Default lesson-first workspace and connected practice tools | Fresh local profile; no learner records |
| [`day-trading-teacher-lesson.png`](day-trading-teacher-lesson.png) | Core lesson opening guide, brief summary, purpose, practice counts, and linked learning-case explanation | Bundled curriculum and fictional framing only |
| [`day-trading-teacher-chart.png`](day-trading-teacher-chart.png) | Focused Chart Replay with overlays, volume, simulation markers, and inspection controls | Built-in `DEMO` synthetic practice series, visibly labeled `Sample` |
| [`day-trading-teacher-journal.png`](day-trading-teacher-journal.png) | Quarterly journal metrics, deterministic insights, and equity curve | Temporary guided preview with twelve fictional mixed-outcome records; nothing persisted |
| [`day-trading-teacher-calendar.png`](day-trading-teacher-calendar.png) | Detailed monthly calendar and four-mode process heatmap | The same temporary fictional guided preview; no account data |
| [`day-trading-teacher-progress.png`](day-trading-teacher-progress.png) | Earned achievement detail with transparent requirement, reward boundary, and evidence ledger | Fresh profile plus one built-in synthetic chart-practice achievement |
| [`day-trading-teacher-social-preview.png`](day-trading-teacher-social-preview.png) | 1280×640 GitHub social card | Composed from the verified Lessons capture and the reproducible SVG frame |

The images intentionally retain the visible **Browser preview mode** label where the application shell is shown. Native-only behavior is described in text instead of being implied by a browser capture.

[`manifest.json`](manifest.json) records the captured application version, capture authority, dimensions, SHA-256 digest, and synthetic-data classification for every published PNG. The documentation gate fails if an image changes without a reviewed manifest update.

## Privacy and honesty checklist

Before replacing any image:

- Start from an empty profile created only for documentation.
- Use a separate localhost origin so an existing browser-preview profile cannot be reused accidentally.
- Use built-in or purpose-made synthetic inputs; never use a personal Fidelity export, journal, provider credential, account number, or imported assessment packet.
- Keep provider/sample identity and educational limitations visible.
- Capture the interface after the welcome flow; do not publish several differently named images of the same modal.
- Confirm that the alternative text describes what is actually visible.
- Use a minimum 1200×600 capture so labels remain legible when opened at full size.
- Check dark and light GitHub rendering around the image; the application itself may remain in its intentional dark presentation.
- Run `npm run docs:check`, then inspect the rendered README on GitHub.

## Social preview source

[`day-trading-teacher-social-preview.svg`](day-trading-teacher-social-preview.svg) contains the typography, framing, and product-boundary copy. The PNG adds the current Lessons screenshot inside that frame so GitHub and social clients receive a self-contained raster image. GitHub recommends 1280×640 for best display, and the documentation check enforces that exact output size.

When the main information architecture changes, refresh the Lessons capture first, rebuild the PNG, upload it under **Repository settings → General → Social preview**, and verify the repository card from the owner profile.

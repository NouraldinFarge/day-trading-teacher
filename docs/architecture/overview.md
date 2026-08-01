# Architecture overview

The MVP is a local-first modular application:

- React and TypeScript provide the interface.
- Tauri v2 is the native desktop shell.
- Rust commands own desktop persistence and authoritative decimal calculations.
- Browser development mode uses a deterministic fixed-point fallback and local storage.
- Imported lesson plans are inert JSON data. They have no tools, scripts, network access, or authority.
- The user may ask ChatGPT externally to author a lesson-plan JSON document, but the application has no AI integration.

The current release intentionally supports manual completed equity round trips. Broker adapters, partial fills, position flips, corporate actions, market-data context, and options remain outside this MVP.

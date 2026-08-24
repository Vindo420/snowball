## Why

The auth and referral flows added so far have only ever been verified by hand in a browser (or via ad hoc curl scripts during development). There's no repeatable way to check that signup/login, campaign ownership scoping, and the public referral flow still work after a change — regressions would only surface manually. An automated, single-command Playwright suite lets Claude Code (or any contributor) verify these flows itself.

## What Changes

- Add Playwright as a dev dependency, configured to auto-start the Next.js dev server and run against it (so `npm run test:e2e` is genuinely one command, no separate server-start step).
- Add a global setup check that refuses to run any test if the resolved database connection string points at the production Supabase project id (`vklmzhscdfbqjrfbmpgb`), failing loudly before any test touches data.
- Add an `e2e/` test suite covering the 8 flows listed in the proposal request: signup lands on an empty dashboard, logged-out `/dashboard` redirects to `/login`, login shows only that user's campaigns, cross-user campaign detail access returns 404, the public campaign page loads while logged out, entering a giveaway reveals a personal referral link, entering via `?ref=CODE` credits the referrer, and unauthenticated `POST /api/campaigns` returns 401.
- Add test data helpers that generate uniquely-named users/campaigns/participants per test run (random suffix) and delete everything they created in a teardown step, since tests share the real `snowball-dev` database with no isolated test database available.
- Document how to run the suite in `README.md`.

## Capabilities

### New Capabilities
- None — this adds developer tooling (a test suite) with no change to product-observable behavior. Per `skip_specs: true` in this change's `.openspec.yaml`, no spec deltas are created.

### Modified Capabilities
- None.

## Impact

- **Code**: new `playwright.config.ts`, new `e2e/` directory (test files + shared helpers for auth/db setup and teardown), a new `npm run test:e2e` script in `package.json`.
- **Dependencies**: adds `@playwright/test` (and its browser binaries) as a dev dependency; no production dependency changes.
- **Data**: tests read and write to the real `snowball-dev` Supabase database (no separate test database is available on the free tier) — every test creates uniquely-named rows and deletes them afterward. A global guard refuses to run if `DATABASE_URL`/`DIRECT_URL` resolves to the production project id.
- **Docs**: `README.md` gains a "Running the E2E tests" section.

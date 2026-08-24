## Context

See proposal.md - Why. Relevant constraints from the current codebase:
- Auth is NextAuth Credentials + JWT sessions (`src/lib/auth.ts`); there is no API-level "create a session" shortcut, so getting an authenticated browser context means actually driving the `/login` (or `/signup`) UI.
- `Campaign.status` defaults to `DRAFT` and the public page (`src/app/c/[slug]/page.tsx`) 404s on `DRAFT` campaigns; a campaign must be `PATCH`ed to `ACTIVE` before the public flows can be exercised.
- `Campaign.userId` cascades (`onDelete: Cascade`) to `Participant`, `Referral`, `RewardTier`, and `Integration`; `User` cascades to `Campaign`. Deleting the test-created `User` row is therefore enough to clean up everything a test created.
- Port 3000 on this machine is occupied by an unrelated project, so the dev server actually runs on 3001, and `.env`'s `NEXTAUTH_URL` is already set to `http://localhost:3001` to match. Playwright must target that same port explicitly — assuming the default 3000 would run the suite against the wrong application entirely.
- No test database exists (Supabase free-tier project cap already used by production `Snowball` and dev `snowball-dev`); tests run against the same Postgres database as local development.

## Goals / Non-Goals

**Goals:**
- `npm run test:e2e` starts the app and runs the full suite with no other manual step.
- Every test's data is uniquely named and self-cleaning, so repeated/parallel runs never collide or leave junk behind.
- Running the suite against the production database is structurally prevented, not just discouraged.

**Non-Goals:**
- Visual regression / screenshot testing.
- Testing the CRM integration stubs, fraud heuristics, or reward-tier delivery — out of scope for this change, which targets the 8 flows the proposal lists.
- A dedicated test database or Docker-based Postgres — the free-tier constraint rules this out for now; revisit if that constraint changes.

## Decisions

**Playwright Test, with `webServer` in `playwright.config.ts` set to `npm run dev -- -p 3001`, and `baseURL: 'http://localhost:3001'`.**
- Why: the port is pinned explicitly (not left to Next.js's default 3000) to match `NEXTAUTH_URL` and this machine's actual dev-server port — see Context. `reuseExistingServer: !process.env.CI` (true for local runs) means an already-running dev server on 3001 is reused rather than spawning a second one, which would either collide or silently run on a different port.
- Alternative considered: a separate `pretest:e2e` script that starts the server manually. Rejected — extra moving parts for no benefit over the built-in option.

**Global production-database guard via Playwright's `globalSetup`.**
- A single `e2e/global-setup.ts` reads `DATABASE_URL` and `DIRECT_URL` and throws (failing the whole run before any test starts) if either contains the production project id `vklmzhscdfbqjrfbmpgb`.
- Why `globalSetup` specifically: it runs once, before any test or worker starts, so there's no window where a test could touch the database before the guard fires.
- Alternative considered: checking inside each test's `beforeEach`. Rejected — redundant and leaves a gap before the first check runs.

**Authenticated flows are driven through the real UI (signup/login forms), not a programmatic session shortcut.**
- Why: flows #1 and #3 are explicitly about the signup/login UI working; faking a session would test less than what's asked for, and NextAuth v4's Credentials + JWT setup has no first-class "mint a session" API to hook into anyway.
- Flow #8 (`POST /api/campaigns` with no session → 401) is a pure API contract check with no UI involved, so it uses Playwright's `request` fixture directly instead of a page — faster and more direct than opening a browser for an assertion that has nothing to do with rendering.

**Test data isolation: one freshly-signed-up `User` per test (or per independent scenario within a test), identified by an email like `e2e-<random>@e2e.test`, with campaign slugs prefixed `e2e-<random>`.**
- `<random>` comes from `crypto.randomUUID().slice(0, 8)`, generated fresh per test.
- Cleanup happens in `afterEach` via a small Prisma helper (`e2e/helpers/db.ts`) that deletes the `User`(s) created in that test by email — cascades remove everything else. Using Prisma directly (not the app's API) is simplest and matches how the existing seed script already talks to the database.
- Campaigns created through the dashboard UI default to `DRAFT`; the tests that need a live public page (`/c/[slug]`) `PATCH` the campaign to `ACTIVE` via the authenticated API request context right after creating it, before opening the public page in a separate (logged-out) browser context.

**Cross-user tests (flow #4) use two independent Playwright browser contexts** (not two tabs in one context), so each has its own cookie jar / session — matching how two real users would never share a session.

**Worker count capped at 2 (`workers: 2`), not Playwright's default (per-CPU) count.**
- Why: discovered during implementation — the dev server is a single `next dev` process talking to a remote Supabase DB, with a `bcrypt` hash per signup/login. Running signup-heavy tests at Playwright's default worker count (matching CPU cores) overwhelmed that single process and caused request timeouts unrelated to test correctness or data races (`fullyParallel: true`'s "safe by construction" reasoning above covers data collisions, not server throughput). `workers: 1` (fully serial) also works but a plain `workers: 2` keeps some parallelism while staying reliable.
- Alternative considered: switch `webServer` to a production build (`next build && next start`), which handles concurrent requests better and would allow full default parallelism. Rejected for now — slower to start (adds a build step) and a bigger deviation from the "auto-start the dev server" decision above; revisit if suite runtime becomes a real pain point.

## Risks / Trade-offs

- **[Risk]** Tests run against the real `snowball-dev` database, so a bug in a test's cleanup step leaves orphaned rows there → **Mitigation**: the `e2e-` slug prefix and `@e2e.test` email suffix make orphaned rows trivially identifiable and safe to bulk-delete later; `afterEach` cleanup runs even on test failure (Playwright always runs `afterEach`/`afterAll` hooks).
- **[Risk]** Parallel workers writing to the same shared database could interact unexpectedly (e.g. two tests racing to create a same-named resource) → **Mitigation**: every piece of test data is uniquely named per test run, so there's no shared mutable state between tests; parallelism is safe by construction.
- **[Risk]** The production-guard string match (`vklmzhscdfbqjrfbmpgb`) is a single hardcoded id → **Mitigation**: acceptable since it's checking against one specific, known production project; if the production project ever changes id, update the one constant.

## Migration Plan

1. Add `@playwright/test` as a dev dependency and install browser binaries (`npx playwright install`).
2. Add `playwright.config.ts` (webServer, globalSetup, base URL).
3. Add `e2e/global-setup.ts` (production guard).
4. Add `e2e/helpers/test-data.ts` (unique id/email/slug generators) and `e2e/helpers/db.ts` (Prisma cleanup helper).
5. Add the test files covering the 8 flows, grouped by area (auth/dashboard, public campaign + referrals, API security).
6. Add the `test:e2e` script to `package.json`.
7. Document the suite in `README.md`.

Rollback: remove the `e2e/` directory, `playwright.config.ts`, the dev dependency, and the README section — no schema or production impact to unwind.

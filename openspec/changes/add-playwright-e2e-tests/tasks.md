## 1. Setup

- [x] 1.1 Add `@playwright/test` as a dev dependency, run `npx playwright install --with-deps chromium`, and verify `npx playwright --version` succeeds
- [x] 1.2 Add `playwright.config.ts` with `webServer` running `npm run dev -- -p 3001` and `baseURL: 'http://localhost:3001'` (matching `NEXTAUTH_URL`, since port 3000 is occupied by an unrelated project on this machine), with `reuseExistingServer: !process.env.CI`, and verify `npx playwright test --list` runs without error (even with zero test files yet)
- [x] 1.3 Add `e2e/global-setup.ts` that throws if `DATABASE_URL` or `DIRECT_URL` contains the production project id `vklmzhscdfbqjrfbmpgb`, wire it into `playwright.config.ts`'s `globalSetup`, and verify it throws when temporarily pointed at a fake string containing that id, and passes against the real `.env`
- [x] 1.4 Add `npm run test:e2e` script to `package.json` and verify it invokes Playwright (`npm run test:e2e -- --list`)

## 2. Test data helpers

- [x] 2.1 Add `e2e/helpers/test-data.ts` with functions to generate a unique test email (`e2e-<random>@e2e.test`) and a unique campaign slug (`e2e-<random>`) using `crypto.randomUUID()`, and verify two calls never collide (unit-check via a quick script or inline assertion)
- [x] 2.2 Add `e2e/helpers/db.ts` with a Prisma-backed `cleanupUser(email)` helper that deletes the `User` row by email (cascading to their campaigns/participants), and verify it removes a manually-created test user and leaves other users untouched

## 3. Auth and dashboard flows (flows 1-4)

- [x] 3.1 Write a test: signing up a new account via the `/signup` UI lands on `/dashboard` showing zero campaigns; clean up the created user afterward
- [x] 3.2 Write a test: visiting `/dashboard` with no session redirects to `/login`
- [x] 3.3 Write a test: after logging in via the `/login` UI, the dashboard shows only that user's own campaigns (create one campaign for the test user and confirm a campaign belonging to a different seeded/test user is not shown)
- [x] 3.4 Write a test: User B (a second freshly-signed-up test user, separate browser context) cannot open User A's campaign detail page by its URL and gets the "Campaign not found" (404-equivalent) state; clean up both users afterward

## 4. Public campaign and referral flows (flows 5-7)

- [x] 4.1 Write a test: create a campaign as an authenticated test user, `PATCH` it to `ACTIVE`, then in a separate logged-out browser context load `/c/[slug]` and verify the page renders fully (headline, entry form); clean up the campaign owner afterward (cascades the campaign)
- [x] 4.2 Write a test: entering the giveaway on `/c/[slug]` (logged out) creates a participant and reveals a personal referral link (`?ref=` share URL) on the page; clean up the campaign owner afterward (cascades the campaign and its participant)
- [x] 4.3 Write a test: a second visitor entering via `?ref=CODE` (the first entrant's referral link) increments the referrer's referral count, verified either on the page's leaderboard or via a direct DB read; clean up the campaign owner (cascades the campaign and its participants) afterward

## 5. API security flow (flow 8)

- [x] 5.1 Write a test using Playwright's `request` fixture: `POST /api/campaigns` with no session cookie returns `401`

## 6. Documentation and verification

- [x] 6.1 Add a "Running the E2E tests" section to `README.md` covering: prerequisites (`.env` configured, `npx playwright install`), the `npm run test:e2e` command, and a note that tests run against the local dev database and self-clean
- [x] 6.2 Run `npm run test:e2e` twice in a row and confirm all 8 flows pass both times with no leftover data (spot-check via `db:studio` or a quick Prisma query that no `e2e-`/`@e2e.test` rows remain)

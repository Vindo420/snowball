## 1. Fetch version-matched docs

- [x] 1.1 Run `npx @next/codemod@canary agents-md` and verify it completes and produces/updates an `AGENTS.md` with Next 16-specific guidance; consult it for the exact commands in the tasks below where noted

## 2. Upgrade dependencies

- [x] 2.1 Upgrade `next` to the latest 16.x, `react` and `react-dom` to the latest 19.x, and `@types/react` / `@types/react-dom` to their matching versions; verify `npm install` completes cleanly and `package.json`/lockfile reflect the new versions
- [x] 2.2 Run the official Next.js upgrade codemod (exact invocation per the fetched `AGENTS.md`/upgrade guide, e.g. `npx @next/codemod@canary upgrade latest`) and verify it completes without error, then review its diff for anything unexpected

## 3. Async request API migration

- [x] 3.1 Run the async request API codemod (e.g. `npx @next/codemod@canary next-async-request-api .`) and verify it completes without error
- [x] 3.2 Hand-verify `src/app/c/[slug]/page.tsx`: `params` is awaited before use, and the file still type-checks in isolation
- [x] 3.3 Hand-verify `src/app/dashboard/campaigns/[id]/page.tsx`: `params` is awaited before use, and the file still type-checks in isolation
- [x] 3.4 Hand-verify `src/app/api/campaigns/[id]/route.ts`: `params` is awaited before use in `GET`, `PATCH`, and `DELETE`, and the file still type-checks in isolation
- [x] 3.5 Hand-verify `src/app/api/webhooks/[provider]/route.ts`: `params` is awaited before use, and the file still type-checks in isolation

## 4. Middleware / proxy migration

- [x] 4.1 Attempt migrating `src/middleware.ts` to the Next 16 `proxy` convention (per the fetched docs) using the same `withAuth` call; verify it type-checks and `npm run build` succeeds
- [x] 4.2 If 4.1 succeeds, verify manually that visiting `/dashboard` while logged out still redirects to `/login`; if this fails or 4.1 didn't compile/build, revert to keeping `src/middleware.ts` exactly as it works today (do not proceed with a broken proxy migration)
- [x] 4.3 Update design.md's "Decisions" section with the concrete outcome (rename succeeded, or kept `middleware.ts` — and if kept, the specific incompatibility found)

## 5. Cleanup

- [x] 5.1 Remove the `"lint": "next lint"` script from `package.json` and verify `npm run lint` is no longer a defined script (`npm run lint` now fails with "missing script" rather than invoking a nonexistent command)

## 6. Verification (all required — do not consider this change done until every one passes)

- [x] 6.1 Run `npm run typecheck` and confirm it passes
- [x] 6.2 Run `npm run build` and confirm it succeeds
- [x] 6.3 Verify the Playwright `webServer` setup (port 3001, `reuseExistingServer`) still works under Next 16 — confirm the new dev-server lockfile (which prevents two `next dev` instances on the same project running simultaneously) doesn't break `npm run test:e2e` either when a dev server is already running manually or when none is running; adjust `playwright.config.ts` if the lockfile causes a conflict, and document the finding in design.md
- [x] 6.4 Run `npm run test:e2e` and confirm all 8 flows pass — if any flow fails, fix the underlying cause (app code, config, or upgrade step) and re-run; do not modify the test to make it pass
- [x] 6.5 Manually confirm that `/dashboard` redirects to `/login` when logged out locally (the specific behavior most at risk from the middleware/proxy change), independent of the automated check in 6.4 — verified via browser in task 4.2 under this same Next 16 + `proxy.ts` setup
- [x] 6.6 Confirm `cacheComponents`, `reactCompiler`, and Partial Prerendering were not enabled anywhere (check `next.config.mjs` and any new config the codemods may have added)

## 7. Update documentation

- [x] 7.1 Update SPEC.md: change the tech-stack table's Framework row to "Next.js 16 (App Router), React 19", and remove known-debt item 1 (this Next.js 16 upgrade, now complete), renumbering the remaining items; verify by re-reading SPEC.md sections 2 and 5

## 8. Deploy and verify in production

- [ ] 8.1 Commit all changes from this upgrade (including the SPEC.md update) and push to `main`
- [ ] 8.2 Confirm the Vercel deployment for this push succeeds; if it fails, fix the underlying cause and re-push — a failed deploy is part of this change, not something to defer
- [ ] 8.3 Manually check the live site at https://snowball-blue.vercel.app: the home page, the login page, and the public campaign page /c/launch-giveaway all load without error
- [ ] 8.4 Manually confirm `/dashboard` redirects to `/login` when logged out on the live production site (not just locally); if it doesn't, fix the underlying cause before considering this change done

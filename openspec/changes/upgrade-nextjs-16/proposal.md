## Why

The app is pinned to Next.js 14.2.35 / React 18.3.1, which are increasingly behind current Next.js releases. Upgrading now — while the app is still small — is far cheaper than upgrading later once more routes and dependencies exist. This is a maintenance upgrade only: no new product capability is being added, and the app's observable behavior (auth, dashboard scoping, public referral flow) must remain identical throughout.

## What Changes

- Run `npx @next/codemod@canary agents-md` first, so version-matched Next.js 16 docs are available locally to consult during the upgrade — this app's training-data knowledge of Next 16 specifics may be stale, per the official upgrade guide's own recommendation.
- Upgrade `next` (14.2.35 → 16.x), `react` and `react-dom` (18.3.1 → 19.x), and `@types/react` / `@types/react-dom` to their matching v19 types.
- Run the official Next.js upgrade codemod, then the async request API codemod (Next 16 makes `params`/`searchParams` async in Server Components and Route Handlers).
- **BREAKING (internal only, no external contract change)**: `params` becomes a `Promise` in `src/app/c/[slug]/page.tsx`, `src/app/dashboard/campaigns/[id]/page.tsx`, `src/app/api/campaigns/[id]/route.ts`, and `src/app/api/webhooks/[provider]/route.ts` — each must `await params` before use. The codemod handles the mechanical rewrite; each file gets verified by hand afterward.
- Handle the `middleware.ts` → `proxy.ts` rename Next 16 introduces. `src/middleware.ts` uses NextAuth v4's `withAuth` helper to protect `/dashboard/*`. The new `proxy` convention drops edge runtime support; if `withAuth` turns out incompatible with that shift, `middleware.ts` stays as-is (not renamed), with the reason documented in design.md — dashboard protection must not regress for the sake of following the rename.
- Remove the `"lint": "next lint"` script from `package.json` — `next lint` no longer exists in Next 16, and ESLint was never actually installed in this project (a pre-existing gap noted in an earlier change), so there is nothing left for that script to invoke.
- **Explicitly out of scope — do not enable**: `cacheComponents`, `reactCompiler`, or Partial Prerendering. This change upgrades the framework version only; adopting new Next 16 rendering/compiler features is a separate decision for later.
- Once local verification passes, update SPEC.md's tech-stack table and known-debt list to reflect the completed upgrade, then commit, push, and confirm the Vercel deployment succeeds and the live production site works — closing the gap where local-only verification previously let a production-only bug through.

This change is revert-friendly: it is dependency-version and syntax updates only (plus the codemod-driven `params` rewrites and the possible `middleware.ts` retention decision). There is no database schema change and no data migration — reverting means reverting `package.json`/lockfile and the codemod'd files.

## Capabilities

### New Capabilities
- None — this is a framework/dependency upgrade with no product-behavior change. Per `skip_specs: true` in this change's `.openspec.yaml`, no spec deltas are created.

### Modified Capabilities
- None. The `user-auth` capability's "Session-gated dashboard access" requirement must continue to hold exactly as specified — this change does not alter that requirement, it only changes how it's implemented (middleware vs. proxy), which is why verification includes a manual re-check of that exact behavior.

## Impact

- **Code**: `package.json` / lockfile (dependency versions, removed `lint` script), `src/app/c/[slug]/page.tsx`, `src/app/dashboard/campaigns/[id]/page.tsx`, `src/app/api/campaigns/[id]/route.ts`, `src/app/api/webhooks/[provider]/route.ts` (async `params`), `src/middleware.ts` (kept as-is or renamed to `proxy.ts`, per the compatibility finding), possibly a new `AGENTS.md` (from the `agents-md` codemod).
- **Dependencies**: `next` 14→16, `react`/`react-dom` 18→19, `@types/react`/`@types/react-dom` to matching v19 types. No other dependencies change.
- **Data**: none — no schema or migration impact.
- **Verification**: `npm run test:e2e` (all 8 flows), `npm run build`, `npm run typecheck` must all pass; manual confirmation that `/dashboard` still redirects to `/login` when logged out.
- **Docs**: SPEC.md's tech-stack table and known-debt list updated to reflect the completed upgrade.
- **Deployment**: this change is not done until the Vercel deployment for it succeeds and the live site (home, login, `/c/launch-giveaway`, dashboard redirect) is manually confirmed working.

## Context

See proposal.md - Why. Relevant constraints from the current codebase:
- `next@^14.2.35`, `react@^18.3.1`, `react-dom@^18.3.1` are the current versions; `@types/react@^18.3.3` / `@types/react-dom@^18.3.0` match them.
- `src/middleware.ts` uses NextAuth v4's `withAuth` helper (from `next-auth/middleware`), matched to `/dashboard/:path*`, to protect the dashboard (see the archived `add-email-password-auth` change). This is the single most security-relevant file touched by this upgrade.
- Four files destructure `params` synchronously: `src/app/c/[slug]/page.tsx`, `src/app/dashboard/campaigns/[id]/page.tsx`, `src/app/api/campaigns/[id]/route.ts`, `src/app/api/webhooks/[provider]/route.ts` (confirmed by grep — no other files under `src/app` use `params`, and the only `searchParams` usages elsewhere are the unrelated client-side `useSearchParams()` hook and the unrelated `URLSearchParams` API in `src/lib/referral.ts`).
- `"lint": "next lint"` exists in `package.json` but ESLint was never installed in this project (a pre-existing gap noted during the `add-playwright-e2e-tests` change) — `next lint` doesn't exist in Next 16 regardless, so this script has to go either way.
- An `e2e/` Playwright suite (8 flows) already exists and is the safety net this upgrade leans on — per the proposal, a failing flow means fixing the underlying cause, not adjusting the test.

## Goals / Non-Goals

**Goals:**
- Next 16 + React 19 running with `npm run build`, `npm run typecheck`, and all 8 E2E flows green.
- Dashboard route protection (`/dashboard/*` requiring a session) verified intact both by the E2E suite and by hand.
- No product-observable behavior changes anywhere in the app.

**Non-Goals:**
- Adopting `cacheComponents`, `reactCompiler`, or Partial Prerendering — explicitly out of scope per the proposal.
- Any other dependency upgrade (Prisma, NextAuth, Zod, Tailwind, etc.) beyond what Next 16 / React 19 requires.
- Re-architecting the middleware/auth approach — the goal is to preserve current behavior through the version bump, not redesign it.

## Decisions

**Fetch version-matched docs first via `npx @next/codemod@canary agents-md`, before touching any dependency.**
- Why: Next 16 changed enough (async request APIs, the proxy rename) that general model knowledge of "Next.js" may reflect older versions. Running this first gives an `AGENTS.md` with current, version-matched guidance to consult for exact codemod invocations and edge cases encountered later in this same change.

**Upgrade order: fetch docs → bump `next`/`react`/`react-dom`/`@types/react`/`@types/react-dom` → run the official upgrade codemod → run the async-request-API codemod → fix up `middleware.ts` → remove the `lint` script → verify.**
- Why this order: the upgrade codemod handles broad mechanical changes the Next.js team ships codemods for; running it before the more targeted async-params codemod avoids the two codemods fighting over the same lines. Middleware is handled after the codemods run (it's a manual, security-sensitive decision, not something to delegate to a codemod). Verification is last and is a hard gate, not a formality — see Migration Plan.

**`middleware.ts` → `proxy.ts`: attempt the rename, but keep `middleware.ts` if `withAuth` doesn't work under the new `proxy` conventions.**
- Next 16 renames the middleware convention to `proxy` and drops edge runtime support for it. NextAuth v4's `withAuth` was built for the old middleware convention; whether it works unmodified under `proxy` is unknown until tried.
- Decision rule: attempt migrating `src/middleware.ts` to `src/proxy.ts` (or whatever the exact Next 16 convention turns out to be, per the fetched docs) using the same `withAuth` call. If it type-checks, builds, and the manual `/dashboard` → `/login` redirect check still passes, keep the rename. If `withAuth` breaks under `proxy` (compile error, runtime error, or the redirect check fails), revert to keeping `middleware.ts` exactly as it works today, and record the specific incompatibility found here in this section once known.
- Why this rule and not just "always keep middleware.ts": Next 16 may deprecate (not necessarily remove) the old middleware convention, so attempting the migration first keeps the app on the supported path when possible, while the fallback guarantees the proposal's non-negotiable constraint — dashboard protection must not regress — is met either way.
- Alternative considered: drop `withAuth` entirely and hand-roll the session check in middleware/proxy using `getToken` from `next-auth/jwt` directly. Rejected for this change — that's a real behavior-preserving rewrite with its own risk surface, bigger than what this dependency upgrade needs; only reach for it if both the rename and keeping `middleware.ts` somehow fail, which would itself be a reason to pause and reassess rather than improvise further.

**Verification order: `typecheck` → `build` → `test:e2e` → manual `/dashboard` check.**
- Why this order: typecheck and build fail fast and cheap; the E2E suite (which spins up the real dev server against the real dev database) is the most expensive and most authoritative check, so it runs after the cheaper gates pass. The manual check comes last as a direct, human confirmation of the single behavior explicitly called out as most at risk.
- A failing E2E flow means finding and fixing the underlying cause in the app or the upgrade steps — never loosening or rewriting the test to make it pass, per the proposal.

## Risks / Trade-offs

- **[Risk]** `withAuth` may be incompatible with the new `proxy` convention in a way that's subtle rather than a hard error (e.g., it works but silently stops enforcing the redirect) → **Mitigation**: the manual `/dashboard` → `/login` check (logged out) is required regardless of which path (`middleware.ts` kept vs. renamed) is taken, specifically to catch this.
- **[Risk]** The async-request-API codemod may not perfectly rewrite every call site (e.g., a destructured `params` used far from the function signature) → **Mitigation**: each of the four named files gets read and hand-verified after the codemod runs, not just trusted blindly; `npm run typecheck` will also catch a missed `await`.
- **[Risk]** React 19 has known breaking changes beyond what codemods cover (e.g., stricter ref/prop-types handling in some libraries) → **Mitigation**: this app's dependency surface touching React internals is small (no class components, no legacy ref patterns observed); `npm run build` and the full E2E suite are the actual gate, not an assumption that "codemods handled everything."
- **[Risk]** Reverting after a partial upgrade could be messy if left mid-way → **Mitigation**: proposal already establishes this change as revert-friendly (dependency + syntax only, no data migration); if verification fails and the cause isn't quickly fixable, the whole change reverts via `package.json`/lockfile + the touched files, not a partial rollback.
- **[Risk]** Next 16's new dev-server lockfile (preventing two `next dev` instances per project) could conflict with Playwright's `webServer`, which either starts its own dev server or reuses one already running manually → **Mitigation**: task 6.3 explicitly verifies this interaction post-upgrade and adjusts `playwright.config.ts` if needed; outcome recorded here once known.
- **[Risk]** All verification so far in this project has been local-only, which previously let a production-only bug reach deploy undetected → **Mitigation**: this change's Definition of Done now includes confirming the Vercel deployment succeeds and manually checking the live site, not just local checks.

## Migration Plan

1. `npx @next/codemod@canary agents-md`.
2. Upgrade `next`, `react`, `react-dom`, `@types/react`, `@types/react-dom` to their v16/v19-matching versions.
3. Run the official Next.js upgrade codemod.
4. Run the async request API codemod; hand-verify the four named files.
5. Attempt the `middleware.ts` → `proxy.ts` migration; fall back to keeping `middleware.ts` if `withAuth` is incompatible, documenting the specific incompatibility found.
6. Remove `"lint": "next lint"` from `package.json`.
7. Verify in order: `npm run typecheck`, `npm run build`, the Playwright `webServer`/lockfile compatibility check, `npm run test:e2e` (all 8 flows), manual `/dashboard` redirect-to-`/login` check while logged out.
8. Update SPEC.md's tech-stack table and known-debt list to reflect the completed upgrade.
9. Commit, push to `main`, confirm the Vercel deployment succeeds, and manually verify the live site (home, login, `/c/launch-giveaway`, and the `/dashboard` → `/login` redirect) — a failed deploy or a live-site error is part of this change, not deferred.

Rollback: revert `package.json` + lockfile and every file touched by the codemods/manual fixes (`src/app/c/[slug]/page.tsx`, `src/app/dashboard/campaigns/[id]/page.tsx`, `src/app/api/campaigns/[id]/route.ts`, `src/app/api/webhooks/[provider]/route.ts`, `src/middleware.ts`/`src/proxy.ts`) — no database or data migration to unwind.

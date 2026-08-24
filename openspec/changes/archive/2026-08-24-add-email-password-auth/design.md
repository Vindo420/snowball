## Context

See proposal.md - Why. Constraints from the current codebase:
- `User.passwordHash String?` already exists in `prisma/schema.prisma`; no `Account`/`Session` models exist.
- `next-auth@^4.24.7` and `bcryptjs` are already installed dependencies but entirely unwired.
- `.env.example` already reserves `NEXTAUTH_URL` / `NEXTAUTH_SECRET`.
- No `src/middleware.ts` exists; `/dashboard/*` is currently open to anyone.
- `src/app/api/campaigns/route.ts` (`POST`, `GET`) and `src/app/api/campaigns/[id]/route.ts` (`GET`/`PATCH`/`DELETE`) currently trust a client-supplied `userId` and perform no ownership checks at all.

## Goals / Non-Goals

**Goals:**
- Real credential verification for signup/login/logout, with sessions available to both Server Components and Route Handlers.
- Every dashboard page and campaign-mutating/reading API route resolves "current user" from the session, never from a client-supplied value.
- No Prisma schema migration required.
- Public participant-facing routes (`/c/[slug]`, `POST /api/referrals`) remain fully accessible without a session — this change only adds authentication to the operator-facing dashboard and campaign-management API.

**Non-Goals:**
- OAuth/social login, password reset, or email verification (not requested; can be added later without changing this design).
- Multi-user teams / shared campaign ownership (schema already models one `User` per `Campaign` via `userId`; unchanged).
- Rate limiting on login/signup (tracked separately under SPEC.md roadmap item 11).

## Decisions

**NextAuth Credentials provider + JWT session strategy**, not the database session strategy.
- Why: the database strategy requires `Account`/`Session` Prisma models, which don't exist today; JWT sessions need only `NEXTAUTH_SECRET` (already reserved in `.env.example`). Adding those tables now would be schema churn purely for infrastructure, not for a requested capability.
- Alternative considered: a hand-rolled cookie/session system instead of NextAuth. Rejected — NextAuth is already an installed dependency and SPEC.md explicitly calls it out as the intended choice.

**`src/lib/auth.ts` exports a shared `authOptions` object** (Credentials provider, JWT callbacks that embed `user.id`, custom `/login` page), consumed by both `src/app/api/auth/[...nextauth]/route.ts` and every server-side `getServerSession(authOptions)` call.
- Why: NextAuth v4's App Router integration requires the same `authOptions` in the route handler and anywhere else `getServerSession` is called; centralizing avoids drift.

**`src/middleware.ts` uses NextAuth's `withAuth` middleware helper, matched to `/dashboard/:path*`.**
- Why: a single middleware matcher protects all current and future dashboard routes without per-page checks; unauthenticated requests are redirected to `/login` before any Server Component runs.
- Alternative considered: a per-page `getServerSession` check in each dashboard page (as already partly done ad hoc). Rejected — doesn't scale as dashboard routes grow, and doesn't protect a page a developer forgets to check.

**API routes derive the user id from `getServerSession(authOptions)` inside the route handler**, not from middleware, since middleware only redirects — it doesn't have a clean way to inject the resolved user into a Route Handler in NextAuth v4's App Router integration.
- `POST /api/campaigns`: drop `userId` from the Zod input schema entirely; set it server-side from the session.
- `GET /api/campaigns`: drop the `userId` query param; always filter `where: { userId: session.user.id }`.
- `GET/PATCH/DELETE /api/campaigns/[id]`: fetch the campaign, compare `campaign.userId === session.user.id`; return 404 (not 403) on mismatch to avoid confirming a campaign id exists to a non-owner.
- Any request with no session on these routes returns 401.

**Password hashing stays `bcryptjs`** (already a dependency, already used in `prisma/seed.ts`), cost factor 10 (matches existing seed script) — no reason to introduce a second hashing library.

**Minimum password length: 8 characters**, enforced via the same Zod validation pattern already used elsewhere in the API (`src/app/api/campaigns/route.ts` uses Zod for input validation) — kept consistent with the codebase's existing validation approach rather than inventing a new one.

## Risks / Trade-offs

- **[Risk]** JWT sessions can't be server-side revoked before expiry (no session table to delete from) → **Mitigation**: acceptable for this stage per SPEC.md's own phased roadmap; a database session strategy can be introduced later by adding `Account`/`Session` models without changing the spec-level behavior in `user-auth`.
- **[Risk]** Removing the `userId` field from the campaign API request/response contract is a breaking change for any existing caller that passes it explicitly → **Mitigation**: called out as **BREAKING** in proposal.md; there are no external consumers yet (pre-launch scaffold per SPEC.md), so the blast radius is limited to this repo's own dashboard code, which is updated in the same change.
- **[Risk]** Returning 404 instead of 403 for non-owned campaigns could be confused with "doesn't exist" during debugging → **Mitigation**: intentional (avoids leaking existence of other users' campaign ids); acceptable trade-off for this kind of resource.
- **[Risk]** A too-broad middleware matcher could accidentally require a session on public campaign/referral routes → **Mitigation**: matcher is scoped to `/dashboard/:path*` only; task 3.2 verifies `/c/[slug]` and `/api/referrals` stay open.

## Migration Plan

1. Add `src/lib/auth.ts` (`authOptions`) and `src/app/api/auth/[...nextauth]/route.ts` — additive, no behavior change yet.
2. Add `/signup` and `/login` pages and wire `SessionProvider` into `src/app/layout.tsx` — additive.
3. Add `src/middleware.ts` protecting `/dashboard/:path*` — this is the first behavior-changing step; from this point on, `/dashboard` requires a session.
4. Replace the `demo@snowball.dev` lookups in `src/app/dashboard/page.tsx` and `src/app/dashboard/campaigns/new/page.tsx` with `getServerSession`-derived users.
5. Update the campaign API routes to derive/enforce ownership from the session instead of trusting `userId`.
6. Add the ownership check to `src/app/dashboard/campaigns/[id]/page.tsx`.
7. No data migration needed; existing seeded demo user (`demo@snowball.dev` / `password123`) continues to work as a real login once the login page exists, since its `passwordHash` is already correctly bcrypt-hashed.

Rollback: revert the commit(s); no schema or data changes to unwind.

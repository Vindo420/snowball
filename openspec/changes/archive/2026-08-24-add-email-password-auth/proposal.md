## Why

The dashboard and campaign API routes currently have no authentication at all: every page and route looks up (or trusts a client-supplied) `demo@snowball.dev` / `userId`, so any visitor can view, create, edit, or delete any campaign. Roadmap item 1 in SPEC.md calls for wiring up real email/password auth as the prerequisite for every other multi-tenant feature.

## What Changes

- Add a signup page/flow that creates a `User` with a bcrypt-hashed password.
- Add a login page/flow using NextAuth's Credentials provider, verifying email + password against `User.passwordHash`, with a JWT session strategy (no `Account`/`Session` Prisma models exist today, so JWT avoids a schema migration for those).
- Add a logout action.
- Add `src/middleware.ts` to require a valid session for all `/dashboard/*` routes, redirecting unauthenticated visitors to `/login`.
- Replace the hardcoded `demo@snowball.dev` lookups in `src/app/dashboard/page.tsx` and `src/app/dashboard/campaigns/new/page.tsx` with the real session user (via `getServerSession`).
- **BREAKING**: `POST /api/campaigns` and `GET /api/campaigns` no longer accept a client-supplied `userId` (body/query param) — the owning user is derived from the session. Existing callers that pass `userId` explicitly must be updated to rely on the session cookie instead.
- Add session-derived ownership checks to `GET/PATCH/DELETE /api/campaigns/:id` and to the campaign detail page `src/app/dashboard/campaigns/[id]/page.tsx` (currently has zero ownership check — any visitor who knows/guesses a campaign id can view/edit it).
- Update `prisma/seed.ts` only if needed for consistency (it already hashes a password for the demo user, so it should keep working as a valid login for local dev).

## Capabilities

### New Capabilities
- `user-auth`: account signup, login, logout, and session issuance/verification (email + password, bcrypt hashing, JWT session).
- `campaign-access-control`: authorization rules ensuring only the authenticated owner of a campaign can list, view, create, modify, or delete it, across both dashboard pages and API routes.

### Modified Capabilities
- None — no existing `openspec/specs/` capabilities exist yet in this repo.

## Impact

- **Code**: `src/app/dashboard/page.tsx`, `src/app/dashboard/campaigns/new/page.tsx`, `src/app/dashboard/campaigns/[id]/page.tsx`, `src/app/api/campaigns/route.ts`, `src/app/api/campaigns/[id]/route.ts`, new `src/middleware.ts`, new `src/lib/auth.ts`, new `src/app/api/auth/[...nextauth]/route.ts`, new `/login` and `/signup` pages, `src/app/layout.tsx` (session provider).
- **Data**: no schema migration required — `User.passwordHash` already exists; JWT strategy needs no `Account`/`Session` tables.
- **Dependencies**: `next-auth` and `bcryptjs` are already installed but unused; no new packages needed.
- **API contract**: removes the client-supplied `userId` field from the campaign creation/list API — a breaking change for any existing (currently trust-based) caller.

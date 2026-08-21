## 1. Auth foundation

- [ ] 1.1 Add `src/lib/auth.ts` exporting `authOptions` (Credentials provider verifying email/password against `User.passwordHash` via `bcryptjs.compare`, JWT session strategy, JWT callback embedding `user.id`, custom `/login` page) and verify it type-checks (`npm run typecheck`)
- [ ] 1.2 Add `src/app/api/auth/[...nextauth]/route.ts` exporting the NextAuth handler built from `authOptions`, and verify `GET/POST /api/auth/session` responds without error when the dev server is running
- [ ] 1.3 Wrap `src/app/layout.tsx` in a `SessionProvider` client wrapper and verify the app still renders (`npm run dev`, load `/`)

## 2. Signup and login UI

- [ ] 2.1 Add `POST /api/signup` (kept out of `/api/auth/*`, which is reserved for NextAuth's own `[...nextauth]` catch-all route) that validates email + password (min 8 chars) with Zod, rejects duplicate emails, hashes the password with `bcryptjs` (cost 10), and creates the `User`; verify with a duplicate-email request returning an error and a valid request creating a row (`npm run db:studio` or a quick script)
- [ ] 2.2 Add a `/signup` page with an email/password form calling the signup endpoint and then signing the user in; verify by signing up a new account through the browser and landing on `/dashboard`
- [ ] 2.3 Add a `/login` page with an email/password form calling NextAuth's `signIn('credentials', ...)`; verify a correct email/password logs in and reaches `/dashboard`, and wrong credentials show an error without redirecting
- [ ] 2.4 Add a logout action/button (NextAuth `signOut()`) reachable from the dashboard; verify clicking it clears the session and a subsequent `/dashboard` request redirects to `/login`

## 3. Protect dashboard routes

- [ ] 3.1 Add `src/middleware.ts` using NextAuth's `withAuth`, matched to `/dashboard/:path*`, redirecting unauthenticated requests to `/login`; verify by requesting `/dashboard` while logged out (browser redirects to `/login`) and while logged in (page renders)
- [ ] 3.2 Verify the middleware matcher does not affect public routes: request `/c/[slug]` and `POST /api/referrals` while logged out and confirm both succeed exactly as before this change (no redirect, no 401)

## 4. Replace hardcoded demo user lookups

- [ ] 4.1 Replace the `getDemoUser`/hardcoded `demo@snowball.dev` lookup in `src/app/dashboard/page.tsx` with the session user via `getServerSession(authOptions)`, and verify the dashboard lists only that logged-in user's campaigns
- [ ] 4.2 Replace the same hardcoded lookup in `src/app/dashboard/campaigns/new/page.tsx` with the session user, and verify creating a campaign while logged in as a given user succeeds
- [ ] 4.3 Add an ownership check to `src/app/dashboard/campaigns/[id]/page.tsx` (404/redirect if `campaign.userId !== session.user.id`), and verify a second test user cannot open the first user's campaign detail page by URL

## 5. Enforce ownership in the campaign API

- [ ] 5.1 Update `POST /api/campaigns` to drop `userId` from the Zod input schema and set the campaign's owner from `getServerSession`; return 401 if unauthenticated; verify with a request that omits `userId` and one that tries to pass a different `userId` (both succeed and always create the campaign owned by the session user)
- [ ] 5.2 Update `GET /api/campaigns` to drop the `userId` query param and always filter by the session user; return 401 if unauthenticated; verify a request with a different `userId` query param still only returns the caller's own campaigns
- [ ] 5.3 Update `GET/PATCH/DELETE /api/campaigns/[id]` to require a session (401 if absent) and return 404 when `campaign.userId !== session.user.id`; verify with two seeded users that user B gets 404 on user A's campaign id for all three verbs, and user A succeeds

## 6. Verification pass

- [ ] 6.1 Run `npm run typecheck` and `npm run lint` and confirm both pass
- [ ] 6.2 Manually walk the end-to-end flow in the browser: sign up → land on dashboard (empty) → create a campaign → log out → confirm `/dashboard` redirects to `/login` → log back in → confirm the created campaign is still visible → confirm the seeded demo user (`demo@snowball.dev` / `password123`) can still log in and only sees its own seeded campaign

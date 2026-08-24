# Snowball, Product & Architecture Spec

Status: v0.2, deployed. This document is the shared source of truth for
continuing this build in Claude Code inside VS Code. Keep it updated as
decisions change; it is more useful than any single conversation with Claude.

**Live:** https://snowball-blue.vercel.app
**Repo:** https://github.com/Vindo420/snowball

## 1. What we're building

A self-hosted alternative to [Upviral](https://www.upviral.com/): a platform
for running viral referral and giveaway campaigns. The core loop is:

1. A business creates a **campaign** (a giveaway, waitlist, or evergreen referral program).
2. A visitor lands on the campaign page and enters with their email.
3. They get a **unique referral link**. Every friend who signs up through that
   link counts toward their referral total.
4. Referral counts unlock **reward tiers** and move people up a **leaderboard**,
   which motivates more sharing.
5. Every new lead is pushed into the business's **email/CRM tool** automatically.

Where we intend to do better than Upviral:
- Modern, fast front end. Upviral's UI is dated and sluggish.
- Open, inspectable fraud rules instead of an opaque black box.
- Self-hosted and source-available, so no per-lead pricing tax as you grow.
- API-first: every action the dashboard performs is a documented REST endpoint.

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | One codebase for marketing site, dashboard, public campaign pages, and API. |
| Language | TypeScript | Zod validates the same shapes at runtime. |
| Database | Supabase Postgres | Pooled connection (port 6543) for the app, direct (5432) for migrations. |
| ORM | Prisma | Type-safe queries plus a GUI via `npm run db:studio`. |
| Auth | NextAuth v4, Credentials provider, JWT sessions | Wired up and working. No Account/Session tables needed. |
| Styling | Tailwind CSS | |
| Hosting | Vercel | Deploys automatically on every push to `main`. |

### Environment variables

Set in `.env` locally and in Vercel's project settings for production. All five
are required; **a blank value breaks the build**, which is how we lost an hour
during the first deploy.

- `DATABASE_URL` (Supabase pooled, port 6543, ends `?pgbouncer=true`)
- `DIRECT_URL` (Supabase direct, port 5432)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (full https URL, no trailing slash)
- `NEXT_PUBLIC_APP_URL` (same value; **builds every referral share link**, so a
  wrong value here silently breaks the core product)

## 3. Data model

See `prisma/schema.prisma` for the authoritative version.

- **User**: the business owner/operator (account holder).
- **Campaign**: one giveaway or referral program. Has a `type` (SWEEPSTAKES,
  REWARDS, WAITLIST, MILESTONE, CUSTOM), a `displayMode` (LANDING_PAGE, EMBED,
  POPUP, POPOVER), and a freeform `pageConfig` JSON blob for the page builder.
- **Participant**: one entrant in one campaign. Has a unique `refCode` used to
  build their personal share link, a `referredById` pointing at whoever brought
  them in, running `points` and `referralCount`, and a fraud `status`.
- **Referral**: one edge in the referral graph, referrer to referee, plus the
  `channel` it came through (link, Facebook, Instagram Story, and so on).
- **RewardTier**: "refer N people, get X." `ParticipantReward` records which
  tiers a participant has unlocked and whether the reward was delivered.
- **Integration**: a campaign-level connection to an email/CRM tool or a
  generic outbound webhook (Zapier or Pabbly style).

## 4. What works today

- Full Prisma schema against Supabase Postgres.
- **Authentication**: signup, login, logout via NextAuth Credentials with JWT
  sessions. `src/middleware.ts` protects `/dashboard/*`. Every dashboard page
  and campaign API route derives ownership from the session, never from
  client-supplied input. Verified: two accounts cannot see each other's
  campaigns.
- **Public routes stay unauthenticated by design**: `/c/[slug]` and
  `POST /api/referrals` must never require a login. This is a spec-level
  guarantee in `openspec/specs/user-auth/`, not just a convention.
- Campaign CRUD API with ownership enforcement, returning 404 (not 403) for
  non-owned campaigns so campaign IDs cannot be probed.
- `POST /api/referrals`: fraud check, create participant, credit referrer,
  unlock reward tiers, dispatch to integrations.
- Public campaign page: entry form, personal share link, share buttons
  (Facebook, X, WhatsApp, Instagram Story, email, copy), live leaderboard.
- Dashboard: list campaigns, create campaigns, view reward tiers, integrations,
  and leaderboard.
- Deployed to Vercel, auto-deploying from `main`.

## 5. Known debt

Things that are wrong or missing today, roughly by urgency:

1. **Upgrade to Next.js 16.** Now on 14.2.35, which patches the flagged
   denial-of-service issue (CVE-2025-67779) and is the final release of the
   14.x line. `npm audit` still reports advisories because some were only ever
   fixed in 15.x and 16.x. Checked against this app's config: the Image
   Optimizer, Server Actions, rewrites, i18n, and custom-server advisories do
   not apply (none of those features are used), and the postcss ones are
   build-time only. A few cache-poisoning items are harder to rule out. Do NOT
   run `npm audit fix --force`, which jumps straight to 16.3.2 unplanned.
   Schedule this as its own OpenSpec change with real testing.
2. **Dev and production share one Supabase database.** Test data mixes with
   real data. Split into two projects (the free tier allows two) before any
   real users exist.
3. **No ESLint.** `npm run lint` is defined in package.json but the tooling was
   never installed. Only `npm run typecheck` currently works.
4. **No rate limiting** on `/api/referrals` or on login/signup. The fraud checks
   in `src/lib/fraud.ts` (duplicate email, IP velocity, disposable domains) are
   a starting point, not a finished system.
5. **Stale row in the database**: a leftover `demo@upviral-clone.dev` user from
   before the project was renamed.
6. **No automated tests.** Every verification so far has been manual.

## 6. Roadmap

1. **Drag-and-drop page builder.** `Campaign.pageConfig` already exists as a
   JSON bag. Build a section-based editor (hero, countdown, leaderboard, share,
   testimonials) with live preview, rendered by a matching `PageRenderer` on the
   public page. This is the biggest differentiator versus competitors.
2. **Embed, popup, and popover delivery.** A small `public/embed.js` that
   customers paste onto their own site, injecting an iframe or modal pointed at
   `/c/[slug]` in the right `displayMode`.
3. **Real CRM integrations.** Fill in the Mailchimp, ActiveCampaign, HubSpot,
   and ConvertKit stubs in `src/lib/integrations.ts` with real API calls, plus
   dashboard UI to configure API keys and list/tag mapping. The generic webhook
   path already works.
4. **Real Instagram Story sharing.** Instagram has no web share endpoint. Real
   support means generating a per-participant share image (for example via
   `@vercel/og` at `/api/campaigns/[id]/share-image?ref=CODE`, rendering
   something like "you're #3 on the leaderboard") and deep-linking into the app
   with it as the background. The button and deep link already exist in
   `src/components/ShareButtons.tsx`; only image generation is missing.
5. **Per-campaign scoring rules.** Points-per-referral is hardcoded to `10` in
   `recordReferral`. Make it configurable, and consider point decay and bonus
   multipliers for parity with Upviral's Sweepstakes mode.
6. **A/B testing.** N variants of `pageConfig`, cookie-based bucket assignment,
   and a `variant` column on Participant for reporting.
7. **Analytics.** Conversion rate (visits to entries), K-factor (referrals per
   participant), channel breakdown, campaign comparison.
8. **Custom domains.** A `Domain` model, DNS verification, and middleware
   resolving incoming host to campaign.
9. **Background jobs.** Move integration dispatch and reward delivery off the
   request path once volume matters.

## 7. Working method

Every feature goes through OpenSpec rather than ad-hoc prompting:

1. `/opsx:propose "<what you want>"` writes a proposal, spec, design, and task
   checklist into `openspec/changes/`. No code is written yet. Review it.
2. `/opsx:update "<corrections>"` revises the plan if something is wrong.
3. Commit the plan, so there is a save point before any code changes.
4. `/opsx:apply` implements against the checklist.
5. Test manually in the browser, then commit and push. Pushing to `main`
   deploys to production automatically.
6. `/opsx:archive` files the completed change.

Update this document whenever section 4, 5, or 6 stops being true.

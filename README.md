# Snowball

A self-hosted viral referral & giveaway platform — a from-scratch, open
alternative to [Upviral](https://www.upviral.com/). See **[SPEC.md](./SPEC.md)**
for the full product spec, architecture, data model, and roadmap. Read that
first — it's written to be handed to Claude Code as ongoing context.

## Quick start

```bash
npm install
cp .env.example .env        # defaults work out of the box with SQLite
npm run db:push             # create the SQLite database from prisma/schema.prisma
npm run db:seed             # demo user + one fully-configured demo campaign
npm run dev
```

Then open:
- http://localhost:3000 — marketing home
- http://localhost:3000/dashboard — campaign dashboard (demo user, no auth yet)
- http://localhost:3000/c/launch-giveaway — the seeded public campaign page

Demo login (once auth is wired up per the roadmap): `demo@snowball.dev` / `password123`.

## Project layout

```
prisma/schema.prisma        Data model (Campaign, Participant, Referral, RewardTier, Integration...)
prisma/seed.ts               Demo data
src/app/                     Next.js App Router pages + API routes
  api/campaigns/             Campaign CRUD
  api/referrals/             Public entry endpoint (signup + referral crediting)
  api/webhooks/[provider]/   Inbound webhook receiver stub
  dashboard/                 Campaign owner dashboard
  c/[slug]/                  Public campaign landing page
src/components/              CampaignForm, EntryForm, ShareButtons, Leaderboard, CampaignLanding
src/lib/                     db.ts (Prisma client), referral.ts, fraud.ts, integrations.ts
SPEC.md                      Full product/architecture spec + roadmap — read this
```

## What's already working

Create a campaign → share the public link → enter as a participant → get a
personal referral link → share it (Facebook/X/WhatsApp/Instagram
Story/Email/copy) → referrals are counted → reward tiers unlock → new leads
fan out to configured integrations (a generic webhook works today; Mailchimp/
ActiveCampaign/HubSpot/ConvertKit are stubbed, see SPEC.md).

## What's next

Auth, the drag-and-drop page builder, real CRM integrations, embeds/popups,
A/B testing, analytics, custom domains, background jobs, and hardening —
all scoped out in [SPEC.md](./SPEC.md) section 5, with suggested Claude Code
prompts for each in section 6.

## Switching to Postgres

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Point `DATABASE_URL` in `.env` at your Postgres instance, then run
`npm run db:push` (or set up proper migrations with `npm run db:migrate`).

## Running the E2E tests

An automated [Playwright](https://playwright.dev/) suite covers the auth,
campaign-ownership, and public referral flows end-to-end, so you don't have
to click through the app by hand to check they still work.

**Prerequisites:**
- `.env` configured with a working `DATABASE_URL`/`DIRECT_URL` (the suite
  runs against your local dev database — see the guard note below).
- Playwright's browser binaries installed once: `npx playwright install --with-deps chromium`.

**Run it:**

```bash
npm run test:e2e
```

That's the whole command — Playwright starts the dev server for you (on
port 3001, matching `NEXTAUTH_URL`) if one isn't already running, or reuses
one you already have open.

Notes:
- Every test creates its own uniquely-named user/campaign/participant data
  (an `e2e-<random>` slug prefix, an `@e2e.test` email suffix) and deletes
  it afterward, so repeated runs never collide or leave junk behind — safe
  to run against the same database you use for local development.
- A guard refuses to run any test at all if `DATABASE_URL`/`DIRECT_URL`
  resolves to the production Supabase project — these tests create and
  delete real rows and must never touch production data.

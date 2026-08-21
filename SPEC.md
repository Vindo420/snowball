# Snowball — Product & Architecture Spec

Status: v0.1 scaffold. This document is the shared source of truth for continuing
this build in Claude Code inside VS Code. Keep it updated as decisions change —
it's more useful than any single conversation with Claude.

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
- Modern, fast, no-jQuery front end (Upviral's UI is dated and sluggish).
- Open, inspectable fraud rules instead of an opaque black box.
- Self-hosted / source-available — no per-lead pricing tax once you outgrow it.
- API-first: every action the dashboard does is a documented REST endpoint.

## 2. Tech stack (and why)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Single codebase for marketing site, dashboard, public campaign pages, and API routes. |
| Language | TypeScript | Type safety across API boundary (Zod validates at runtime too). |
| Database | SQLite for dev, Postgres for prod (via Prisma) | Zero-setup local dev; swap `provider` in `prisma/schema.prisma` and `DATABASE_URL` when deploying. |
| ORM | Prisma | Type-safe queries, migrations, and a GUI (`npm run db:studio`) for free. |
| Auth | NextAuth.js (not yet wired up — see Roadmap) | Standard, supports email/password and OAuth later. |
| Styling | Tailwind CSS | Fast to iterate on marketing/dashboard UI without a design system dependency. |
| Validation | Zod | Shared shape between API input validation and TypeScript types. |
| Deployment target | Vercel (app) + Neon/Supabase/RDS (Postgres) | Minimal ops for a small team; swap for Docker + any Postgres if self-hosting fully. |

## 3. Data model

See `prisma/schema.prisma` for the authoritative version. Summary:

- **User** — the business owner/operator (account holder).
- **Campaign** — one giveaway/referral program. Has a `type` (SWEEPSTAKES,
  REWARDS, WAITLIST, MILESTONE, CUSTOM), a `displayMode` (LANDING_PAGE, EMBED,
  POPUP, POPOVER), and a freeform `pageConfig` JSON blob for the page builder.
- **Participant** — one entrant in one campaign. Has a unique `refCode` used
  to build their personal share link, a `referredById` pointing at whoever
  brought them in, running `points`/`referralCount`, and a fraud `status`.
- **Referral** — one edge in the referral graph: referrer → referee, plus
  which `channel` it came through (link, Facebook, Instagram Story, etc).
- **RewardTier** — "refer N people, get X." `ParticipantReward` records which
  tiers a given participant has unlocked and whether the reward was delivered.
- **Integration** — a campaign-level connection to an email/CRM tool or a
  generic outbound webhook (Zapier/Pabbly-style).

## 4. What's implemented in this scaffold

- Full Prisma schema (above).
- `POST /api/campaigns`, `GET /api/campaigns`, `GET/PATCH/DELETE /api/campaigns/:id`.
- `POST /api/referrals` — the public entry endpoint: fraud check → create
  participant → credit referrer → unlock reward tiers → fan out to integrations.
- `POST /api/webhooks/:provider` — inbound webhook stub for provider callbacks.
- `src/lib/referral.ts` — ref code generation, referral crediting, reward unlocking.
- `src/lib/fraud.ts` — duplicate email, IP velocity, and disposable-domain checks.
- `src/lib/integrations.ts` — dispatch stub for Mailchimp/ActiveCampaign/HubSpot/
  ConvertKit/generic webhook (webhook is fully implemented; the CRM ones are
  TODO API calls, structured so filling them in is mechanical).
- Dashboard: list campaigns, create a campaign, view one campaign's reward
  tiers/integrations/leaderboard.
- Public campaign page (`/c/[slug]`): entry form → reveals personal share link
  → share buttons (Facebook, X, WhatsApp, Instagram Story, Email, copy link)
  → live leaderboard.
- Demo data via `npm run db:seed`.

## 5. What's explicitly NOT done yet (roadmap)

Roughly in the order I'd tackle them:

1. **Auth** — wire up NextAuth (email/password to start), replace every
   `demo@snowball.dev` lookup with the real session user, and protect
   `/dashboard/*` and the campaign-mutating API routes.
2. **Drag-and-drop page builder** — `Campaign.pageConfig` already exists as a
   JSON bag; build a section-based editor (hero, countdown, leaderboard,
   share, testimonials) with a live preview, rendered by a matching
   `PageRenderer` component on the public page.
3. **Embed / popup / popover delivery** — a small `public/embed.js` script
   customers paste on their own site, which injects an iframe or modal
   pointed at `/c/[slug]` in the right `displayMode`.
4. **Real CRM integrations** — fill in the Mailchimp/ActiveCampaign/HubSpot/
   ConvertKit stubs in `src/lib/integrations.ts` with real API calls, plus a
   dashboard UI to configure each one's API key and list/tag mapping.
5. **Real Instagram Story sharing** — Instagram has no web-share endpoint;
   real support means generating a per-participant share image (e.g. via
   `@vercel/og` at `/api/campaigns/[id]/share-image?ref=CODE`, rendering
   "you're #3 on the leaderboard") and deep-linking into the IG app with it
   as the background image. The button and deep-link wiring already exist in
   `src/components/ShareButtons.tsx`; only the image generation is missing.
6. **Scoring & tier rules per campaign** — points-per-referral is currently a
   hardcoded `10` in `recordReferral`; make it configurable per campaign
   (and support point decay / double-referral bonuses if you want feature
   parity with Upviral's "Viral Sweepstakes" mode).
7. **A/B testing** — Upviral supports testing headline/copy variants; the
   simplest version is N variants of `pageConfig`, a cookie-based bucket
   assignment, and a `variant` column on `Referral`/`Participant` for
   reporting.
8. **Analytics dashboard** — conversion rate (visits → entries), K-factor
   (referrals per participant), channel breakdown, and campaign-over-campaign
   comparison.
9. **Custom domains** — Upviral lets customers point their own domain at a
   campaign; needs a `Domain` model, DNS verification flow, and Next.js
   middleware to resolve incoming host → campaign.
10. **Background jobs** — move integration dispatch and reward delivery off
    the request path once volume matters (a queue like BullMQ + Redis, or a
    cron-polled `outbox` table if you want to avoid adding infra).
11. **Rate limiting & abuse hardening** — the fraud checks in `src/lib/fraud.ts`
    are a starting point, not a finished system; add rate limiting on
    `/api/referrals` (e.g. Upstash Ratelimit) before this is public-internet-safe.

## 6. How to use this with Claude Code

This repo is meant to be opened directly in VS Code with Claude Code active.
Good first prompts, in rough order:

```
Read SPEC.md and prisma/schema.prisma, then wire up NextAuth with email/password
auth per the "Auth" item in the roadmap. Replace the demo-user lookups in
src/app/dashboard/**/*.tsx and the campaign API routes with the real session user.
```

```
Build the drag-and-drop page builder described in SPEC.md section 5, item 2.
Start with a fixed set of section types (hero, countdown, leaderboard, share,
footer) editable via a form, not free-form drag-and-drop, and store the result
in Campaign.pageConfig. Then build a PageRenderer that reads pageConfig on the
public /c/[slug] page.
```

```
Implement the real Mailchimp integration in src/lib/integrations.ts using the
Mailchimp Marketing API. Add the config fields it needs (apiKey, listId, dc) to
the Integration dashboard UI.
```

```
Add rate limiting to POST /api/referrals and tighten the fraud checks in
src/lib/fraud.ts — I want this safe to put in front of real traffic.
```

Whenever you finish a roadmap item, update section 5 of this file so the
spec stays accurate.

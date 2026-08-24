## Why

SPEC.md roadmap item 1 calls this "the biggest differentiator versus competitors." Today the public campaign page is a hardcoded layout (`CampaignLanding`) — campaign owners cannot change what's on it beyond the copy fields the create form already exposes. A section-based builder lets owners assemble their own page from existing building blocks (hero, leaderboard, reward tiers, countdown) without needing a schema migration, since `Campaign.pageConfig` already exists as a freeform JSON column for exactly this purpose.

## What Changes

- A new dashboard editor (`/dashboard/campaigns/[id]/edit`) where the owner manages a list of page sections: add, remove, and reorder via up/down buttons (explicitly not drag-and-drop in v1), with a form to edit each section's content and a live preview of the public page rendered alongside.
- Four section types for v1: `HERO` (headline, subtext, optional image as a URL string — no upload/storage), `LEADERBOARD` (existing live ranking), `REWARD_TIERS` (existing `RewardTier` records plus the current visitor's progress once they've entered), and `COUNTDOWN` (using the existing but currently-unused `Campaign.endsAt`).
- An `ENTRY_FORM` section that is always present, cannot be removed, and is not optional — a campaign page that cannot take entries is broken by definition. Enforced both in the editor UI and server-side on save, so it can't be bypassed via a direct API call either.
- A Zod schema for the `pageConfig` shape, validated both when saving (`PATCH /api/campaigns/:id`) and when reading (before rendering).
- **Critical backwards-compatibility requirement**: existing rows have an older `pageConfig` shape (`{ theme: string, sections: string[] }`, see `prisma/seed.ts`) and some are `null`. Reading a null, legacy, or malformed `pageConfig` falls back to one fixed default section layout and renders correctly — it never throws, and a malformed config never produces a 500.
- A new `PageRenderer` component (plus one renderer per section type) that replaces the hardcoded `CampaignLanding` on `/c/[slug]`, preserving the existing entry/referral behavior exactly: entering the giveaway still reveals the visitor's personal referral link and share buttons, with the same markup the existing E2E suite already depends on.
- `prisma/seed.ts` updated to write the new `pageConfig` shape.
- The dashboard editor respects existing ownership rules unchanged — it's the same `PATCH`/`GET` ownership check already specified in `campaign-access-control`, applied to a new UI surface, not a new rule.
- The live preview is non-interactive: submitting its entry form (or any other interactive control) never creates real data, via a `preview` prop threaded down to every section renderer — verified by a dedicated task.

**Assumptions recorded here for review** (implementation details the request didn't spell out; correct any of these via `/opsx:update` before implementation starts):
- `HERO`'s headline and subtext are edited via the *existing* `Campaign.headline` / `Campaign.description` columns (already present, not currently editable anywhere post-creation) rather than duplicating them inside `pageConfig` — avoids two sources of truth for the same copy. Only the image URL is new, stored in the section's own config. `Campaign.prizeDescription` keeps rendering as it does today (creation-time only); this change doesn't add editing for it.
- A legacy or malformed `pageConfig` always normalizes to the *same* fixed default layout (`HERO`, `ENTRY_FORM`, `LEADERBOARD`, `REWARD_TIERS`) rather than attempting to translate old string values like `'progress'`/`'footer'` — those don't map cleanly to v1 section types, so a fixed, well-tested default is safer than guessing.
- The entry form can be freely reordered among other sections (its position isn't pinned); only removal is blocked.
- `REWARD_TIERS` shows the tier list to everyone, and adds the visitor's own progress only after they've entered (there's no visitor identity before that point) — `POST /api/referrals`'s response gains `points`/`referralCount` (currently omitted) to support this.
- `COUNTDOWN` reads `Campaign.endsAt` directly (not duplicated into `pageConfig`); its section form is where `endsAt` becomes settable for the first time. If `endsAt` is unset, the section renders without error (no countdown shown) rather than blocking the section from being added.
- The existing read-only campaign detail page (`/dashboard/campaigns/[id]`) is left as-is, with a new "Edit page" link added to the new editor route, rather than folding the builder into that page directly.

## Capabilities

### New Capabilities
- `campaign-page-builder`: the dashboard editing experience — section list management (add/remove/reorder), per-type edit forms, live preview, save/validate, ownership-scoped access.
- `public-campaign-rendering`: the public `/c/[slug]` page's rendering contract — sections render from `pageConfig` in order, the entry form is always present and functional, backwards-compatible fallback for null/legacy/malformed configs, and preservation of the existing entry/referral/share behavior.

### Modified Capabilities
- None. `campaign-access-control`'s existing ownership requirements (owner-only read/update, 404 for non-owners) already cover the new editor route and the `pageConfig` field on the existing `PATCH`/`GET` endpoints — no new access-control requirement is introduced, just a new UI/data surface governed by the existing one.

## Impact

- **Code**: new `src/app/dashboard/campaigns/[id]/edit/page.tsx` (editor) plus supporting client components; new `src/lib/pageConfig.ts` (or similar — Zod schema, defaults, normalizer); new `src/components/page-builder/PageRenderer.tsx` and per-type section components; `src/app/c/[slug]/page.tsx` updated to use `PageRenderer`; `src/components/CampaignLanding.tsx` retired; `src/app/api/campaigns/[id]/route.ts`'s `PATCH` gets an explicit allow-listed, Zod-validated update schema (currently accepts an unvalidated arbitrary body — this closes that gap as a natural consequence of validating `pageConfig`, not a separate fix); `src/app/api/referrals/route.ts`'s response gains `points`/`referralCount`; `prisma/seed.ts` updated.
- **Data**: no schema migration — everything rides on the existing `Campaign.pageConfig` JSON column and the existing-but-unused `Campaign.endsAt`.
- **Compatibility**: the 8 existing Playwright E2E flows must keep passing unmodified; 3 new flows are added (edit a section, reorder sections + confirm public page reflects both, legacy/null `pageConfig` still renders with a working entry form).
- **Verification**: `npm run typecheck`, `npm run build`, and the full E2E suite (existing + new) must pass; after pushing, the Vercel deployment must succeed and `https://snowball-blue.vercel.app/c/launch-giveaway` must be manually confirmed rendering correctly in production.
- **Phasing**: this is large enough to warrant explicit phases — see design.md's Migration Plan. Each phase ends with the full existing E2E suite passing before the next phase begins, so a regression is caught at the smallest possible surface.

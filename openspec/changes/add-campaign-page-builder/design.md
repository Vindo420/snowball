## Context

See proposal.md - Why. Relevant constraints from the current codebase:
- `Campaign.pageConfig Json?` already exists; `Campaign.endsAt DateTime?` exists but is never set or read anywhere today.
- The public page (`src/app/c/[slug]/page.tsx`) currently renders a hardcoded `CampaignLanding` component fed `headline`, `description`, `prizeDescription` (existing `Campaign` columns) directly — `pageConfig` is stored but never read.
- `prisma/seed.ts` writes `pageConfig: { theme: 'brand', sections: ['hero', 'progress', 'leaderboard', 'share', 'footer'] }` — the legacy shape this change must tolerate.
- `PATCH /api/campaigns/:id` currently does `db.campaign.update({ where: { id }, data: body })` with **no validation at all** — any field in the request body is written directly, including in principle `userId` (an existing, unrelated gap this change's own validation work will close as a side effect, not a separate fix).
- `POST /api/referrals` currently returns `{ participant: { id, refCode } }` only — no `points`/`referralCount`.
- The existing Playwright suite (`e2e/`) drives the public page by CSS/role selectors this design must not break: `input[name="email"]`, `getByRole('button', { name: 'Enter now' })`, `getByText("You're in!")`, and a `<code>` block containing `?ref=` for the revealed share link. `e2e/helpers/campaign.ts`'s `activateCampaign` PATCHes `{ status: 'ACTIVE' }` — `status` must remain accepted by the hardened `PATCH`.

## Goals / Non-Goals

**Goals:**
- Campaign owners can compose their public page from HERO / LEADERBOARD / REWARD_TIERS / COUNTDOWN sections plus the always-present ENTRY_FORM, via add/remove/reorder (up/down) and per-type edit forms, with a live preview.
- `pageConfig` is Zod-validated on every write and every read; null/legacy/malformed configs always render the same fixed default layout, never a 500.
- The existing 8 E2E flows pass completely unmodified.

**Non-Goals:**
- Drag-and-drop reordering (explicitly deferred).
- Image upload/storage (HERO image is a URL string only).
- New section types beyond the four listed, or customizable per-instance config for LEADERBOARD/REWARD_TIERS/COUNTDOWN beyond presence/position (only HERO has editable content fields in v1).
- Any Prisma schema migration.
- Real-time/live-updating progress or leaderboard on the public page (unchanged from today — a page reload is still how updates appear).

## Decisions

**`pageConfig` shape: `{ sections: Section[] }`, where each `Section` is `{ id: string, type: 'HERO' | 'LEADERBOARD' | 'REWARD_TIERS' | 'COUNTDOWN' | 'ENTRY_FORM', ...type-specific fields }`, modeled as a Zod discriminated union on `type`.**
- Only `HERO` has extra fields in v1: `imageUrl?: string` (validated as a URL). Every section carries a stable `id` (for React keys and reorder operations) independent of its position.
- Why a discriminated union: gives exhaustive, type-safe handling per section type in both the renderer and the editor, and Zod reports a precise error for a malformed section instead of a generic shape mismatch.

**HERO's headline/subtext are NOT stored in `pageConfig`.** They reuse the existing `Campaign.headline` / `Campaign.description` columns, edited via the HERO section's form but persisted as top-level campaign fields (same `PATCH` call, different keys in the body). Only `imageUrl` is new, stored in the section object.
- Why: `headline`/`description` already exist, are already read elsewhere (e.g. `ShareButtons`' default message), and storing a second copy in `pageConfig` would create two sources of truth that can drift. `Campaign.prizeDescription` keeps rendering exactly as today and isn't touched by this change — it has no editing path before or after this change, so introducing one is out of scope.
- Alternative considered: store headline/subtext inside the HERO section object and stop using the `Campaign` columns for display. Rejected — bigger blast radius (touches `ShareButtons`' message default and anything else reading those columns) for no behavioral benefit.

**Legacy/malformed normalization: `parsePageConfig(raw)` returns one fixed `DEFAULT_PAGE_CONFIG` (`HERO`, `ENTRY_FORM`, `LEADERBOARD`, `REWARD_TIERS`, in that order) for anything that isn't a valid current-shape config — never attempts to translate old string values.**
- Why: the legacy shape's strings (`'progress'`, `'footer'`) don't map 1:1 to v1 section types (there's no "footer" concept, and "progress" is ambiguous between leaderboard and reward tiers). A guessed translation is speculative and untestable in the general case; a single well-known default is simple, safe, and exactly what "sensible default layout" in the request asks for. This function is the *only* place backward-compat logic lives — both the public renderer and the editor call it, so there's one normalization path to test, not two.
- The normalizer also enforces the ENTRY_FORM-always-present invariant as a last line of defense: even a structurally-valid config that somehow lacks an entry-form section gets one appended. This is belt-and-suspenders on top of the save-time rejection below — reading must never depend on writes having been correctly guarded.

**`ENTRY_FORM` presence is enforced in three places, not just the UI:** (1) the editor doesn't render a remove control for it, (2) `PATCH /api/campaigns/:id` rejects (400) a `pageConfig` whose `sections` has no `ENTRY_FORM` entry, (3) `parsePageConfig` appends one if it's ever missing on read. Its *position* among other sections is freely reorderable — only removal is blocked (see proposal.md's recorded assumption).

**`PATCH /api/campaigns/:id` gets an explicit Zod schema for the whole update body** — an allow-list of `name`, `slug`, `headline`, `description`, `prizeDescription`, `type`, `displayMode`, `status`, `endsAt`, `pageConfig` (each optional), with `pageConfig` validated against the full `PageConfigSchema` (including the ENTRY_FORM-presence check) when present.
- Why touch the whole body and not just add a special case for `pageConfig`: Zod-validating one field of an otherwise-unvalidated arbitrary body is inconsistent and doesn't actually close the "arbitrary field" gap for that same request. Defining the accepted shape once, here, is the natural way to "validate pageConfig... when saving" without leaving the endpoint half-hardened. `status` is kept in the allow-list specifically because `e2e/helpers/campaign.ts`'s `activateCampaign` depends on it.
- Non-goal reminder: this does not extend to auditing every other route for similar gaps — scoped to the route this feature actually touches.

**`POST /api/referrals`'s response gains `points` and `referralCount`** (both always `0` for a brand-new participant) so the client can render "your progress" immediately after entry without a second request. Purely additive — existing consumers (the current E2E assertions on `participant.refCode`) are unaffected by extra response fields.

**Editor lives at a new route, `/dashboard/campaigns/[id]/edit`, not folded into the existing read-only `/dashboard/campaigns/[id]` detail page.** The detail page gains an "Edit page" link to it. Ownership enforcement mirrors the detail page's existing pattern exactly (`getServerSession` + `campaign.userId !== session.user.id` → same not-found fallback).
- Why separate: the editor's live-preview layout (two-column: section list + forms on one side, rendered preview on the other) is a fundamentally different page shape than the detail page's single-column summary; keeping them separate avoids a large, harder-to-reason-about page component.

**Live preview reuses `PageRenderer` directly, fed the editor's in-memory draft state** (not yet saved) alongside the campaign's real reward tiers and current leaderboard data (already available server-side when the editor page loads). The preview's entry form is rendered but its submission is disabled/inert — the owner is previewing layout and copy, not entering their own campaign.
- Alternative considered: a separate, simplified preview renderer. Rejected — reusing the exact same `PageRenderer` guarantees the preview can never drift from what the public page actually renders, which is the entire point of a live preview.

**`CampaignLanding.tsx` is retired (deleted), not kept alongside `PageRenderer`.** Nothing else references it once `/c/[slug]/page.tsx` switches over.

**Live preview is non-interactive via a `preview` prop threaded through `PageRenderer` to every section component.** `EntryFormSection` disables its submit control when `preview` is true, so clicking it makes no request and creates no `Participant` row — the owner can safely explore layout/copy changes without polluting their own leaderboard. No other v1 section has an interactive control that needs gating (`ShareButtons` only ever renders post-entry, which preview mode makes unreachable).

**`CountdownSection` avoids SSR/hydration mismatches by freezing its initial render to a server-computed value, not by recomputing `Date.now()` on the client's first render.** The page component computes the remaining time once, server-side, and passes it down as a prop; `CountdownSection`'s first client render (pre-hydration) uses that exact same passed-in value, producing byte-identical markup to what the server sent. Only after mount does a `useEffect`-driven `setInterval` (which never runs during SSR or the initial hydration pass) start recomputing from real `Date.now()` calls and ticking the display.
- Why: this is the standard fix for this well-known class of bug. The alternative, `suppressHydrationWarning`, papers over the symptom (silences the warning) rather than the cause (the two renders still briefly disagree, which can flash incorrect content) and was rejected.

## Risks / Trade-offs

- **[Risk]** A regression in `PageRenderer`'s markup could silently break the existing E2E suite's selectors (`input[name="email"]`, `"Enter now"`, `"You're in!"`, the `<code>` share-link block) → **Mitigation**: Phase 2 (below) ends with the full existing 8-flow suite as a hard gate before any editor work starts; the entry-form section's implementation is a near-direct move of today's `EntryForm` + reveal logic out of `CampaignLanding`, not a rewrite.
- **[Risk]** Hardening `PATCH /api/campaigns/:id` with an allow-list could break something that currently relies on passing an unlisted field → **Mitigation**: grepped all current callers (`CampaignForm` doesn't call `PATCH` at all — only `POST`; `e2e/helpers/campaign.ts` only ever sends `{ status: 'ACTIVE' }`); the new editor is the only other caller, and it's designed against the same allow-list.
- **[Risk]** Reward-tiers "progress" requires knowing which participant is "the visitor," which only exists client-side after entry (no cookie/session for public visitors) → **Mitigation**: scoped explicitly to post-entry-only in this session (matches proposal.md's recorded assumption); no attempt at cross-visit persistence in v1.
- **[Risk]** Four phases (below) is more coordination overhead than one pass → **Mitigation**: explicitly requested by the proposal given this change's size; each phase's own verification gate catches regressions at the smallest possible surface rather than debugging a combined diff at the end.
- **[Risk]** The owner could accidentally submit a real entry from the editor's own live preview, polluting their own leaderboard and participant data → **Mitigation**: the `preview` prop disables the entry form's submit control; a dedicated task verifies no `Participant` row is created by interacting with the preview.
- **[Risk]** A countdown section's server-rendered remaining time will always differ slightly from the client's first-render value if both independently call `Date.now()`, causing a React hydration-mismatch warning (and in bad cases, visible content flicker) → **Mitigation**: the initial render is frozen to the server-computed value (passed as a prop, not recomputed client-side) until after mount; verified by an explicit console-warning check.

## Migration Plan

**Phase 1 — Schema & data layer** (no UI changes yet):
1. Add the Zod schema, `DEFAULT_PAGE_CONFIG`, and `parsePageConfig` normalizer.
2. Update `prisma/seed.ts` to the new shape.
3. Harden `PATCH /api/campaigns/:id` with the allow-listed, Zod-validated schema described above.
4. Add `points`/`referralCount` to `POST /api/referrals`'s response.
5. Checkpoint: `npm run typecheck`, `npm run build`, and the full existing 8-flow E2E suite all pass — nothing user-visible has changed yet, so this confirms the foundation didn't regress anything.

**Phase 2 — Public rendering**:
1. Build `PageRenderer` and the five section components (`HeroSection`, `LeaderboardSection`, `RewardTiersSection`, `CountdownSection`, `EntryFormSection` — the last absorbing today's `EntryForm` + reveal-state logic).
2. Switch `/c/[slug]/page.tsx` to `PageRenderer` fed by `parsePageConfig(campaign.pageConfig)`; delete `CampaignLanding.tsx`.
3. Add the new E2E test: a campaign with a legacy or null `pageConfig` still renders with a working entry form.
4. Add a test confirming no hydration-mismatch warnings appear for a campaign with a `COUNTDOWN` section and `endsAt` set.
5. Checkpoint: existing 8 flows + 3 new flows (11 total — the legacy/null coverage ended up as two separate test cases) pass; typecheck; build.

**Phase 3 — Dashboard editor**:
1. Build the editor page (section list with add/remove/reorder, per-type forms, live preview) and the "Edit page" link from the detail page.
2. Verify the live preview's entry form cannot create a real `Participant` row.
3. Add the new E2E test: edit a section and reorder sections, then confirm the public page reflects both changes.
4. Checkpoint: existing 8 + 4 new flows (12 total) pass; typecheck; build.

**Phase 4 — Full verification & rollout**:
1. Full re-run: `npm run typecheck`, `npm run build`, all 12 E2E flows.
2. Commit and push to `main`.
3. Confirm the Vercel deployment succeeds.
4. Manually verify `https://snowball-blue.vercel.app/c/launch-giveaway` renders correctly in production.

Rollback: revert the commit(s) for whichever phase is furthest along; earlier phases are additive/backward-compatible on their own (e.g. Phase 1's validation and legacy-fallback logic is safe to ship even if Phases 2-4 were reverted, since nothing reads `pageConfig` for rendering until Phase 2). No data migration to unwind at any point.

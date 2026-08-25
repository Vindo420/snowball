## Context

See proposal.md - Why. Relevant state of the codebase after `add-campaign-page-builder`:
- `Campaign.pageConfig Json?` holds `{ sections: Section[] }`, validated by `PageConfigSchema` (`src/lib/pageConfig.ts`), read via `parsePageConfig(raw)` which never throws and falls back to `DEFAULT_PAGE_CONFIG` for null/legacy/malformed input.
- `Campaign.headline`, `Campaign.description`, `Campaign.endsAt` are separate top-level columns, not part of `pageConfig`. They're edited today via `PageBuilderEditor.tsx`'s Hero and Countdown forms but persisted through the same `PATCH /api/campaigns/:id` call as `pageConfig` itself — there is currently no distinction between "saved" and "published"; every `PATCH` takes effect on the public page immediately.
- `PageRenderer.tsx` (`src/components/page-builder/PageRenderer.tsx`) is used both by `/c/[slug]/page.tsx` (public, non-preview) and by the editor's live preview (`preview={true}`, which only disables the entry form's submit control). It switches on each section's `type` and delegates to `HeroSection` / `LeaderboardSection` / `RewardTiersSection` / `CountdownSection` / `EntryFormSection`.
- `PATCH /api/campaigns/:id` (`src/app/api/campaigns/[id]/route.ts`) validates its body against `updateCampaignSchema`, a `.strict()` Zod object allow-listing `name`, `slug`, `type`, `displayMode`, `status`, `headline`, `description`, `prizeDescription`, `endsAt`, `pageConfig`. `e2e/helpers/campaign.ts`'s `activateCampaign` depends on `status` remaining accepted.
- `PageBuilderEditor.tsx` today: a two-column layout (section list + inline forms on the left, live preview on the right), all section forms rendered simultaneously (no selection model), a plain `<select>` + button to add a section, an explicit "Save" button.
- The existing 12 Playwright E2E flows include `e2e/page-builder-editor.spec.ts` (edit + reorder + save + public page reflects both) and must keep passing with no changes to the test file itself, since the request requires the existing suite to pass "unmodified."
- No `vercel.json` exists; Vercel's build command is Next.js's default (effectively `next build`, or a `vercel-build`/`build` script from `package.json` if present — currently just `"build": "next build"`). There's no migration step in the deploy pipeline today.
- `.env` points at a Supabase project literally named "snowball-dev," with an explicit comment warning not to mix it with the separate production "Snowball" project. Vercel's production environment variables (not in this repo) point at that separate production database — confirmed indirectly since the live production leaderboard already contains real participant data from prior manual testing.
- **This project has never used Prisma's migration workflow.** There is no `prisma/migrations` directory in the repo; every schema change to date was applied with `prisma db push` directly against each database. Neither `snowball-dev` nor the production `Snowball` database has any migration history recorded.

## Goals / Non-Goals

**Goals:**
- Restructure the editor into Perspective's three-zone interaction pattern (top bar / sidebar / canvas) using Snowball's own visual styling, with a categorized block library and canvas-level section selection/hover controls.
- Introduce a genuine draft/publish separation: all editor edits land in a new `pageConfigDraft` column; the public page never reads it, structurally (no code path in the public render touches the column at all).
- Add a desktop/mobile device preview toggle that only affects the canvas container's width.
- The existing 12 E2E flows keep passing unmodified; 4 new flows cover draft-not-live, publish-goes-live, discard-restores-published, and device-toggle-is-preview-only.
- The Prisma migration ships safely: both databases are baselined first (since neither has migration history today), applied to `snowball-dev` locally, applied to production automatically at deploy time, and confirmed present in production directly rather than inferred from a green build.
- A visible save-state indicator (saving / saved-as-draft / failed) with debounced (not per-keystroke) autosave, and no silent loss of edits on a failed autosave.

**Non-Goals:**
- New section types (still exactly `HERO`, `LEADERBOARD`, `REWARD_TIERS`, `COUNTDOWN`, `ENTRY_FORM`).
- Drag-and-drop reordering (still up/down controls only, per the original constraint — unchanged here).
- A duplicate-section control on the canvas (explicitly excluded by the request).
- Any change to `Campaign.status` (`DRAFT`/`ACTIVE`) or the campaign-running/not-running lifecycle — entirely orthogonal to page-content draft/publish (see Decisions below).
- Draft versioning/history (a single current draft per campaign, not a list of past drafts).
- Autosave conflict resolution for concurrent editors (out of scope — same single-owner assumption as the rest of the app).

## Decisions

**`pageConfigDraft`'s shape bundles headline, description, endsAt, and the section list together — not just sections.**
```ts
const PageDraftEnvelopeSchema = z.object({
  headline: z.string().nullable(),
  description: z.string().nullable(),
  endsAt: z.coerce.date().nullable(),
  pageConfig: PageConfigSchema, // { sections: Section[] }, entry-form-presence enforced as today
}).strict();
```
- Why: `headline`/`description`/`endsAt` are edited through the same section forms (Hero, Countdown) as `pageConfig`'s sections. If the draft only captured `pageConfig`, editing Hero's headline would still write directly to `Campaign.headline` and leak to the public page immediately — contradicting the required "editing... does NOT change the public page until Publish" behavior. Bundling them into one JSON envelope keeps a single "is there a draft" fact and a single publish/discard operation, rather than three parallel shadow columns (`headlineDraft`, `descriptionDraft`, `endsAtDraft`) each needing their own dirty-tracking.
- Alternative considered: separate `*Draft` shadow columns per field. Rejected — multiplies migration surface for no benefit, and "unpublished changes exist" would need to check four columns instead of one.
- Alternative considered: move headline/description permanently into each section's own schema (e.g., add `headline`/`subtext` fields to `HeroSectionSchema`), eliminating the `Campaign.headline`/`description` columns' role in page rendering entirely. Rejected for this change — bigger blast radius (touches campaign creation, `ShareButtons`' default message fallback, and the section schema itself) for no benefit over the envelope approach; revisit only if a future change needs per-section content versioning independent of the campaign record.

**The public page's read path is structurally isolated from the draft, not conditionally isolated.** `src/app/c/[slug]/page.tsx` and the public (non-`editable`) call to `PageRenderer` are not modified by this change at all — they continue reading `campaign.headline`, `campaign.description`, `campaign.endsAt`, and `parsePageConfig(campaign.pageConfig)` exactly as today. `pageConfigDraft` is never fetched, parsed, or referenced anywhere in that file.
- Why: a runtime check ("if published, show X, else show Y") is one more place a future edit could introduce a leak. Making the public path simply not know the draft column exists is a stronger guarantee, and it's free — the public page never needed the draft for anything.

**Publish and Discard are dedicated endpoints, not overloaded onto the existing `PATCH`.**
- `POST /api/campaigns/:id/publish`: loads the campaign, 404s for non-owners (same pattern as the existing detail/editor routes), 400s if `pageConfigDraft` is null ("No draft to publish"), otherwise copies the draft envelope's `headline`/`description`/`endsAt`/`pageConfig` into the campaign's published columns and sets `pageConfigDraft` to `null` in one `update` call.
- `POST /api/campaigns/:id/discard-draft`: same ownership check, sets `pageConfigDraft` to `null` unconditionally (200 even if it was already `null` — a defensively-clicked Discard shouldn't error).
- Why dedicated routes instead of `PATCH { publish: true }`: publish and discard have no request body to validate (nothing optional, nothing partial) and a fundamentally different meaning from a partial field update — modeling them as their own resource actions keeps `updateCampaignSchema` from growing a special-case flag, and keeps each route's logic (and its own small test surface) independent.

**`PATCH /api/campaigns/:id` gains one new optional, allow-listed field: `pageConfigDraft`, validated against `PageDraftEnvelopeSchema` (including the ENTRY_FORM-presence check, applied to `pageConfigDraft.pageConfig`).** The existing fields (`headline`, `description`, `endsAt`, `pageConfig`, `status`, etc.) remain accepted unchanged, for `e2e/helpers/campaign.ts`'s `activateCampaign` and any other non-editor caller. The new editor's autosave writes `pageConfigDraft` exclusively; it never sends `headline`/`description`/`endsAt`/`pageConfig` directly.

**Autosave, not an explicit Save button — confirmed.** With a draft layer already staging changes, an explicit Save button alongside Publish would be confusing (two "make this stick" actions with different meanings). Text-field edits (headline, subtext, image URL) and structural edits (add/remove/reorder a section, change the countdown end date) both feed into **one shared debounce timer** (~800ms after the last edit of any kind, not one timer per field) that then issues a single `PATCH` of the complete current draft to `pageConfigDraft` — this satisfies "debounced autosave rather than a request per keystroke" without one request per field either.
- **Save-state indicator**: one evolving indicator in the top bar (not a separate widget from the unpublished-changes indicator) cycles through *idle* (no draft) → *saving* (debounce elapsed, request in flight) → *unpublished changes* (last save succeeded, draft exists) → *failed to save* (the last autosave attempt errored).
- **Failure never silently loses edits**: on a failed autosave, the owner's in-progress content stays exactly as typed in local state — it is never reverted, cleared, or replaced with server data. Because every autosave payload is the *complete* current draft (not an incremental diff), the failed content is automatically retried the next time any edit re-triggers the debounce; the indicator's failed state also offers an explicit "Retry" action for when the owner doesn't make another edit right away.
- **No silent loss on navigation either**: a `beforeunload` warning fires if the owner tries to close the tab or navigate away while the indicator is in *saving* or *failed* state, since either means the latest edits are not yet confirmed persisted.
- Why one shared debounce rather than per-field timers: edits to multiple fields within the same short window (e.g., headline then subtext) should coalesce into one save, further reducing request volume beyond just "not per keystroke."

**After Publish or Discard, the editor re-syncs its state from a fresh server round-trip** (the same `router.refresh()`-plus-reload-of-initial-props pattern the current editor already uses after Save), rather than maintaining two parallel client-side copies (draft state and published state) that Discard would need to reconcile locally.
- Why: simpler client state (one "current effective content" object, always sourced from the server's most recent answer) at the cost of one extra round-trip per Publish/Discard — both already network actions, so the added latency is marginal.

**`PageRenderer` gains an opt-in `editable?: boolean` prop, off by default.** When true (canvas usage only), each rendered section is wrapped in a selection/hover frame (click-to-select, hover shows the move-up/move-down/delete control strip, selected state shows a highlight ring) that the sidebar's selection state drives and is driven by. When `editable` is omitted or false — the public page, and any future non-canvas preview — rendering is byte-for-byte what it is today.
- Alternative considered: a second component that duplicates `PageRenderer`'s section-type switch for the canvas, leaving `PageRenderer` untouched. Rejected — two switch statements over the same section types will drift, and the request explicitly wants the canvas to show "the existing non-interactive `PageRenderer` preview," not a reimplementation.
- The existing `preview?: boolean` prop (which disables the entry form's submit control) is orthogonal to `editable` and still required on the canvas — `editable` adds selection chrome; `preview` prevents real data creation. Both are true for canvas usage; only `preview` is true for the old inline live-preview pattern this change removes.

**Block library grouping**: two categories — "Content" (`HERO`) and "Referral mechanics" (`LEADERBOARD`, `REWARD_TIERS`, `COUNTDOWN`) — matching the grouping suggested in the request. Each of the four addable types gets one tile with an icon (a small inline SVG per type, consistent with Snowball's existing visual language — not Perspective's icon set) and label. `ENTRY_FORM` never appears in the library, since it's always present and can't be added a second time.

**Migration and production rollout — requires baselining first, since neither database has any migration history.**
- **The risk this avoids**: this project has always used `prisma db push` (see Context), so `prisma/migrations/` doesn't exist and neither `snowball-dev` nor production has a recorded migration history. Running `prisma migrate dev` directly against either database in this state makes Prisma see a live schema with tables/columns but no matching history — unresolvable drift — and Prisma's normal response to that is to **offer to reset the database**, which would destroy its data. Separately, a `vercel-build` script running `prisma migrate deploy` against an un-baselined production database would find zero migrations recorded as ever needing to apply, succeed silently, and never create the column — exactly the failure mode flagged in this update: a green build with no actual schema change, followed by runtime errors the first time any query touches `pageConfigDraft`.
- **Baselining (one-time, manual, done before this change's own migration is created)**:
  1. Generate a migration file describing the schema exactly as it exists today, without applying anything: create `prisma/migrations/0_init/`, then `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql`.
  2. Mark it as already applied — without running its SQL, since the schema it describes already exists in both databases — via `prisma migrate resolve --applied 0_init`, run once with `DATABASE_URL` pointed at `snowball-dev` and once more with it pointed at the production `Snowball` database. The production run uses the production connection string locally and temporarily for that single command; it is never scripted, never committed, and never part of any automation — a deliberate one-time step performed by hand before the first migration-bearing deploy.
  3. Verify both are clean before proceeding: `npx prisma migrate status` against `snowball-dev` reports `0_init` applied and nothing pending; the same command run with the production connection string reports the same.
- **Only after both databases are confirmed baselined**: add `pageConfigDraft Json?` to `Campaign` in `prisma/schema.prisma`, then `npx prisma migrate dev --name add_page_config_draft` against `snowball-dev` — now safe, since migration history matches the live schema exactly and there's no drift for Prisma to react to.
- **Production rollout**: a new `package.json` script, `"vercel-build": "prisma migrate deploy && next build"`. Vercel automatically prefers `vercel-build` over `build` when present. Because production is now baselined, `prisma migrate deploy` has a real history to compare against and will find `add_page_config_draft` genuinely pending, applying it (using Vercel's existing production `DATABASE_URL`/`DIRECT_URL` env vars) before the build proceeds.
- **Post-deploy verification is direct, not inferred**: a green Vercel build proves `next build` succeeded, not that the migration ran or the column exists. A dedicated task queries the production database directly after the deploy (e.g., `information_schema.columns` for `Campaign.pageConfigDraft`) to confirm the column is actually there.

**`Campaign.status` and page-edit publishing are documented as unrelated, explicitly**: `status` (`DRAFT`/`ACTIVE`) controls whether the campaign is running (accepting entries, publicly linked, counted in the dashboard) at all — a campaign can be `ACTIVE` with a pending, unpublished page-content draft, or `DRAFT` (not yet launched) with content already published to what `/c/[slug]` would show if visited directly. This change adds no coupling between the two; a campaign's `status` is never read or written by the publish/discard endpoints, and `pageConfigDraft` is never read or written by campaign-activation code.

## Risks / Trade-offs

- **[Risk]** Autosave could fire a burst of overlapping `PATCH` requests if the owner edits quickly across multiple fields → **Mitigation**: a single shared debounce timer (800ms) covers all edits — text and structural alike — rather than one timer per field, and the editor tracks in-flight save state so a new autosave request only starts after the previous one settles.
- **[Risk]** A failed autosave could silently lose the owner's edits if the failure isn't surfaced or the local state gets reverted → **Mitigation**: the save-state indicator explicitly shows a failed state, local edit state is never reverted or cleared on failure, the next edit or an explicit Retry resends the complete current draft, and a `beforeunload` warning fires while saving or failed.
- **[Risk]** Bundling `headline`/`description`/`endsAt` into `pageConfigDraft`'s envelope (rather than `pageConfig` alone) is a bigger shape than the request's literal wording ("pageConfigDraft JSON column") might suggest → **Mitigation**: documented explicitly as a recorded assumption in proposal.md, with the reasoning spelled out, so it's easy to correct via `/opsx:update` if a narrower interpretation was intended.
- **[Risk]** Extending `PageRenderer` with an `editable` prop, rather than a separate canvas-only component, risks the public rendering path being accidentally affected by canvas-only logic → **Mitigation**: `editable` defaults to `false`/undefined everywhere except the new canvas component; the Phase 3 checkpoint re-runs the full existing E2E suite (unmodified) specifically to catch any such regression before Phase 4.
- **[Risk]** The new `vercel-build` script is the first migration-on-deploy step this project has had — a failed migration would fail the entire deploy → **Mitigation**: the migration is purely additive (nullable column, no data transformation, no backfill), which is the lowest-risk category of schema change; Phase 4 explicitly verifies the Vercel deployment succeeds before considering the change complete, and a failed deploy is treated as a blocker to fix, not defer (per the request).
- **[Risk]** Publish/Discard re-syncing editor state via a full server round-trip (rather than local reconciliation) could feel slower than an optimistic local update → **Mitigation**: acceptable trade-off given both are already deliberate, infrequent actions (not per-keystroke); simplicity of a single source of truth for "current effective content" outweighs the marginal latency.
- **[Risk]** A campaign created before this migration has `pageConfigDraft = null` by default, and the editor must not mistake "no draft" for "empty draft" → **Mitigation**: `parseDraftEnvelope(null)` returns `null` (not a default envelope), distinctly from `parsePageConfig`'s null-handling (which does return a default) — the editor's initial-load logic is `draft ?? publishedFallback`, never `draft ?? DEFAULT_DRAFT`.
- **[Risk]** This project has no existing Prisma migration history in either database — running `prisma migrate dev` (or letting `prisma migrate deploy` run against an un-baselined production database) without baselining first risks unresolvable drift, and Prisma's default response to drift is to offer resetting the database, which would destroy data → **Mitigation**: an explicit, manual, one-time baselining step (`prisma migrate diff --from-empty ... --script` + `prisma migrate resolve --applied 0_init`) run against **both** `snowball-dev` and production before this change's own migration is created, verified via `prisma migrate status` reporting no drift on both before proceeding.
- **[Risk]** A green Vercel build does not prove a production migration actually ran — the original (pre-correction) design would have had `prisma migrate deploy` silently no-op against an un-baselined production database and never create the column, while the build still succeeded → **Mitigation**: baselining (above) gives `prisma migrate deploy` real history to compare against; a dedicated post-deploy task queries the production database directly to confirm the `pageConfigDraft` column exists, rather than inferring success from build status alone.

## Migration Plan

**Phase 1 — Baselining, data model & API (no UI changes yet)**:
1. Baseline `snowball-dev`: generate `prisma/migrations/0_init/migration.sql` via `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`, then `prisma migrate resolve --applied 0_init` against `snowball-dev`; verify `prisma migrate status` reports no pending migrations.
2. Baseline production: run `prisma migrate resolve --applied 0_init` against the production `Snowball` database — manual, one-time, using production's connection string directly and locally, never scripted or committed; verify `prisma migrate status` against production reports no pending migrations.
3. Add `pageConfigDraft Json?` to `Campaign` in `prisma/schema.prisma`; run `prisma migrate dev --name add_page_config_draft` against `snowball-dev` — safe now that both databases are baselined.
4. Add `PageDraftEnvelopeSchema` and `parseDraftEnvelope` to `src/lib/pageConfig.ts`.
5. Extend `PATCH /api/campaigns/:id`'s schema with optional `pageConfigDraft` (validated, entry-form-presence enforced within it).
6. Add `POST /api/campaigns/:id/publish` and `POST /api/campaigns/:id/discard-draft`.
7. Add the `vercel-build` script to `package.json`.
8. Checkpoint: `npm run typecheck`, `npm run build`, and the full existing 12-flow E2E suite all pass — nothing user-visible has changed yet.

**Phase 2 — Editor shell restructure**:
1. Rebuild `PageBuilderEditor.tsx`'s layout into the three zones: top bar, sidebar, canvas.
2. Wire autosave to `pageConfigDraft` via `PATCH`, using one shared debounce timer across all edit types (text and structural), with a save-state indicator (idle/saving/unpublished changes/failed) and explicit failure handling (edits retained, retryable, `beforeunload` warning while saving or failed).
3. Wire the top bar's Publish button and Discard control to the new endpoints, with the unpublished-changes indicator reflecting draft presence.
4. Add the desktop/mobile device toggle (canvas container width only).
5. Editor's server component (`edit/page.tsx`) initializes from the draft if one exists, else the published state, per the decisions above.
6. Checkpoint: existing 12 flows still pass; typecheck; build.

**Phase 3 — Block library & canvas interactivity**:
1. Build the categorized block library panel (Content / Referral mechanics), replacing the type-picker dropdown.
2. Extend `PageRenderer` with the opt-in `editable` prop (selection/hover chrome, floating move-up/move-down/delete strip, no duplicate).
3. Wire bidirectional selection highlighting between the sidebar and canvas.
4. Checkpoint: existing 12 flows still pass; typecheck; build.

**Phase 4 — Full verification & rollout**:
1. Add the 4 new E2E flows: draft doesn't affect public page; Publish makes it live; Discard restores the published state; device toggle changes preview width without altering saved data.
2. Full re-run: `npm run typecheck`, `npm run build`, all 16 E2E flows (12 existing + 4 new).
3. Commit and push to `main`.
4. Confirm the Vercel deployment succeeds, including the `vercel-build` migration step applying to production; then directly query the production database to confirm the `pageConfigDraft` column actually exists — do not infer this from the build succeeding alone.
5. Manually verify `https://snowball-blue.vercel.app/c/launch-giveaway` renders correctly in production.

Rollback: revert the commit(s) for whichever phase is furthest along. Phase 1 alone is safe to ship independently (additive column, new unused endpoints, no UI wired to them yet) if later phases needed to be reverted. No data migration to unwind at any point — `pageConfigDraft` is nullable and additive. The baselining step (`0_init`) is itself a one-way, non-destructive bookkeeping change (it records history, it doesn't alter schema) and is never rolled back even if later phases are.

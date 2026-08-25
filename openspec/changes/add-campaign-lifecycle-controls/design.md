## Context

Relevant state of the codebase:
- `Campaign.status` (`CampaignStatus` enum: `DRAFT`, `ACTIVE`, `PAUSED`, `ENDED`) already exists in `prisma/schema.prisma`, defaulting to `DRAFT`. Nothing in the UI ever changes it after creation.
- `src/app/c/[slug]/page.tsx` currently 404s only when `campaign.status === 'DRAFT'` (`notFound()` from `next/navigation`) — `PAUSED` and `ENDED` campaigns render normally today, which this change corrects.
- `PATCH /api/campaigns/:id` (`src/app/api/campaigns/[id]/route.ts`) already accepts `status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED']).optional()` in its allow-listed, ownership-checked schema — `e2e/helpers/campaign.ts`'s `activateCampaign` already PATCHes `{ status: 'ACTIVE' }` through it. No endpoint changes needed.
- The campaign detail page (`src/app/dashboard/campaigns/[id]/page.tsx`) shows `{campaign.status}` as plain text and always renders `{appUrl}/c/{campaign.slug}` as a clickable `<a>`, regardless of status.
- The editor's top bar (`src/app/dashboard/campaigns/[id]/edit/EditorTopBar.tsx`, from `redesign-page-editor`) already has a `Publish` button for page-content draft→published promotion, plus a device toggle, save-state indicator, and Discard control. That `Publish` action is unrelated to `Campaign.status` and must stay that way — this change's own point of confusion to avoid.
- The existing 16 Playwright E2E flows include `e2e/helpers/campaign.ts`'s `createCampaign` (leaves status at its `DRAFT` default) and `activateCampaign` (PATCHes to `ACTIVE`) — every existing flow that needs a live public page already calls `activateCampaign` directly via the API, not through any UI control, since none exists yet.

## Goals / Non-Goals

**Goals:**
- A campaign can go from created to publicly reachable entirely through the dashboard UI, with no direct API or database step.
- The lifecycle action (`Campaign.status`) and the page-content action (`pageConfigDraft` → `pageConfig`) are visibly distinct, differently labeled controls that cannot be confused for one another.
- A `DRAFT` campaign's dead public link is never presented as a normal working link anywhere in the dashboard.
- The public page's reachability rule is complete and consistent: `ACTIVE` renders, everything else 404s.

**Non-Goals:**
- No new API endpoint — lifecycle changes reuse the existing `PATCH /api/campaigns/:id`.
- No path back from `ENDED` (see proposal.md's recorded assumption).
- No content-readiness validation gating activation (e.g., requiring at least one section) — out of scope for closing this specific gap.
- No change to `CampaignStatus`'s values or `Campaign.pageConfigDraft`/`pageConfig` semantics from `redesign-page-editor` — this change only adds the missing UI for a field that already exists and is already enforced server-side.

## Decisions

**One shared `CampaignStatusControl` component, not two separate implementations.** Both the editor's top bar and the detail page render the same client component (`campaignId`, `status`, and a callback/refresh), computing the valid next actions from the current status and PATCHing `/api/campaigns/:id`. Keeping this logic in one place means the DRAFT→ACTIVE, ACTIVE→PAUSED, ACTIVE→ENDED, and PAUSED→{ACTIVE,ENDED} transition rules are defined exactly once.
- Why not fold it into the existing `EditorTopBar`/detail-page markup directly: the transition logic (which buttons are valid for which status) is identical in both places; duplicating it risks the two surfaces drifting out of sync on what's a valid transition.

**Wording and placement, per the request's own example**: the editor's existing "Publish" button is relabeled **"Publish changes"**; the lifecycle control's primary action is labeled **"Activate campaign"** (also "Pause campaign," "End campaign" depending on state). The lifecycle control sits in the top bar visually separated from the Publish-changes/Discard/device-toggle cluster — for example, near the campaign name on the left, while Publish changes/Discard stay grouped on the right where they already are. This is a spatial and lexical separation, not just a color difference, so the distinction survives even a quick glance.

**The DRAFT notice is a full-width banner below the top bar, shown only for `DRAFT`.** It states plainly that visitors currently see a not-found page and includes an inline "Activate campaign" button (calling the same status-change logic as the top bar's control — one action, reachable two ways). Not shown for `PAUSED`/`ENDED`: those are states the owner deliberately chose (paused their own campaign, or it ended), not the "I built a page and it's invisible by default" surprise this notice specifically targets.

**The public URL's "is this a working link" treatment applies to `DRAFT`, `PAUSED`, and `ENDED` alike**, both on the detail page and anywhere else the URL might be shown, once this change ships (see proposal.md's recorded assumption for why this is broader than the request's literal DRAFT-only wording). Presentation: for a non-`ACTIVE` campaign, the URL renders as plain (non-link) text with a small "(not live)" annotation, rather than being hidden outright — an owner should still be able to see what their eventual URL will be.

**`/c/[slug]/page.tsx`'s condition changes from `campaign.status === 'DRAFT'` to `campaign.status !== 'ACTIVE'`.** This is the minimal, complete fix for "pausing or ending it returns it to a non-public state" — a single condition, not a switch over four cases, since only one status (`ACTIVE`) is ever publicly reachable.
- Alternative considered: an explicit `switch` listing each non-`ACTIVE` case. Rejected — `status !== 'ACTIVE'` is shorter, and more importantly, is automatically correct if a fifth status value were ever added (it would 404 by default, the safe direction), whereas an explicit switch would default to rendering it (the unsafe direction) unless someone remembered to add a case.

**No new formal requirement added to `campaign-access-control`.** That capability's existing "Campaign read, update, and delete require ownership" requirement already covers `PATCH /api/campaigns/:id` generically, including a `status` change — it's still just an update to a campaign the caller must own. This change adds a dedicated E2E test exercising that existing guarantee specifically for status, but doesn't need a new spec requirement for behavior that's already specified.

## Risks / Trade-offs

- **[Risk]** Extending the public page's 404 condition to `PAUSED`/`ENDED` changes existing behavior for any real campaign currently sitting in one of those statuses (previously reachable, now 404s) → **Mitigation**: this is explicitly the requested fix ("pausing or ending it returns it to a non-public state" is a stated verification criterion), and matches the obvious intent of having a `PAUSED`/`ENDED` status at all; per the request's own framing, a status field that doesn't gate reachability isn't functioning correctly.
- **[Risk]** A shared `CampaignStatusControl` used in two different layout contexts (editor top bar vs. detail page) could end up needing incompatible styling → **Mitigation**: keep the component's own markup minimal/unstyled-container (labels and buttons only) and let each parent control layout/spacing around it, rather than the component asserting its own margins or positioning.
- **[Risk]** Relabeling "Publish" to "Publish changes" could be missed as "just a typo fix" and cause the two controls to still look similar at a glance → **Mitigation**: pairs the label change with spatial separation (Decisions, above) and an E2E test asserting both labels are present and distinct, not just a visual/manual check.
- **[Risk]** Someone lands on a `DRAFT` campaign's public URL and reasonably assumes "not found" means something is broken, not "not published yet" → **Mitigation**: out of scope for this change (no request to customize the 404 page's copy per-status); the fix here is preventing the owner from ever being confused about it or leaving a dead link visible, not customizing the visitor-facing 404 experience.

## Verification Plan

No phasing needed — this is UI plus a one-line condition change on an already-enforced field, proportionate to a single pass:

1. Build `CampaignStatusControl`; wire it into the editor's top bar (relabeling "Publish" → "Publish changes") and the campaign detail page; add the DRAFT-only notice banner in the editor; update the detail page's public-URL rendering to not present a working link for non-`ACTIVE` campaigns.
2. Change `/c/[slug]/page.tsx`'s condition to `status !== 'ACTIVE'`.
3. Add new E2E coverage: a `DRAFT` campaign's public page 404s; activating through the UI makes it render; pausing returns it to 404; ending returns it to 404; a non-owner cannot change another user's campaign status.
4. Checkpoint: `npm run typecheck`, `npm run build`, and the full E2E suite (existing 16 + new) all pass.
5. Commit, push, confirm the Vercel deployment succeeds, and manually create → activate → view a campaign entirely through the production UI to confirm the end-to-end path actually works in production, not just locally.

Rollback: revert the commit. Nothing stateful to unwind — no migration, no data written outside the existing `status` column via the existing endpoint.

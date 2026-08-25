## Why

`Campaign.status` (`DRAFT` / `ACTIVE` / `PAUSED` / `ENDED`) already exists and the public `/c/[slug]` page already returns 404 for `DRAFT` campaigns — but there is no UI anywhere to change a campaign's status. Every campaign a user creates stays `DRAFT` forever, so its public page is permanently unreachable. The product does not work end to end: a user can build a whole page in the editor and never be able to actually launch it. This change closes that gap by adding lifecycle controls to the dashboard and editor, going through the existing ownership-checked `PATCH /api/campaigns/:id`.

## What Changes

- **A campaign status control** on the campaign detail page (`/dashboard/campaigns/[id]`) and in the page editor's top bar, letting the owner activate, pause, or end a campaign. Available actions depend on the current status: `DRAFT` or `PAUSED` → **Activate campaign**; `ACTIVE` → **Pause campaign** or **End campaign**; `PAUSED` → **Activate campaign** or **End campaign**; `ENDED` is terminal (no further transitions).
- **Unambiguous wording, kept visibly distinct from page-content publishing**: the editor's existing page-content button is relabeled **"Publish changes"** (from "Publish"), and the lifecycle action is labeled **"Activate campaign"** — different words, different control, positioned separately in the top bar, so a user can't mistake one for the other.
- **A prominent in-editor notice when the campaign is `DRAFT`**: a banner explaining that visitors currently see a 404 page, with an inline "Activate campaign" action.
- **The dashboard never presents a non-live campaign's public URL as a working link.** Today the detail page always renders `{appUrl}/c/{slug}` as a clickable `<a>` tag regardless of status. Since `PAUSED` and `ENDED` campaigns will now also 404 (see below), this treatment extends to all three non-`ACTIVE` statuses, not just `DRAFT` — anything else would leave two of the three broken states still showing as a normal working link.
- **The public page's 404 behavor is extended and formalized**: today `/c/[slug]/page.tsx` only checks `campaign.status === 'DRAFT'` — `PAUSED` and `ENDED` campaigns currently render normally, which is inconsistent with "pausing or ending it returns it to a non-public state" (the request's own verification criterion). The check becomes "404 unless `ACTIVE`."
- Status changes go through the existing `PATCH /api/campaigns/:id` endpoint and its allow-listed schema (already accepts `status`, already ownership-checked) — no new endpoint.

**Assumptions recorded here for review** (implementation details the request didn't spell out; correct any of these via `/opsx:update` before implementation starts):
- **`ENDED` is terminal.** No control offers a path back from `ENDED` to any other status. The request only asks for "activate, pause, and end," never mentions un-ending a campaign, and a giveaway that has concluded reasonably shouldn't be reopened by accident.
- **The DRAFT/PAUSED/ENDED public-URL treatment.** The request's wording literally scopes "don't present the link as working" to `DRAFT` only. Extended to all three non-`ACTIVE` statuses for consistency, since after this change `PAUSED` and `ENDED` campaigns 404 too — leaving their links looking "normal" would reintroduce the same broken-link problem this change exists to fix.
- **Layout placement**: the editor's status control sits in the top bar, visually separated from the Publish-changes/Discard/device-toggle cluster (for example, near the campaign name), with the DRAFT banner as a full-width strip below the top bar, shown only for `DRAFT` (not `PAUSED`/`ENDED` — the request specifically asks for this prominent notice on `DRAFT`, where the gap is most severe: a brand-new campaign that was never reachable at all).
- **No content-readiness gate on activation.** Activating a campaign with no sections configured, or defaults, is still allowed — this change adds the missing control, not new validation rules around it.

## Capabilities

### New Capabilities
- `campaign-lifecycle`: owner-facing control over whether a campaign is running (`DRAFT`/`ACTIVE`/`PAUSED`/`ENDED`), distinct from page-content draft/publish — status controls in the editor and detail page, the DRAFT notice, and not presenting a dead link as live.

### Modified Capabilities
- `public-campaign-rendering`: the public page's reachability guarantee is extended from "404 for DRAFT" to "404 unless ACTIVE."

## Impact

- **Code**: a new `CampaignStatusControl` component (shared between the editor's top bar and the detail page) that PATCHes `/api/campaigns/:id` with `{ status }`; the editor's top bar gains this control plus a DRAFT-only notice banner, and its existing "Publish" button is relabeled "Publish changes"; the campaign detail page (`/dashboard/campaigns/[id]/page.tsx`) gains the same status control and stops rendering the public URL as a live link for non-`ACTIVE` campaigns; `/c/[slug]/page.tsx`'s 404 condition changes from `status === 'DRAFT'` to `status !== 'ACTIVE'`.
- **Data**: none — `Campaign.status` and its four values already exist; no migration.
- **Compatibility**: the existing 16 Playwright E2E flows must keep passing unmodified. New coverage: a DRAFT campaign's public page 404s; activating through the UI makes it render; pausing or ending returns it to a 404 state; a non-owner cannot change another user's campaign status.
- **Verification**: `npm run typecheck`, `npm run build`, and the full E2E suite (existing + new) must pass; after pushing, the Vercel deployment must succeed and a newly created campaign must be end-to-end reachable — created, activated, and publicly rendering — entirely through the UI, with no direct database step.
- **Phasing**: small enough to not need explicit phases — this is UI plus a one-line condition change on an existing, already-enforced field. A single pass with its own checkpoint is proportionate.

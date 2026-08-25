## Tasks

- [ ] 1.1 Create `CampaignStatusControl` (client component): given a campaign's id and current status, renders the valid next actions ("Activate campaign" for `DRAFT`/`PAUSED`, "Pause campaign" and "End campaign" for `ACTIVE`, "End campaign" for `PAUSED`, nothing for `ENDED`), `PATCH`es `/api/campaigns/:id` with `{ status }` on click, and refreshes/calls back on success; surfaces the server's error on failure
- [ ] 1.2 Wire `CampaignStatusControl` into the editor's top bar (`EditorTopBar.tsx`), positioned visually separate from the Publish-changes/Discard/device-toggle cluster (e.g., near the campaign name); relabel the existing page-content "Publish" button to "Publish changes"
- [ ] 1.3 Add a full-width notice banner in the editor, shown only when the campaign's status is `DRAFT`, stating that visitors currently see a not-found page, with an inline "Activate campaign" action wired to the same status-change logic
- [ ] 1.4 Wire `CampaignStatusControl` into the campaign detail page (`src/app/dashboard/campaigns/[id]/page.tsx`), replacing the current plain-text `{campaign.status}` display
- [ ] 1.5 Update the detail page's public-URL rendering: render it as a normal clickable link only when `status === 'ACTIVE'`; for `DRAFT`/`PAUSED`/`ENDED`, render the URL as plain (non-link) text with a "(not live)" annotation instead
- [ ] 1.6 Change `src/app/c/[slug]/page.tsx`'s not-found condition from `campaign.status === 'DRAFT'` to `campaign.status !== 'ACTIVE'`; verify with a direct script/request that `PAUSED` and `ENDED` campaigns now 404 and `ACTIVE` still renders
- [ ] 1.7 Add a new E2E test: a `DRAFT` campaign's public page returns not-found
- [ ] 1.8 Add a new E2E test: activating a campaign through the dashboard UI (not a direct API call) makes its public page render
- [ ] 1.9 Add a new E2E test: pausing an active campaign through the UI returns its public page to not-found
- [ ] 1.10 Add a new E2E test: ending a campaign through the UI returns its public page to not-found
- [ ] 1.11 Add a new E2E test: a non-owner cannot change another user's campaign status via `PATCH /api/campaigns/:id` (expect the existing ownership-check behavior — not-found, no change)
- [ ] 1.12 Checkpoint: run `npm run typecheck`, `npm run build`, and `npm run test:e2e` and confirm the existing 16 flows plus the 5 new flows (21 total) all pass
- [ ] 1.13 Commit all changes from this feature and push to `main`
- [ ] 1.14 Confirm the Vercel deployment for this push succeeds; if it fails, fix the underlying cause and re-push
- [ ] 1.15 Manually confirm, entirely through the production UI (no direct database or API step): create a new campaign, activate it, and confirm its public page renders at `https://snowball-blue.vercel.app/c/<slug>`

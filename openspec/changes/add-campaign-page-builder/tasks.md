## Phase 1 — Schema & data layer (no UI changes yet)

- [ ] 1.1 Define the `pageConfig` Zod schema in `src/lib/pageConfig.ts`: a discriminated union on `type` for `HERO` (with optional `imageUrl` validated as a URL), `LEADERBOARD`, `REWARD_TIERS`, `COUNTDOWN`, and `ENTRY_FORM` (each carrying a stable `id`), wrapped in `PageConfigSchema = z.object({ sections: z.array(SectionSchema) })`; verify with a quick script that a valid config of each type parses and an invalid one (bad `type`, missing `id`, non-URL `imageUrl`) fails
- [ ] 1.2 Define `DEFAULT_PAGE_CONFIG` (`HERO`, `ENTRY_FORM`, `LEADERBOARD`, `REWARD_TIERS`, in that order) and a `parsePageConfig(raw: unknown): PageConfig` normalizer that returns the default for `null`, the legacy `{ theme, sections: string[] }` shape, or anything else that fails `PageConfigSchema`, and appends an `ENTRY_FORM` section to an otherwise-valid config that's missing one; verify each case (null, legacy, malformed, valid-and-complete, valid-but-missing-entry-form) with a script
- [ ] 1.3 Update `prisma/seed.ts` to write the new `pageConfig` shape via `DEFAULT_PAGE_CONFIG` (or an equivalent explicit new-shape literal); verify by running `npm run db:seed` and confirming the seeded campaign's `pageConfig` parses successfully through `parsePageConfig` with no fallback triggered
- [ ] 1.4 Harden `PATCH /api/campaigns/:id`: replace the unvalidated `data: body` with an explicit Zod schema allow-listing `name`, `slug`, `headline`, `description`, `prizeDescription`, `type`, `displayMode`, `status`, `endsAt`, `pageConfig` (all optional, unknown keys rejected), validating `pageConfig` against `PageConfigSchema` and rejecting one missing an `ENTRY_FORM` section with a 400; verify: a valid partial update succeeds, an invalid `pageConfig` is rejected (400), a `pageConfig` missing `ENTRY_FORM` is rejected (400), a request with an unlisted field is rejected (400), and `e2e/helpers/campaign.ts`'s existing `activateCampaign` (`{ status: 'ACTIVE' }`) still succeeds
- [ ] 1.5 Add `points` and `referralCount` to `POST /api/referrals`'s response (`{ participant: { id, refCode, points, referralCount } }`); verify via a direct request that both fields are present and `0` for a newly-created participant
- [ ] 1.6 Checkpoint: run `npm run typecheck`, `npm run build`, and `npm run test:e2e` and confirm the existing 8 flows all still pass — nothing user-visible has changed yet, so this confirms the foundation didn't regress anything

## Phase 2 — Public rendering

- [ ] 2.1 Create `src/components/page-builder/PageRenderer.tsx`: takes the campaign (with reward tiers and participants already loaded), owns the "has this visitor entered" client state, and renders the parsed `pageConfig`'s sections in order by delegating to per-type components, passing a `preview?: boolean` prop down to each; verify it type-checks
- [ ] 2.2 Create `HeroSection` (renders `campaign.headline`, `campaign.description`, `campaign.prizeDescription` as today, plus the section's `imageUrl` if set)
- [ ] 2.3 Create `LeaderboardSection` (wraps the existing `Leaderboard` component, unchanged)
- [ ] 2.4 Create `RewardTiersSection` (always shows the tier list; once the visitor has entered, also shows their own progress using the `points`/`referralCount` returned at entry)
- [ ] 2.5 Create `CountdownSection` (renders a countdown to `campaign.endsAt` when set; renders nothing and does not error when `endsAt` is null)
- [ ] 2.6 Create `EntryFormSection`, moving today's `EntryForm` + post-entry reveal (personal share link in a `<code>` block containing `?ref=`, `ShareButtons`, the `"You're in!"` message) out of `CampaignLanding` with identical markup/selectors (`input[name="email"]`, `getByRole('button', { name: 'Enter now' })`); when `preview` is true, disable the submit control so no request is ever made
- [ ] 2.7 In `PageRenderer`, always render `EntryFormSection` even if the parsed `pageConfig` somehow lacks one (matching `parsePageConfig`'s own guarantee — belt-and-suspenders); verify with a script-constructed config missing `ENTRY_FORM` that the rendered output still includes it
- [ ] 2.8 Update `src/app/c/[slug]/page.tsx` to call `parsePageConfig(campaign.pageConfig)` and render `<PageRenderer>` in place of `<CampaignLanding>`; delete `src/components/CampaignLanding.tsx`
- [ ] 2.9 Add a new E2E test: a campaign with a legacy `pageConfig` (the old `{ theme, sections: string[] }` shape) still renders the public page with a working entry form (fill and submit succeeds, `"You're in!"` appears); include a null-`pageConfig` case in the same or a companion test
- [ ] 2.10 Add a test that loads the public page for a campaign with a `COUNTDOWN` section and `endsAt` set, and confirms no React hydration-mismatch warnings appear in the browser console
- [ ] 2.11 Checkpoint: run `npm run typecheck`, `npm run build`, and `npm run test:e2e` and confirm the existing 8 flows plus the 2 new flows (10 total) all pass

## Phase 3 — Dashboard editor

- [ ] 3.1 Create `src/app/dashboard/campaigns/[id]/edit/page.tsx`: a server component that loads the campaign, denies non-owners the same way the existing detail page does (404-equivalent "Campaign not found" for a non-owner or missing campaign), parses its `pageConfig`, and renders a client editor with the parsed config and campaign fields as initial state
- [ ] 3.2 Build the section-list editor (client component): add a section (type picker for `HERO`/`LEADERBOARD`/`REWARD_TIERS`/`COUNTDOWN`), remove a section (no remove control on `ENTRY_FORM`), reorder via up/down buttons (disabled at the first/last position)
- [ ] 3.3 Build the `HERO` section's edit form (headline, subtext/description, image URL), writing headline/description as campaign-level fields and `imageUrl` into the section's own config
- [ ] 3.4 Add presence-only controls for `LEADERBOARD`/`REWARD_TIERS` sections (no content fields in v1) and a `COUNTDOWN` control that additionally includes a field to set/clear the campaign's `endsAt`
- [ ] 3.5 Build the live preview pane: renders `PageRenderer` with `preview={true}` fed by the editor's current in-memory draft (not yet saved), using the campaign's real reward tiers/leaderboard data
- [ ] 3.6 Verify that interacting with the live preview's entry form (filling it in and clicking submit) creates no `Participant` row and leaves the campaign's real leaderboard/participant data unchanged
- [ ] 3.7 Wire the Save action: `PATCH`es `/api/campaigns/:id` with the draft's `pageConfig` plus any changed campaign fields (`headline`, `description`, `endsAt`); surfaces the server's validation error on rejection rather than failing silently
- [ ] 3.8 Add an "Edit page" link from the existing campaign detail page (`src/app/dashboard/campaigns/[id]/page.tsx`) to the new editor route
- [ ] 3.9 Add a new E2E test: log in as the owner, edit a section's content and reorder two sections, save, then load the public page and confirm both changes are reflected
- [ ] 3.10 Checkpoint: run `npm run typecheck`, `npm run build`, and `npm run test:e2e` and confirm the existing 8 flows plus the 3 new flows (11 total) all pass

## Phase 4 — Full verification & rollout

- [ ] 4.1 Run `npm run typecheck`, `npm run build`, and the full 11-flow `npm run test:e2e` suite one more time end to end and confirm everything passes
- [ ] 4.2 Commit all changes from this feature and push to `main`
- [ ] 4.3 Confirm the Vercel deployment for this push succeeds; if it fails, fix the underlying cause and re-push — a failed deploy is part of this change, not something to defer
- [ ] 4.4 Manually confirm `https://snowball-blue.vercel.app/c/launch-giveaway` renders correctly in production (loads without error, shows the seeded campaign's content) — local success has not reliably predicted production success on this project

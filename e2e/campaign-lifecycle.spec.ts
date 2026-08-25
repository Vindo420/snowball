import { test, expect } from './helpers/fixtures';
import { signUp } from './helpers/auth';
import { createCampaign, activateCampaign } from './helpers/campaign';
import { uniqueTestUser, uniqueCampaignSlug } from './helpers/test-data';
import { db } from './helpers/db';

test('a draft campaign public page returns not-found', async ({ browser, registerCleanup }) => {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(page, owner);
  await createCampaign(page, { slug }); // leaves the campaign at its DRAFT default
  await context.close();

  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  const res = await visitorPage.goto(`/c/${slug}`);
  expect(res?.status()).toBe(404);
  await visitorContext.close();
});

test('activating a campaign through the dashboard UI makes its public page render', async ({
  browser,
  registerCleanup,
}) => {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(page, owner);
  const campaign = await createCampaign(page, { slug });

  await page.goto(`/dashboard/campaigns/${campaign.id}`);
  await page.getByRole('button', { name: 'Activate campaign' }).click();
  await expect(page.getByText('Status: Active')).toBeVisible();

  await context.close();

  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  const res = await visitorPage.goto(`/c/${slug}`);
  expect(res?.ok()).toBe(true);
  await visitorContext.close();
});

test('pausing an active campaign through the UI returns its public page to not-found', async ({
  browser,
  registerCleanup,
}) => {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(page, owner);
  const campaign = await createCampaign(page, { slug });
  await activateCampaign(page, campaign.id);

  await page.goto(`/dashboard/campaigns/${campaign.id}`);
  await page.getByRole('button', { name: 'Pause campaign' }).click();
  await expect(page.getByText('Status: Paused')).toBeVisible();

  await context.close();

  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  const res = await visitorPage.goto(`/c/${slug}`);
  expect(res?.status()).toBe(404);
  await visitorContext.close();
});

test('ending a campaign through the UI shows the final read-only state on the public page', async ({
  browser,
  registerCleanup,
}) => {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(page, owner);
  const campaign = await createCampaign(page, { slug });
  await activateCampaign(page, campaign.id);

  await page.goto(`/dashboard/campaigns/${campaign.id}`);
  await page.getByRole('button', { name: 'End campaign' }).click();
  await expect(page.getByText('Status: Ended')).toBeVisible();

  await context.close();

  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  const res = await visitorPage.goto(`/c/${slug}`);
  expect(res?.ok()).toBe(true);
  await expect(visitorPage.getByText('This giveaway has finished.')).toBeVisible();
  await expect(visitorPage.getByText('Leaderboard')).toBeVisible();
  await expect(visitorPage.locator('input[name="email"]')).toHaveCount(0);
  await visitorContext.close();
});

test('submitting an entry to an ended campaign is rejected server-side and creates no participant', async ({
  browser,
  registerCleanup,
}) => {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(page, owner);
  const campaign = await createCampaign(page, { slug });
  await activateCampaign(page, campaign.id);

  const endRes = await page.request.patch(`/api/campaigns/${campaign.id}`, { data: { status: 'ENDED' } });
  expect(endRes.ok()).toBe(true);

  const beforeCount = await db.participant.count({ where: { campaignId: campaign.id } });

  const entryRes = await page.request.post('/api/referrals', {
    data: { campaignSlug: slug, email: 'ended-entry@e2e.test' },
  });
  expect(entryRes.status()).toBe(403);

  const afterCount = await db.participant.count({ where: { campaignId: campaign.id } });
  expect(afterCount).toBe(beforeCount);

  await context.close();
});

test("a non-owner cannot change another user's campaign status", async ({ browser, registerCleanup }) => {
  const owner = uniqueTestUser();
  const other = uniqueTestUser();
  registerCleanup(owner.email);
  registerCleanup(other.email);
  const slug = uniqueCampaignSlug();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUp(ownerPage, owner);
  const campaign = await createCampaign(ownerPage, { slug });
  await ownerContext.close();

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await signUp(otherPage, other);
  const res = await otherPage.request.patch(`/api/campaigns/${campaign.id}`, { data: { status: 'ACTIVE' } });
  expect(res.status()).toBe(404);

  const stored = await db.campaign.findUnique({ where: { id: campaign.id } });
  expect(stored?.status).toBe('DRAFT');

  await otherContext.close();
});

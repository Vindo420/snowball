import { test, expect } from './helpers/fixtures';
import { signUp } from './helpers/auth';
import { createCampaign, activateCampaign } from './helpers/campaign';
import { uniqueTestUser, uniqueCampaignSlug } from './helpers/test-data';

test('owner can edit a section, reorder sections, save, and see both changes on the public page', async ({
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

  await page.goto(`/dashboard/campaigns/${campaign.id}/edit`);

  const newHeadline = 'Edited via the page builder';
  await page.locator('input[name="headline"]').fill(newHeadline);

  // Default order is Hero, Entry form, Leaderboard, Reward tiers — move
  // Reward tiers up once so it now precedes Leaderboard.
  await page.getByRole('button', { name: 'Move Reward tiers up' }).click();

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();

  await context.close();

  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  await visitorPage.goto(`/c/${slug}`);

  await expect(visitorPage.getByRole('heading', { name: newHeadline })).toBeVisible();

  const headings = await visitorPage.locator('h1, h2').allTextContents();
  const rewardTiersIndex = headings.findIndex((h) => h === 'Reward tiers');
  const leaderboardIndex = headings.findIndex((h) => h === 'Leaderboard');
  expect(rewardTiersIndex).toBeGreaterThanOrEqual(0);
  expect(leaderboardIndex).toBeGreaterThanOrEqual(0);
  expect(rewardTiersIndex).toBeLessThan(leaderboardIndex);

  await visitorContext.close();
});

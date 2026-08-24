import { test, expect } from './helpers/fixtures';
import { signUp, logIn } from './helpers/auth';
import { createCampaign } from './helpers/campaign';
import { uniqueTestUser, uniqueCampaignSlug } from './helpers/test-data';

test('signing up a new account lands on the dashboard with zero campaigns', async ({ page, registerCleanup }) => {
  const user = uniqueTestUser();
  registerCleanup(user.email);

  await signUp(page, user);
  await expect(page.getByText('No campaigns yet. Create your first one above.')).toBeVisible();
});

test('visiting /dashboard while logged out redirects to /login', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});

test('logging in shows only that user\'s own campaigns', async ({ browser, registerCleanup }) => {
  const userA = uniqueTestUser();
  const userB = uniqueTestUser();
  registerCleanup(userA.email);
  registerCleanup(userB.email);

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  // A second, unrelated user with their own campaign — must never show up for userA.
  await signUp(pageB, userB);
  await createCampaign(pageB, { slug: uniqueCampaignSlug(), name: 'User B Campaign' });

  await signUp(pageA, userA);
  await createCampaign(pageA, { slug: uniqueCampaignSlug(), name: 'User A Campaign' });

  // Log out (from the main dashboard list — the campaign detail page has no
  // "Log out" button) and back in via the real /login UI, then re-check.
  await pageA.goto('/dashboard');
  await pageA.getByRole('button', { name: 'Log out' }).click();
  await pageA.waitForURL(/\/login/);
  await logIn(pageA, userA);

  await expect(pageA.getByText('User A Campaign')).toBeVisible();
  await expect(pageA.getByText('User B Campaign')).not.toBeVisible();

  await contextA.close();
  await contextB.close();
});

test('User B cannot open User A\'s campaign detail page by guessing its URL', async ({ browser, registerCleanup }) => {
  const userA = uniqueTestUser();
  const userB = uniqueTestUser();
  registerCleanup(userA.email);
  registerCleanup(userB.email);

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();

  await signUp(pageA, userA);
  const campaign = await createCampaign(pageA, { slug: uniqueCampaignSlug(), name: 'User A Private Campaign' });

  await signUp(pageB, userB);
  await pageB.goto(`/dashboard/campaigns/${campaign.id}`);

  await expect(pageB.getByText('Campaign not found.')).toBeVisible();
  await expect(pageB.getByText('User A Private Campaign')).not.toBeVisible();

  await contextA.close();
  await contextB.close();
});

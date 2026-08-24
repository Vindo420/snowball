import type { Browser } from '@playwright/test';
import { test, expect } from './helpers/fixtures';
import { signUp } from './helpers/auth';
import { createCampaign, activateCampaign } from './helpers/campaign';
import { uniqueTestUser, uniqueCampaignSlug } from './helpers/test-data';
import { db } from './helpers/db';

/**
 * Creates a fresh campaign owner, creates their campaign, and activates it
 * (campaigns start DRAFT, which 404s on the public page). Registers the
 * owner for cleanup — cascades remove the campaign and any participants.
 */
async function setupActiveCampaign(
  browser: Browser,
  registerCleanup: (email: string) => void,
  headline?: string
): Promise<{ slug: string }> {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUp(ownerPage, owner);
  const campaign = await createCampaign(ownerPage, { slug, headline });
  await activateCampaign(ownerPage, campaign.id);
  await ownerContext.close();

  return { slug };
}

test('the public campaign page loads fully while logged out', async ({ browser, registerCleanup }) => {
  const headline = `E2E Public Test ${uniqueCampaignSlug()}`;
  const { slug } = await setupActiveCampaign(browser, registerCleanup, headline);

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/c/${slug}`);

  await expect(page.getByRole('heading', { name: headline })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter now' })).toBeVisible();

  await context.close();
});

test('entering the giveaway creates a participant and reveals a personal referral link', async ({
  browser,
  registerCleanup,
}) => {
  const { slug } = await setupActiveCampaign(browser, registerCleanup);

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/c/${slug}`);
  await page.locator('input[name="email"]').fill(uniqueTestUser().email);
  await page.getByRole('button', { name: 'Enter now' }).click();

  await expect(page.getByText("You're in!")).toBeVisible();
  await expect(page.locator('code')).toContainText('?ref=');

  await context.close();
});

test('entering via ?ref=CODE increments the referrer\'s referral count', async ({ browser, registerCleanup }) => {
  const { slug } = await setupActiveCampaign(browser, registerCleanup);

  // First participant — the referrer.
  const referrerContext = await browser.newContext();
  const referrerPage = await referrerContext.newPage();
  await referrerPage.goto(`/c/${slug}`);
  await referrerPage.locator('input[name="email"]').fill(uniqueTestUser().email);
  await referrerPage.getByRole('button', { name: 'Enter now' }).click();
  await expect(referrerPage.getByText("You're in!")).toBeVisible();

  const shareUrl = await referrerPage.locator('code').innerText();
  const refCode = new URL(shareUrl).searchParams.get('ref');
  if (!refCode) {
    throw new Error(`Could not find a ref code in the revealed share link: ${shareUrl}`);
  }
  await referrerContext.close();

  // Second participant enters via the first participant's referral link.
  const refereeContext = await browser.newContext();
  const refereePage = await refereeContext.newPage();
  await refereePage.goto(`/c/${slug}?ref=${refCode}`);
  await refereePage.locator('input[name="email"]').fill(uniqueTestUser().email);
  await refereePage.getByRole('button', { name: 'Enter now' }).click();
  await expect(refereePage.getByText("You're in!")).toBeVisible();
  await refereeContext.close();

  const referrer = await db.participant.findUnique({ where: { refCode } });
  expect(referrer?.referralCount).toBe(1);
});

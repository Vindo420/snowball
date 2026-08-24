import { test, expect } from './helpers/fixtures';
import { signUp } from './helpers/auth';
import { createCampaign, activateCampaign } from './helpers/campaign';
import { uniqueTestUser, uniqueCampaignSlug } from './helpers/test-data';
import { db } from './helpers/db';

test('a campaign with a null pageConfig still renders with a working entry form', async ({
  browser,
  registerCleanup,
}) => {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUp(ownerPage, owner);
  const campaign = await createCampaign(ownerPage, { slug });
  await activateCampaign(ownerPage, campaign.id);
  await ownerContext.close();

  // Freshly-created campaigns never had pageConfig set at all — this is the
  // null case as it actually occurs, not a contrived one.
  const stored = await db.campaign.findUnique({ where: { id: campaign.id } });
  expect(stored?.pageConfig).toBeNull();

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/c/${slug}`);
  await page.locator('input[name="email"]').fill(uniqueTestUser().email);
  await page.getByRole('button', { name: 'Enter now' }).click();
  await expect(page.getByText("You're in!")).toBeVisible();
  await context.close();
});

test('a campaign with a legacy pageConfig still renders with a working entry form', async ({
  browser,
  registerCleanup,
}) => {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUp(ownerPage, owner);
  const campaign = await createCampaign(ownerPage, { slug });
  await activateCampaign(ownerPage, campaign.id);
  await ownerContext.close();

  // Simulate a pre-existing row from before this feature — the old shape
  // documented in the (now-updated) prisma/seed.ts. The hardened PATCH
  // endpoint rejects this shape, so it's written directly via Prisma, exactly
  // as an old row already in the database would be.
  await db.campaign.update({
    where: { id: campaign.id },
    data: { pageConfig: { theme: 'brand', sections: ['hero', 'progress', 'leaderboard', 'share', 'footer'] } },
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/c/${slug}`);
  await page.locator('input[name="email"]').fill(uniqueTestUser().email);
  await page.getByRole('button', { name: 'Enter now' }).click();
  await expect(page.getByText("You're in!")).toBeVisible();
  await context.close();
});

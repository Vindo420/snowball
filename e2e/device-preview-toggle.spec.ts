import { test, expect } from './helpers/fixtures';
import { signUp } from './helpers/auth';
import { createCampaign, activateCampaign } from './helpers/campaign';
import { uniqueTestUser, uniqueCampaignSlug } from './helpers/test-data';
import { db } from './helpers/db';

test('the device preview toggle changes the canvas width without any network write or data change', async ({
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

  const writeRequests: string[] = [];
  page.on('request', (req) => {
    if (req.method() !== 'GET' && req.url().includes(`/api/campaigns/${campaign.id}`)) {
      writeRequests.push(`${req.method()} ${req.url()}`);
    }
  });

  const canvas = page.locator('main');
  const desktopBox = await canvas.boundingBox();
  expect(desktopBox).not.toBeNull();

  await page.getByRole('button', { name: 'Mobile' }).click();
  // Let the width transition settle.
  await page.waitForTimeout(300);

  const mobileBox = await canvas.boundingBox();
  expect(mobileBox).not.toBeNull();
  expect(mobileBox!.width).toBeLessThan(desktopBox!.width);
  expect(mobileBox!.width).toBeLessThanOrEqual(400);
  expect(mobileBox!.width).toBeGreaterThanOrEqual(380);

  expect(writeRequests).toEqual([]);

  const stored = await db.campaign.findUnique({ where: { id: campaign.id } });
  expect(stored?.pageConfigDraft).toBeNull();
  expect(stored?.pageConfig).toBeNull();

  await context.close();
});

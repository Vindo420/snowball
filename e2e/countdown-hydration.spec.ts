import { test, expect } from './helpers/fixtures';
import { signUp } from './helpers/auth';
import { createCampaign, activateCampaign } from './helpers/campaign';
import { uniqueTestUser, uniqueCampaignSlug } from './helpers/test-data';

test('public page with a countdown section and endsAt set shows no hydration-mismatch warnings', async ({
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

  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const res = await ownerPage.request.patch(`/api/campaigns/${campaign.id}`, {
    data: {
      endsAt,
      pageConfig: {
        sections: [
          { id: 'hero', type: 'HERO' },
          { id: 'countdown', type: 'COUNTDOWN' },
          { id: 'entry', type: 'ENTRY_FORM' },
        ],
      },
    },
  });
  expect(res.ok()).toBe(true);
  await ownerContext.close();

  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages: string[] = [];
  page.on('console', (msg) => consoleMessages.push(msg.text()));
  page.on('pageerror', (err) => consoleMessages.push(err.message));

  await page.goto(`/c/${slug}`);
  await expect(page.getByText('Ends in')).toBeVisible();
  // Let the post-mount tick fire at least once so any mismatch between the
  // frozen initial render and the live tick would have already surfaced.
  await page.waitForTimeout(1500);

  const hydrationWarningPattern = /hydrat|did not match|content does not match|server rendered/i;
  const hydrationWarnings = consoleMessages.filter((message) => hydrationWarningPattern.test(message));

  expect(hydrationWarnings).toEqual([]);

  await context.close();
});

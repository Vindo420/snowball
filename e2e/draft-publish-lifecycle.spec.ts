import { test, expect } from './helpers/fixtures';
import { signUp } from './helpers/auth';
import { createCampaign, activateCampaign } from './helpers/campaign';
import { uniqueTestUser, uniqueCampaignSlug } from './helpers/test-data';

test('editing a section and letting it autosave does not change the public page until Publish', async ({
  browser,
  registerCleanup,
}) => {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUp(ownerPage, owner);
  const campaign = await createCampaign(ownerPage, { slug, headline: 'Original headline' });
  await activateCampaign(ownerPage, campaign.id);

  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  await visitorPage.goto(`/c/${slug}`);
  await expect(visitorPage.getByRole('heading', { name: 'Original headline' })).toBeVisible();

  await ownerPage.goto(`/dashboard/campaigns/${campaign.id}/edit`);
  await ownerPage.locator('input[name="headline"]').fill('Draft-only headline');
  // Autosave is debounced; wait for it to actually land as a draft.
  await expect(ownerPage.getByText('Unpublished changes')).toBeVisible();

  await visitorPage.reload();
  await expect(visitorPage.getByRole('heading', { name: 'Original headline' })).toBeVisible();
  await expect(visitorPage.getByText('Draft-only headline')).toHaveCount(0);

  await ownerContext.close();
  await visitorContext.close();
});

test('pressing Publish makes an edited draft live on the public page', async ({ browser, registerCleanup }) => {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(page, owner);
  const campaign = await createCampaign(page, { slug, headline: 'Original headline' });
  await activateCampaign(page, campaign.id);

  await page.goto(`/dashboard/campaigns/${campaign.id}/edit`);
  await page.locator('input[name="headline"]').fill('Published via editor');
  await expect(page.getByText('Unpublished changes')).toBeVisible();

  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('All changes published')).toBeVisible();

  await context.close();

  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  await visitorPage.goto(`/c/${slug}`);
  await expect(visitorPage.getByRole('heading', { name: 'Published via editor' })).toBeVisible();
  await visitorContext.close();
});

test('discarding a draft restores the previously published state without affecting the public page', async ({
  browser,
  registerCleanup,
}) => {
  const owner = uniqueTestUser();
  registerCleanup(owner.email);
  const slug = uniqueCampaignSlug();

  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(page, owner);
  const campaign = await createCampaign(page, { slug, headline: 'Published headline' });
  await activateCampaign(page, campaign.id);

  await page.goto(`/dashboard/campaigns/${campaign.id}/edit`);
  await page.locator('input[name="headline"]').fill('Draft headline that should be discarded');
  await expect(page.getByText('Unpublished changes')).toBeVisible();

  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByText('All changes published')).toBeVisible();
  await expect(page.locator('input[name="headline"]')).toHaveValue('Published headline');

  await context.close();

  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  await visitorPage.goto(`/c/${slug}`);
  await expect(visitorPage.getByRole('heading', { name: 'Published headline' })).toBeVisible();
  await visitorContext.close();
});

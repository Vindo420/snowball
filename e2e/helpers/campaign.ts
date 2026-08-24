import type { Page } from '@playwright/test';

/**
 * Drives the real "New campaign" form as whatever user `page` is currently
 * logged in as. Returns the created campaign's id (parsed from the redirect
 * URL) and the slug it was given.
 */
export async function createCampaign(
  page: Page,
  { slug, name = 'E2E Test Campaign', headline }: { slug: string; name?: string; headline?: string }
): Promise<{ id: string; slug: string }> {
  await page.goto('/dashboard/campaigns/new');
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="slug"]').fill(slug);
  if (headline) {
    await page.locator('input[name="headline"]').fill(headline);
  }
  await page.getByRole('button', { name: 'Create campaign' }).click();
  // Exclude "new" itself — the form starts on /dashboard/campaigns/new, which
  // would otherwise satisfy a loose /campaigns/[^/]+$ pattern immediately.
  await page.waitForURL(/\/dashboard\/campaigns\/(?!new$)[^/]+$/);

  const id = page.url().split('/dashboard/campaigns/')[1];
  return { id, slug };
}

/** PATCHes a campaign to ACTIVE using the same session cookies as `page`. */
export async function activateCampaign(page: Page, campaignId: string): Promise<void> {
  const res = await page.request.patch(`/api/campaigns/${campaignId}`, {
    data: { status: 'ACTIVE' },
  });
  if (!res.ok()) {
    throw new Error(`Failed to activate campaign ${campaignId}: ${res.status()} ${await res.text()}`);
  }
}

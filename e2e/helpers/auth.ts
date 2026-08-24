import type { Page } from '@playwright/test';

export type TestUser = { email: string; password: string };

// The signup/login form labels aren't programmatically associated with
// their inputs (no htmlFor/id), so target by `name` attribute instead of
// getByLabel.

/** Drives the real /signup form. Leaves the page on /dashboard, signed in. */
export async function signUp(page: Page, user: TestUser): Promise<void> {
  await page.goto('/signup');
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.waitForURL('/dashboard');
}

/** Drives the real /login form. Leaves the page on /dashboard, signed in. */
export async function logIn(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('/dashboard');
}

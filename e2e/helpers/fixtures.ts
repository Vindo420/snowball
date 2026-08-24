import { test as base } from '@playwright/test';
import { cleanupUser } from './db';

type Fixtures = {
  /** Register a test-created user's email for teardown after this test. */
  registerCleanup: (email: string) => void;
};

// Fixture teardown (the code after `await use(...)`) runs as part of
// Playwright's guaranteed cleanup phase, unlike a plain try/finally inside
// the test body — which a hard test timeout can cut short mid-await.
export const test = base.extend<Fixtures>({
  registerCleanup: async ({}, use) => {
    const emails: string[] = [];
    await use((email) => {
      emails.push(email);
    });
    for (const email of emails) {
      await cleanupUser(email);
    }
  },
});

export { expect } from '@playwright/test';

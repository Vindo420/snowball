import { randomUUID } from 'node:crypto';

const TEST_PASSWORD = 'e2e-test-password-123';

/** A short, unique-enough suffix for this test's data. */
function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

/** A uniquely-named test account. Same shape every call, different values. */
export function uniqueTestUser() {
  return {
    email: `e2e-${uniqueSuffix()}@e2e.test`,
    password: TEST_PASSWORD,
  };
}

/** A uniquely-named campaign slug, safe to use as both slug and display name seed. */
export function uniqueCampaignSlug(): string {
  return `e2e-${uniqueSuffix()}`;
}

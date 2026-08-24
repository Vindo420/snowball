import { PrismaClient } from '@prisma/client';

// Separate client from the app's src/lib/db.ts singleton — this runs in the
// Playwright/Node test process, not inside the Next.js app.
export const db = new PrismaClient();

/**
 * Deletes a test-created user by email. Cascades (per prisma/schema.prisma)
 * remove their campaigns, and each campaign's participants/referrals/reward
 * tiers/integrations along with it. Safe to call even if the user was never
 * created (e.g. a test failed before signup completed).
 */
export async function cleanupUser(email: string): Promise<void> {
  await db.user.deleteMany({ where: { email } });
}

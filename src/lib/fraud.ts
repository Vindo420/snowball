import { db } from '@/lib/db';

/**
 * Minimal, extendable fraud heuristics. Upviral's real system is proprietary;
 * these are the checks worth having on day one. Wire this into the participant
 * signup handler (src/app/api/referrals/route.ts) before counting a referral.
 *
 * Returns a reason string if the signup looks fraudulent, or null if it's clean.
 */
export async function checkSignupForFraud(params: {
  campaignId: string;
  email: string;
  ipAddress?: string;
}): Promise<string | null> {
  // 1. Duplicate email on the same campaign is already blocked by the DB
  //    unique constraint (campaignId, email) — nothing to do here, but a
  //    friendly pre-check avoids a raw constraint error bubbling to the user.
  const existing = await db.participant.findUnique({
    where: { campaignId_email: { campaignId: params.campaignId, email: params.email } },
  });
  if (existing) return 'DUPLICATE_EMAIL';

  // 2. Same IP signing up an unusual number of times in a short window
  //    (classic self-referral farming pattern).
  if (params.ipAddress) {
    const recentFromSameIp = await db.participant.count({
      where: {
        campaignId: params.campaignId,
        ipAddress: params.ipAddress,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // last hour
      },
    });
    if (recentFromSameIp >= 5) return 'IP_VELOCITY';
  }

  // 3. Disposable / obviously fake email domains — extend this list or swap
  //    in a real disposable-email-detector package.
  const blockedDomains = ['mailinator.com', 'tempmail.com', 'guerrillamail.com'];
  const domain = params.email.split('@')[1]?.toLowerCase();
  if (domain && blockedDomains.includes(domain)) return 'DISPOSABLE_EMAIL';

  return null;
}

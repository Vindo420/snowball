import { nanoid } from 'nanoid';
import { db } from '@/lib/db';

/** Generates a short, URL-safe, unique-enough referral code. Collision is checked at write time. */
export function generateRefCode(): string {
  return nanoid(10);
}

/** Builds the shareable referral URL for a participant on a given campaign slug. */
export function buildReferralUrl(appUrl: string, campaignSlug: string, refCode: string): string {
  const url = new URL(`/c/${campaignSlug}`, appUrl);
  url.searchParams.set('ref', refCode);
  return url.toString();
}

/**
 * Call this whenever a referred signup completes (i.e. someone landed via
 * ?ref=CODE and then submitted the participant form). It:
 *  1. links the new participant to the referrer,
 *  2. bumps the referrer's referralCount + points,
 *  3. checks whether any new reward tiers were just unlocked.
 */
export async function recordReferral(params: {
  campaignId: string;
  referrerRefCode: string;
  refereeParticipantId: string;
  channel?: 'LINK' | 'FACEBOOK' | 'TWITTER_X' | 'INSTAGRAM_STORY' | 'WHATSAPP' | 'EMAIL' | 'SMS' | 'OTHER';
  ipAddress?: string;
}) {
  const referrer = await db.participant.findUnique({
    where: { refCode: params.referrerRefCode },
  });

  if (!referrer || referrer.campaignId !== params.campaignId) {
    return null; // unknown or cross-campaign ref code — ignore rather than throw
  }

  // Prevent self-referral.
  if (referrer.id === params.refereeParticipantId) {
    return null;
  }

  const referral = await db.referral.create({
    data: {
      campaignId: params.campaignId,
      referrerId: referrer.id,
      refereeId: params.refereeParticipantId,
      channel: params.channel ?? 'LINK',
    },
  });

  await db.participant.update({
    where: { id: referrer.id },
    data: {
      referralCount: { increment: 1 },
      points: { increment: 10 }, // simple default scoring; make this configurable per campaign
    },
  });

  await unlockEligibleRewards(referrer.id);

  return referral;
}

/** Unlocks any RewardTier the participant now qualifies for and records it. Idempotent. */
export async function unlockEligibleRewards(participantId: string) {
  const participant = await db.participant.findUnique({ where: { id: participantId } });
  if (!participant) return;

  const eligibleTiers = await db.rewardTier.findMany({
    where: {
      campaignId: participant.campaignId,
      referralsRequired: { lte: participant.referralCount },
    },
  });

  for (const tier of eligibleTiers) {
    await db.participantReward.upsert({
      where: { participantId_rewardTierId: { participantId, rewardTierId: tier.id } },
      update: {},
      create: {
        participantId,
        rewardTierId: tier.id,
        deliveredAt: tier.autoDeliver ? new Date() : null,
      },
    });
  }
}

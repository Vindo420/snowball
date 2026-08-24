import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { generateRefCode, recordReferral } from '@/lib/referral';
import { checkSignupForFraud } from '@/lib/fraud';
import { dispatchNewParticipant } from '@/lib/integrations';

const signupSchema = z.object({
  campaignSlug: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  // Referral code from the URL the visitor landed on (?ref=CODE), if any.
  ref: z.string().optional(),
  channel: z
    .enum(['LINK', 'FACEBOOK', 'TWITTER_X', 'INSTAGRAM_STORY', 'WHATSAPP', 'EMAIL', 'SMS', 'OTHER'])
    .optional(),
});

/**
 * POST /api/referrals — the single endpoint the public campaign page (or an
 * embed/popup) posts to when a visitor enters the giveaway. Handles:
 *   1. fraud screening,
 *   2. creating the new Participant with their own refCode,
 *   3. crediting whoever referred them (if any),
 *   4. fanning the new lead out to configured integrations.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { campaignSlug, email, name, ref, channel } = parsed.data;

  const campaign = await db.campaign.findUnique({
    where: { slug: campaignSlug },
    include: { integrations: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  if (campaign.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Campaign is not currently accepting entries' }, { status: 403 });
  }

  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;

  const fraudReason = await checkSignupForFraud({ campaignId: campaign.id, email, ipAddress });
  if (fraudReason === 'DUPLICATE_EMAIL') {
    return NextResponse.json({ error: 'You already entered this giveaway' }, { status: 409 });
  }

  const participant = await db.participant.create({
    data: {
      campaignId: campaign.id,
      email,
      name,
      refCode: generateRefCode(),
      ipAddress,
      userAgent: req.headers.get('user-agent') ?? undefined,
      status: fraudReason ? 'PENDING' : 'VERIFIED',
    },
  });

  if (ref) {
    await recordReferral({
      campaignId: campaign.id,
      referrerRefCode: ref,
      refereeParticipantId: participant.id,
      channel,
      ipAddress,
    });
  }

  // Fire-and-forget: don't make the visitor wait on Mailchimp/HubSpot/etc.
  void dispatchNewParticipant(campaign.integrations, { email, name: name ?? null });

  return NextResponse.json(
    {
      participant: {
        id: participant.id,
        refCode: participant.refCode,
        points: participant.points,
        referralCount: participant.referralCount,
      },
    },
    { status: 201 }
  );
}

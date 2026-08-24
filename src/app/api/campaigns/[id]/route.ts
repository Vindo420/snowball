import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageConfigWithEntryFormSchema, PageDraftEnvelopeSchema } from '@/lib/pageConfig';

// Explicit allow-list for PATCH — replaces trusting an arbitrary request body.
// `status` must stay accepted: e2e/helpers/campaign.ts's activateCampaign depends on it.
const updateCampaignSchema = z
  .object({
    name: z.string().min(1).optional(),
    slug: z
      .string()
      .min(3)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
      .optional(),
    type: z.enum(['SWEEPSTAKES', 'REWARDS', 'WAITLIST', 'MILESTONE', 'CUSTOM']).optional(),
    displayMode: z.enum(['LANDING_PAGE', 'EMBED', 'POPUP', 'POPOVER']).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED']).optional(),
    headline: z.string().optional(),
    description: z.string().optional(),
    prizeDescription: z.string().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    pageConfig: PageConfigWithEntryFormSchema.optional(),
    pageConfigDraft: PageDraftEnvelopeSchema.optional(),
  })
  .strict();

// GET /api/campaigns/:id — full campaign detail incl. reward tiers + leaderboard, owner only.
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const campaign = await db.campaign.findUnique({
    where: { id: params.id },
    include: {
      rewardTiers: { orderBy: { referralsRequired: 'asc' } },
      integrations: true,
      participants: {
        orderBy: [{ referralCount: 'desc' }, { points: 'desc' }],
        take: 50,
      },
    },
  });

  if (!campaign || campaign.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

// PATCH /api/campaigns/:id — partial update (status, copy, pageConfig, etc), owner only.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await db.campaign.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await db.campaign.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ campaign });
}

// DELETE /api/campaigns/:id — owner only.
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await db.campaign.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

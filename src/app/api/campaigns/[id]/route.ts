import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/campaigns/:id — full campaign detail incl. reward tiers + leaderboard.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
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

  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

// PATCH /api/campaigns/:id — partial update (status, copy, pageConfig, etc).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const campaign = await db.campaign.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json({ campaign });
}

// DELETE /api/campaigns/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

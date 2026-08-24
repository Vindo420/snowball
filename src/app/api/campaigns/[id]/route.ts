import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

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

  const campaign = await db.campaign.update({
    where: { id: params.id },
    data: body,
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

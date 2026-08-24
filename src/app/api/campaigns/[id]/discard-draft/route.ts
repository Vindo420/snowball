import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/campaigns/:id/discard-draft — clears pageConfigDraft without
// touching the published fields. Owner only. Succeeds even if there was no
// draft to begin with (a defensively-clicked Discard shouldn't error).
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await db.campaign.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const campaign = await db.campaign.update({
    where: { id: params.id },
    data: { pageConfigDraft: Prisma.DbNull },
  });

  return NextResponse.json({ campaign });
}

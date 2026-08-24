import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseDraftEnvelope } from '@/lib/pageConfig';

// POST /api/campaigns/:id/publish — copies pageConfigDraft into the published
// fields and clears the draft. Owner only. 400 if there's no draft to publish.
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

  const draft = parseDraftEnvelope(existing.pageConfigDraft);
  if (!draft) {
    return NextResponse.json({ error: 'No draft to publish' }, { status: 400 });
  }

  const campaign = await db.campaign.update({
    where: { id: params.id },
    data: {
      headline: draft.headline,
      description: draft.description,
      endsAt: draft.endsAt,
      pageConfig: draft.pageConfig,
      pageConfigDraft: Prisma.DbNull,
    },
  });

  return NextResponse.json({ campaign });
}

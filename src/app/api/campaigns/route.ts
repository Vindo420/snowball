import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const createCampaignSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  type: z.enum(['SWEEPSTAKES', 'REWARDS', 'WAITLIST', 'MILESTONE', 'CUSTOM']).default('REWARDS'),
  displayMode: z.enum(['LANDING_PAGE', 'EMBED', 'POPUP', 'POPOVER']).default('LANDING_PAGE'),
  headline: z.string().optional(),
  description: z.string().optional(),
  prizeDescription: z.string().optional(),
});

// GET /api/campaigns — list the authenticated user's own campaigns for the dashboard.
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const campaigns = await db.campaign.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { participants: true } } },
  });

  return NextResponse.json({ campaigns });
}

// POST /api/campaigns — create a new campaign (draft by default), owned by the authenticated user.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createCampaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingSlug = await db.campaign.findUnique({ where: { slug: parsed.data.slug } });
  if (existingSlug) {
    return NextResponse.json({ error: 'That slug is already taken' }, { status: 409 });
  }

  const campaign = await db.campaign.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}

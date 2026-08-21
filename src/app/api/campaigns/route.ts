import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const createCampaignSchema = z.object({
  userId: z.string(), // TODO: replace with the authenticated session user once NextAuth is wired up
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

// GET /api/campaigns?userId=... — list a user's campaigns for the dashboard.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const campaigns = await db.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { participants: true } } },
  });

  return NextResponse.json({ campaigns });
}

// POST /api/campaigns — create a new campaign (draft by default).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createCampaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingSlug = await db.campaign.findUnique({ where: { slug: parsed.data.slug } });
  if (existingSlug) {
    return NextResponse.json({ error: 'That slug is already taken' }, { status: 409 });
  }

  const campaign = await db.campaign.create({ data: parsed.data });

  return NextResponse.json({ campaign }, { status: 201 });
}

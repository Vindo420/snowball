import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { CampaignLanding } from '@/components/CampaignLanding';

/**
 * Public campaign page — this is the "landing page" DisplayMode. The EMBED /
 * POPUP / POPOVER display modes reuse the same /api/referrals endpoint and
 * <EntryForm> + <ShareButtons> components; they just render inside an
 * <iframe> or a JS-injected modal on the customer's own site instead of on
 * this full page. Building that embed script (public/embed.js) is a natural
 * next step once this core flow is solid.
 */
export default async function PublicCampaignPage({ params }: { params: { slug: string } }) {
  const campaign = await db.campaign.findUnique({
    where: { slug: params.slug },
    include: {
      participants: {
        orderBy: [{ referralCount: 'desc' }, { points: 'desc' }],
        take: 20,
      },
    },
  });

  if (!campaign || campaign.status === 'DRAFT') {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <CampaignLanding
      campaignSlug={campaign.slug}
      headline={campaign.headline}
      description={campaign.description}
      prizeDescription={campaign.prizeDescription}
      appUrl={appUrl}
      leaderboard={campaign.participants}
    />
  );
}

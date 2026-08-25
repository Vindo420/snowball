import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { parsePageConfig } from '@/lib/pageConfig';
import { PageRenderer } from '@/components/page-builder/PageRenderer';

/**
 * Public campaign page — this is the "landing page" DisplayMode. The EMBED /
 * POPUP / POPOVER display modes reuse the same /api/referrals endpoint and
 * <EntryForm> + <ShareButtons> components; they just render inside an
 * <iframe> or a JS-injected modal on the customer's own site instead of on
 * this full page. Building that embed script (public/embed.js) is a natural
 * next step once this core flow is solid.
 */

// Always render fresh. The leaderboard changes every time someone enters,
// so this page must never be served from a build-time cache.
export const dynamic = 'force-dynamic';

export default async function PublicCampaignPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const campaign = await db.campaign.findUnique({
    where: { slug: params.slug },
    include: {
      rewardTiers: { orderBy: { referralsRequired: 'asc' } },
      participants: {
        orderBy: [{ referralCount: 'desc' }, { points: 'desc' }],
        take: 20,
      },
    },
  });

  // Only ACTIVE campaigns render normally. ENDED renders too (a final,
  // read-only state — see PageRenderer's `ended` prop), since participants'
  // share links keep receiving real traffic after a campaign ends and a 404
  // would waste it. DRAFT and PAUSED are not publicly reachable.
  if (!campaign || campaign.status === 'DRAFT' || campaign.status === 'PAUSED') {
    notFound();
  }

  // Use || not ?? so that an empty-string env var also falls back.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const pageConfig = parsePageConfig(campaign.pageConfig);

  return (
    // PageRenderer calls useSearchParams() to read the ?ref= code, which
    // Next.js requires to sit inside a Suspense boundary.
    <Suspense fallback={<main className="px-6 py-16 text-center text-gray-500">Loading…</main>}>
      <PageRenderer
        pageConfig={pageConfig}
        campaignSlug={campaign.slug}
        headline={campaign.headline}
        description={campaign.description}
        prizeDescription={campaign.prizeDescription}
        appUrl={appUrl}
        endsAt={campaign.endsAt}
        serverNowMs={Date.now()}
        rewardTiers={campaign.rewardTiers}
        leaderboard={campaign.participants}
        ended={campaign.status === 'ENDED'}
      />
    </Suspense>
  );
}

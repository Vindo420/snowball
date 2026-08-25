import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { parsePageConfig, parseDraftEnvelope } from '@/lib/pageConfig';
import { PageBuilderEditor } from './PageBuilderEditor';

export default async function EditCampaignPagePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const campaign = await db.campaign.findUnique({
    where: { id: params.id },
    include: {
      rewardTiers: { orderBy: { referralsRequired: 'asc' } },
      participants: {
        orderBy: [{ referralCount: 'desc' }, { points: 'desc' }],
        take: 20,
      },
    },
  });

  if (!campaign || campaign.userId !== session.user.id) {
    return <main className="p-12 text-center text-gray-500">Campaign not found.</main>;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const serverNowMs = Date.now();

  const draft = parseDraftEnvelope(campaign.pageConfigDraft);
  const initialContent = draft ?? {
    headline: campaign.headline,
    description: campaign.description,
    endsAt: campaign.endsAt,
    pageConfig: parsePageConfig(campaign.pageConfig),
  };

  return (
    <PageBuilderEditor
      // Remounts with fresh initial props after Publish/Discard bump updatedAt
      // and the client calls router.refresh() — see design.md's Decisions.
      key={campaign.updatedAt.toISOString()}
      campaignId={campaign.id}
      campaignName={campaign.name}
      campaignSlug={campaign.slug}
      appUrl={appUrl}
      initialPageConfig={initialContent.pageConfig}
      initialHeadline={initialContent.headline}
      initialDescription={initialContent.description}
      prizeDescription={campaign.prizeDescription}
      initialEndsAt={initialContent.endsAt ? initialContent.endsAt.toISOString() : null}
      initialHasDraft={campaign.pageConfigDraft !== null}
      status={campaign.status}
      serverNowMs={serverNowMs}
      rewardTiers={campaign.rewardTiers}
      leaderboard={campaign.participants}
    />
  );
}

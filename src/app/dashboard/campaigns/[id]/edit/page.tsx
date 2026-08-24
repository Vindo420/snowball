import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { parsePageConfig } from '@/lib/pageConfig';
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

  return (
    <PageBuilderEditor
      campaignId={campaign.id}
      campaignSlug={campaign.slug}
      appUrl={appUrl}
      initialPageConfig={parsePageConfig(campaign.pageConfig)}
      initialHeadline={campaign.headline}
      initialDescription={campaign.description}
      prizeDescription={campaign.prizeDescription}
      initialEndsAt={campaign.endsAt ? campaign.endsAt.toISOString() : null}
      rewardTiers={campaign.rewardTiers}
      leaderboard={campaign.participants}
    />
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Leaderboard } from '@/components/Leaderboard';
import { CampaignStatusControlWithRefresh } from './CampaignStatusControlWithRefresh';

export default async function CampaignDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const campaign = await db.campaign.findUnique({
    where: { id: params.id },
    include: {
      rewardTiers: { orderBy: { referralsRequired: 'asc' } },
      integrations: true,
      participants: {
        orderBy: [{ referralCount: 'desc' }, { points: 'desc' }],
      },
    },
  });

  if (!campaign || campaign.userId !== session.user.id) {
    return <main className="p-12 text-center text-gray-500">Campaign not found.</main>;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-gray-500">
            {campaign.type} &middot; <PublicUrlDisplay appUrl={appUrl} slug={campaign.slug} status={campaign.status} />
          </p>
          <div className="mt-2">
            <CampaignStatusControlWithRefresh campaignId={campaign.id} status={campaign.status} />
          </div>
        </div>
        <Link
          href={`/dashboard/campaigns/${campaign.id}/edit`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Edit page
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Reward tiers</h2>
        <ul className="space-y-2">
          {campaign.rewardTiers.map((tier) => (
            <li key={tier.id} className="flex justify-between rounded-lg border border-gray-200 bg-white p-3">
              <span className="font-medium">{tier.name}</span>
              <span className="text-gray-500">{tier.referralsRequired} referrals</span>
              <span>{tier.rewardDescription}</span>
            </li>
          ))}
          {campaign.rewardTiers.length === 0 && (
            <li className="text-gray-400">No reward tiers configured yet.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Integrations</h2>
        <ul className="space-y-2">
          {campaign.integrations.map((i) => (
            <li key={i.id} className="rounded-lg border border-gray-200 bg-white p-3">
              {i.provider}
            </li>
          ))}
          {campaign.integrations.length === 0 && (
            <li className="text-gray-400">No integrations connected yet.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Leaderboard ({campaign.participants.length} entries)</h2>
        <Leaderboard entries={campaign.participants} />
      </section>
    </main>
  );
}

/**
 * Reflects actual reachability, not just status: DRAFT/PAUSED 404, so the URL
 * is shown as plain text, clearly marked not live — never as a working link
 * that would disappoint. ENDED still renders (a final read-only state), so
 * its URL stays a working link, just marked as ended.
 */
function PublicUrlDisplay({ appUrl, slug, status }: { appUrl: string; slug: string; status: string }) {
  const url = `${appUrl}/c/${slug}`;

  if (status === 'DRAFT' || status === 'PAUSED') {
    return <span>{url} (not live)</span>;
  }

  if (status === 'ENDED') {
    return (
      <>
        <a className="underline" href={url} target="_blank" rel="noreferrer">
          {url}
        </a>{' '}
        (ended)
      </>
    );
  }

  return (
    <a className="underline" href={url} target="_blank" rel="noreferrer">
      {url}
    </a>
  );
}

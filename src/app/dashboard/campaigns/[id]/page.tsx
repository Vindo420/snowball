import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Leaderboard } from '@/components/Leaderboard';

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
            {campaign.status} &middot; {campaign.type} &middot;{' '}
            <a className="underline" href={`${appUrl}/c/${campaign.slug}`} target="_blank" rel="noreferrer">
              {appUrl}/c/{campaign.slug}
            </a>
          </p>
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

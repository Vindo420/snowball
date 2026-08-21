import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { LogoutButton } from '@/components/LogoutButton';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const campaigns = await db.campaign.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { participants: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your campaigns</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/campaigns/new"
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            + New campaign
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {campaigns.length === 0 && (
          <p className="p-6 text-gray-500">No campaigns yet. Create your first one above.</p>
        )}
        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/campaigns/${c.id}`}
            className="flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-500">
                /c/{c.slug} &middot; {c.type} &middot; {c.status}
              </p>
            </div>
            <p className="text-sm text-gray-500">{c._count.participants} participants</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

import Link from 'next/link';
import { db } from '@/lib/db';

// TODO: replace with the real authenticated user once NextAuth is wired up.
// For now the scaffold reads the seeded demo user so the dashboard has data
// to show immediately after `npm run db:seed`.
async function getDemoUser() {
  return db.user.findUnique({ where: { email: 'demo@snowball.dev' } });
}

export default async function DashboardPage() {
  const user = await getDemoUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-gray-600">
          No demo user found yet. Run <code className="rounded bg-gray-100 px-1">npm run db:seed</code> and
          reload this page.
        </p>
      </main>
    );
  }

  const campaigns = await db.campaign.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { participants: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your campaigns</h1>
        <Link
          href="/dashboard/campaigns/new"
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          + New campaign
        </Link>
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

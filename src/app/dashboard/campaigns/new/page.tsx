import { db } from '@/lib/db';
import { CampaignForm } from '@/components/CampaignForm';

export default async function NewCampaignPage() {
  // TODO: swap for the authenticated session user.
  const user = await db.user.findUnique({ where: { email: 'demo@snowball.dev' } });

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center text-gray-600">
        Run <code className="rounded bg-gray-100 px-1">npm run db:seed</code> first to create a demo user.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">New campaign</h1>
      <CampaignForm userId={user.id} />
    </main>
  );
}

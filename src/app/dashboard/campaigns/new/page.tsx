import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CampaignForm } from '@/components/CampaignForm';

export default async function NewCampaignPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">New campaign</h1>
      <CampaignForm />
    </main>
  );
}

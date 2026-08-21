import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Snowball</h1>
      <p className="max-w-xl text-lg text-gray-600">
        A self-hosted viral referral &amp; giveaway platform. Create a campaign, get
        every participant a unique share link, and watch referrals compound.
      </p>
      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
        >
          Go to dashboard
        </Link>
        <Link
          href="/c/launch-giveaway"
          className="rounded-lg border border-gray-300 px-5 py-3 font-medium hover:bg-gray-100"
        >
          View demo campaign
        </Link>
      </div>
      <p className="text-sm text-gray-400">
        Run <code className="rounded bg-gray-100 px-1 py-0.5">npm run db:seed</code> first to
        create the demo campaign and login.
      </p>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EntryForm } from '@/components/EntryForm';
import { ShareButtons } from '@/components/ShareButtons';
import { Leaderboard } from '@/components/Leaderboard';

type LeaderboardEntry = {
  id: string;
  name: string | null;
  email: string;
  referralCount: number;
  points: number;
};

export function CampaignLanding({
  campaignSlug,
  headline,
  description,
  prizeDescription,
  appUrl,
  leaderboard,
}: {
  campaignSlug: string;
  headline: string | null;
  description: string | null;
  prizeDescription: string | null;
  appUrl: string;
  leaderboard: LeaderboardEntry[];
}) {
  const searchParams = useSearchParams();
  const incomingRef = searchParams.get('ref') ?? undefined;
  const [myRefCode, setMyRefCode] = useState<string | null>(null);

  const myShareUrl = myRefCode ? `${appUrl}/c/${campaignSlug}?ref=${myRefCode}` : null;

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-16 text-center">
      <div>
        <h1 className="text-3xl font-bold">{headline ?? 'Join the giveaway'}</h1>
        {description && <p className="mt-3 text-gray-600">{description}</p>}
        {prizeDescription && (
          <p className="mt-1 text-sm font-medium uppercase tracking-wide text-brand-600">
            Prize: {prizeDescription}
          </p>
        )}
      </div>

      {!myShareUrl ? (
        <EntryForm campaignSlug={campaignSlug} refCode={incomingRef} onEntered={setMyRefCode} />
      ) : (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          <p className="font-semibold">You're in! Share your link to move up the leaderboard:</p>
          <code className="block break-all rounded bg-gray-50 p-3 text-sm">{myShareUrl}</code>
          <ShareButtons url={myShareUrl} message={headline ?? 'Join this giveaway!'} />
        </div>
      )}

      <section className="text-left">
        <h2 className="mb-3 text-lg font-semibold">Leaderboard</h2>
        <Leaderboard entries={leaderboard} />
      </section>
    </main>
  );
}

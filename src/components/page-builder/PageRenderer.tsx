'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PageConfig } from '@/lib/pageConfig';
import type { EnteredParticipant } from '@/components/EntryForm';
import { HeroSection } from './sections/HeroSection';
import { LeaderboardSection } from './sections/LeaderboardSection';
import { RewardTiersSection } from './sections/RewardTiersSection';
import { CountdownSection } from './sections/CountdownSection';
import { EntryFormSection } from './sections/EntryFormSection';

type RewardTier = { id: string; name: string; referralsRequired: number; rewardDescription: string };
type LeaderboardEntry = { id: string; name: string | null; email: string; referralCount: number; points: number };

export function PageRenderer({
  pageConfig,
  campaignSlug,
  headline,
  description,
  prizeDescription,
  appUrl,
  endsAt,
  serverNowMs,
  rewardTiers,
  leaderboard,
  preview,
}: {
  pageConfig: PageConfig;
  campaignSlug: string;
  headline: string | null;
  description: string | null;
  prizeDescription: string | null;
  appUrl: string;
  endsAt: Date | null;
  /** Computed once, server-side, at request time — see `CountdownSection` for why. */
  serverNowMs: number;
  rewardTiers: RewardTier[];
  leaderboard: LeaderboardEntry[];
  /** When true, no section's interactive controls can create real data. */
  preview?: boolean;
}) {
  const searchParams = useSearchParams();
  const incomingRef = searchParams.get('ref') ?? undefined;
  const [myEntry, setMyEntry] = useState<EnteredParticipant | null>(null);

  // Guarantee the entry form always renders, even if the parsed config
  // somehow lacks one — belt-and-suspenders alongside parsePageConfig's own
  // guarantee and PATCH's save-time rejection.
  const sections = pageConfig.sections.some((s) => s.type === 'ENTRY_FORM')
    ? pageConfig.sections
    : [...pageConfig.sections, { id: 'runtime-appended-entry-form', type: 'ENTRY_FORM' as const }];

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-16 text-center">
      {sections.map((section) => {
        switch (section.type) {
          case 'HERO':
            return (
              <HeroSection
                key={section.id}
                section={section}
                headline={headline}
                description={description}
                prizeDescription={prizeDescription}
              />
            );
          case 'LEADERBOARD':
            return <LeaderboardSection key={section.id} entries={leaderboard} />;
          case 'REWARD_TIERS':
            return (
              <RewardTiersSection
                key={section.id}
                tiers={rewardTiers}
                myProgress={myEntry ? { referralCount: myEntry.referralCount } : null}
              />
            );
          case 'COUNTDOWN':
            return <CountdownSection key={section.id} endsAt={endsAt} serverNowMs={serverNowMs} />;
          case 'ENTRY_FORM':
            return (
              <EntryFormSection
                key={section.id}
                campaignSlug={campaignSlug}
                headline={headline}
                appUrl={appUrl}
                incomingRef={incomingRef}
                myEntry={myEntry}
                onEntered={setMyEntry}
                preview={preview}
              />
            );
        }
      })}
    </main>
  );
}

'use client';

import { Fragment, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PageConfig } from '@/lib/pageConfig';
import { SECTION_LABELS } from '@/lib/pageConfig';
import type { EnteredParticipant } from '@/components/EntryForm';
import { HeroSection } from './sections/HeroSection';
import { LeaderboardSection } from './sections/LeaderboardSection';
import { RewardTiersSection } from './sections/RewardTiersSection';
import { CountdownSection } from './sections/CountdownSection';
import { EntryFormSection } from './sections/EntryFormSection';
import { SectionFrame } from './SectionFrame';

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
  editable,
  selectedSectionId,
  onSelectSection,
  onMoveSection,
  onRemoveSection,
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
  /**
   * When true (canvas usage only), wraps each section in selection/hover
   * chrome. Off by default — the public page and any other usage renders
   * exactly as before. See design.md's Decisions.
   */
  editable?: boolean;
  selectedSectionId?: string | null;
  onSelectSection?: (id: string) => void;
  onMoveSection?: (id: string, direction: -1 | 1) => void;
  onRemoveSection?: (id: string) => void;
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
      {sections.map((section, index) => {
        let content: React.ReactNode;
        switch (section.type) {
          case 'HERO':
            content = (
              <HeroSection
                section={section}
                headline={headline}
                description={description}
                prizeDescription={prizeDescription}
              />
            );
            break;
          case 'LEADERBOARD':
            content = <LeaderboardSection entries={leaderboard} />;
            break;
          case 'REWARD_TIERS':
            content = (
              <RewardTiersSection
                tiers={rewardTiers}
                myProgress={myEntry ? { referralCount: myEntry.referralCount } : null}
              />
            );
            break;
          case 'COUNTDOWN':
            content = <CountdownSection endsAt={endsAt} serverNowMs={serverNowMs} />;
            break;
          case 'ENTRY_FORM':
            content = (
              <EntryFormSection
                campaignSlug={campaignSlug}
                headline={headline}
                appUrl={appUrl}
                incomingRef={incomingRef}
                myEntry={myEntry}
                onEntered={setMyEntry}
                preview={preview}
              />
            );
            break;
        }

        if (!editable) {
          // No wrapper element — keeps the public rendering path byte-for-byte
          // identical to before `editable` existed.
          return <Fragment key={section.id}>{content}</Fragment>;
        }

        return (
          <SectionFrame
            key={section.id}
            label={SECTION_LABELS[section.type]}
            selected={section.id === selectedSectionId}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
            onSelect={() => onSelectSection?.(section.id)}
            onMoveUp={() => onMoveSection?.(section.id, -1)}
            onMoveDown={() => onMoveSection?.(section.id, 1)}
            onDelete={section.type !== 'ENTRY_FORM' ? () => onRemoveSection?.(section.id) : undefined}
          >
            {content}
          </SectionFrame>
        );
      })}
    </main>
  );
}

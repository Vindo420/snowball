'use client';

import { Suspense } from 'react';
import type { PageConfig } from '@/lib/pageConfig';
import { PageRenderer } from '@/components/page-builder/PageRenderer';

type RewardTier = { id: string; name: string; referralsRequired: number; rewardDescription: string };
type LeaderboardEntry = { id: string; name: string | null; email: string; referralCount: number; points: number };

export function EditorCanvas({
  device,
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
  selectedSectionId,
  onSelectSection,
  onMoveSection,
  onRemoveSection,
}: {
  device: 'desktop' | 'mobile';
  pageConfig: PageConfig;
  campaignSlug: string;
  headline: string | null;
  description: string | null;
  prizeDescription: string | null;
  appUrl: string;
  endsAt: Date | null;
  /** Computed once, server-side (see edit/page.tsx) — never `Date.now()` here; see CountdownSection. */
  serverNowMs: number;
  rewardTiers: RewardTier[];
  leaderboard: LeaderboardEntry[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onMoveSection: (id: string, direction: -1 | 1) => void;
  onRemoveSection: (id: string) => void;
}) {
  return (
    <div className="flex h-full items-start justify-center overflow-y-auto bg-gray-100 p-8">
      <div
        className="min-h-[600px] rounded-lg border border-gray-200 bg-white shadow-sm transition-[width] duration-150"
        style={{ width: device === 'mobile' ? 390 : '100%', maxWidth: device === 'mobile' ? 390 : 800 }}
      >
        <Suspense fallback={<p className="p-6 text-center text-gray-500">Loading preview…</p>}>
          <PageRenderer
            pageConfig={pageConfig}
            campaignSlug={campaignSlug}
            headline={headline}
            description={description}
            prizeDescription={prizeDescription}
            appUrl={appUrl}
            endsAt={endsAt}
            serverNowMs={serverNowMs}
            rewardTiers={rewardTiers}
            leaderboard={leaderboard}
            preview
            editable
            selectedSectionId={selectedSectionId}
            onSelectSection={onSelectSection}
            onMoveSection={onMoveSection}
            onRemoveSection={onRemoveSection}
          />
        </Suspense>
      </div>
    </div>
  );
}

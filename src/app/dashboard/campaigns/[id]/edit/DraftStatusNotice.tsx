'use client';

import { useState } from 'react';
import { patchCampaignStatus } from '@/components/CampaignStatusControl';

/**
 * Shown only while the campaign being edited is DRAFT — the state where the
 * gap this whole feature closes is most severe: a brand-new campaign that
 * was never reachable at all. Not shown for PAUSED/ENDED, which are states
 * the owner deliberately chose.
 */
export function DraftStatusNotice({ campaignId, onActivated }: { campaignId: string; onActivated: () => void }) {
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setActivating(true);
    setError(null);
    const result = await patchCampaignStatus(campaignId, 'ACTIVE');
    setActivating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onActivated();
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-amber-900">
          This campaign is in Draft — visitors currently see a not-found page. Activate it to make the public page
          reachable.
        </p>
        <button
          onClick={handleActivate}
          disabled={activating}
          className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {activating ? 'Activating…' : 'Activate campaign'}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

'use client';

import { useState } from 'react';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';

const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ENDED: 'Ended',
};

/** Shared PATCH call so every status-change surface (top bar, detail page, draft notice) behaves identically. */
export async function patchCampaignStatus(
  campaignId: string,
  next: CampaignStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: next }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: typeof body.error === 'string' ? body.error : 'Failed to update campaign status' };
  }
  return { ok: true };
}

/**
 * Whether the campaign is running at all (Campaign.status) — distinct from,
 * and never to be confused with, whether unpublished page-content edits
 * exist (Campaign.pageConfigDraft, see the editor's Publish-changes/Discard
 * controls). This component only ever touches `status`.
 */
export function CampaignStatusControl({
  campaignId,
  status,
  onChanged,
  className,
}: {
  campaignId: string;
  status: CampaignStatus;
  /** Called after a successful status change, e.g. `router.refresh()`. */
  onChanged: () => void;
  className?: string;
}) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(next: CampaignStatus) {
    setUpdating(true);
    setError(null);
    const result = await patchCampaignStatus(campaignId, next);
    setUpdating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Status: {STATUS_LABELS[status]}</span>

        {(status === 'DRAFT' || status === 'PAUSED') && (
          <button
            onClick={() => changeStatus('ACTIVE')}
            disabled={updating}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Activate campaign
          </button>
        )}

        {status === 'ACTIVE' && (
          <button
            onClick={() => changeStatus('PAUSED')}
            disabled={updating}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Pause campaign
          </button>
        )}

        {(status === 'ACTIVE' || status === 'PAUSED') && (
          <button
            onClick={() => changeStatus('ENDED')}
            disabled={updating}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            End campaign
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

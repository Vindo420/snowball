'use client';

import Link from 'next/link';
import { CampaignStatusControl, type CampaignStatus } from '@/components/CampaignStatusControl';

export type SaveState = 'idle' | 'saving' | 'unpublished' | 'failed';

export function EditorTopBar({
  campaignName,
  campaignId,
  status,
  onStatusChanged,
  device,
  onDeviceChange,
  saveState,
  onRetry,
  onPublish,
  onDiscard,
  publishing,
  publishError,
}: {
  campaignName: string;
  campaignId: string;
  status: CampaignStatus;
  onStatusChanged: () => void;
  device: 'desktop' | 'mobile';
  onDeviceChange: (device: 'desktop' | 'mobile') => void;
  saveState: SaveState;
  onRetry: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  publishing: boolean;
  publishError: string | null;
}) {
  const hasDraft = saveState === 'unpublished' || saveState === 'saving' || saveState === 'failed';

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link href={`/dashboard/campaigns/${campaignId}`} className="text-sm text-gray-500 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="truncate text-lg font-semibold">{campaignName}</h1>
          {/* Campaign.status (is this campaign running at all) — a separate
              concept from the page-content Publish-changes/Discard controls
              on the right, which govern pageConfigDraft. */}
          <CampaignStatusControl campaignId={campaignId} status={status} onChanged={onStatusChanged} />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-lg border border-gray-300 p-0.5 text-sm">
            <button
              onClick={() => onDeviceChange('desktop')}
              aria-pressed={device === 'desktop'}
              className={`rounded px-3 py-1 ${device === 'desktop' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
            >
              Desktop
            </button>
            <button
              onClick={() => onDeviceChange('mobile')}
              aria-pressed={device === 'mobile'}
              className={`rounded px-3 py-1 ${device === 'mobile' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
            >
              Mobile
            </button>
          </div>

          <SaveStateIndicator saveState={saveState} onRetry={onRetry} />

          {hasDraft && (
            <button
              onClick={onDiscard}
              disabled={publishing}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Discard
            </button>
          )}

          <button
            onClick={onPublish}
            disabled={publishing || !hasDraft}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : 'Publish changes'}
          </button>
        </div>
      </div>

      {publishError && <p className="mt-2 text-sm text-red-700">{publishError}</p>}
    </div>
  );
}

function SaveStateIndicator({ saveState, onRetry }: { saveState: SaveState; onRetry: () => void }) {
  switch (saveState) {
    case 'idle':
      return <span className="text-sm text-gray-400">All changes published</span>;
    case 'saving':
      return <span className="text-sm text-gray-500">Saving…</span>;
    case 'unpublished':
      return <span className="text-sm text-amber-600">Unpublished changes</span>;
    case 'failed':
      return (
        <span className="text-sm text-red-600">
          Failed to save —{' '}
          <button onClick={onRetry} className="underline">
            Retry
          </button>
        </span>
      );
  }
}

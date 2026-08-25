import { EntryForm, type EnteredParticipant } from '@/components/EntryForm';
import { ShareButtons } from '@/components/ShareButtons';

export function EntryFormSection({
  campaignSlug,
  headline,
  appUrl,
  incomingRef,
  myEntry,
  onEntered,
  preview,
  ended,
}: {
  campaignSlug: string;
  headline: string | null;
  appUrl: string;
  incomingRef?: string;
  /** The current visitor's own entry, once they've submitted. `null` before entry. */
  myEntry: EnteredParticipant | null;
  onEntered: (participant: EnteredParticipant) => void;
  preview?: boolean;
  /** Campaign has ENDED — checked before `myEntry`: no form, no reveal, just the finished message. */
  ended?: boolean;
}) {
  if (ended) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="font-semibold">This giveaway has finished.</p>
      </div>
    );
  }

  if (myEntry) {
    const myShareUrl = `${appUrl}/c/${campaignSlug}?ref=${myEntry.refCode}`;
    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <p className="font-semibold">You're in! Share your link to move up the leaderboard:</p>
        <code className="block break-all rounded bg-gray-50 p-3 text-sm">{myShareUrl}</code>
        <ShareButtons url={myShareUrl} message={headline ?? 'Join this giveaway!'} />
      </div>
    );
  }

  return <EntryForm campaignSlug={campaignSlug} refCode={incomingRef} onEntered={onEntered} disabled={preview} />;
}

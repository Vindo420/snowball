'use client';

import { useState } from 'react';

/**
 * Public giveaway entry form. Posts to /api/referrals, then hands the caller
 * the participant's own refCode so the page can reveal their personal share
 * link + leaderboard position.
 */
export type EnteredParticipant = { refCode: string; points: number; referralCount: number };

export function EntryForm({
  campaignSlug,
  refCode,
  onEntered,
  disabled,
}: {
  campaignSlug: string;
  refCode?: string;
  onEntered: (participant: EnteredParticipant) => void;
  /** When true, submission is inert — used by the page-builder editor's live preview so it can never create real data. */
  disabled?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) {
      return;
    }
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignSlug,
        email: String(form.get('email')),
        name: String(form.get('name') || ''),
        ref: refCode,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === 'string' ? body.error : 'Something went wrong');
      setSubmitting(false);
      return;
    }

    const { participant } = await res.json();
    onEntered(participant);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-3">
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <input
        name="name"
        placeholder="Your name"
        className="rounded-lg border border-gray-300 p-3"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className="rounded-lg border border-gray-300 p-3"
      />
      <button
        type="submit"
        disabled={submitting || disabled}
        className="rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? 'Entering…' : 'Enter now'}
      </button>
    </form>
  );
}

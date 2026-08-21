'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CAMPAIGN_TYPES = ['SWEEPSTAKES', 'REWARDS', 'WAITLIST', 'MILESTONE', 'CUSTOM'] as const;
const DISPLAY_MODES = ['LANDING_PAGE', 'EMBED', 'POPUP', 'POPOVER'] as const;

/**
 * Minimal campaign creation form. This is the seed of Upviral's drag-and-drop
 * page builder — today it's a plain form; the natural next step is to make
 * `pageConfig` editable here (sections, colors, copy) with a live preview.
 */
export function CampaignForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get('name')),
      slug: String(form.get('slug')),
      type: String(form.get('type')),
      displayMode: String(form.get('displayMode')),
      headline: String(form.get('headline') || ''),
      description: String(form.get('description') || ''),
      prizeDescription: String(form.get('prizeDescription') || ''),
    };

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === 'string' ? body.error : 'Failed to create campaign');
      setSubmitting(false);
      return;
    }

    const { campaign } = await res.json();
    router.push(`/dashboard/campaigns/${campaign.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div>
        <label className="block text-sm font-medium">Campaign name</label>
        <input name="name" required className="mt-1 w-full rounded border border-gray-300 p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium">Slug (public URL: /c/…)</label>
        <input name="slug" required pattern="[a-z0-9-]+" className="mt-1 w-full rounded border border-gray-300 p-2" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Type</label>
          <select name="type" className="mt-1 w-full rounded border border-gray-300 p-2">
            {CAMPAIGN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Display mode</label>
          <select name="displayMode" className="mt-1 w-full rounded border border-gray-300 p-2">
            {DISPLAY_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Headline</label>
        <input name="headline" className="mt-1 w-full rounded border border-gray-300 p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea name="description" rows={3} className="mt-1 w-full rounded border border-gray-300 p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium">Prize description</label>
        <input name="prizeDescription" className="mt-1 w-full rounded border border-gray-300 p-2" />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand-600 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? 'Creating…' : 'Create campaign'}
      </button>
    </form>
  );
}

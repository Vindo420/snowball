'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PageConfig, Section, SectionType } from '@/lib/pageConfig';
import { PageRenderer } from '@/components/page-builder/PageRenderer';

const ADDABLE_TYPES: { type: SectionType; label: string }[] = [
  { type: 'HERO', label: 'Hero' },
  { type: 'LEADERBOARD', label: 'Leaderboard' },
  { type: 'REWARD_TIERS', label: 'Reward tiers' },
  { type: 'COUNTDOWN', label: 'Countdown' },
];

const SECTION_LABELS: Record<SectionType, string> = {
  HERO: 'Hero',
  LEADERBOARD: 'Leaderboard',
  REWARD_TIERS: 'Reward tiers',
  COUNTDOWN: 'Countdown',
  ENTRY_FORM: 'Entry form',
};

type RewardTier = { id: string; name: string; referralsRequired: number; rewardDescription: string };
type LeaderboardEntry = { id: string; name: string | null; email: string; referralCount: number; points: number };

function uniqueSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** ISO (UTC) datetime string -> local-time value usable in <input type="datetime-local">. */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const localMs = date.getTime() - date.getTimezoneOffset() * 60000;
  return new Date(localMs).toISOString().slice(0, 16);
}

export function PageBuilderEditor({
  campaignId,
  campaignSlug,
  appUrl,
  initialPageConfig,
  initialHeadline,
  initialDescription,
  prizeDescription,
  initialEndsAt,
  rewardTiers,
  leaderboard,
}: {
  campaignId: string;
  campaignSlug: string;
  appUrl: string;
  initialPageConfig: PageConfig;
  initialHeadline: string | null;
  initialDescription: string | null;
  prizeDescription: string | null;
  initialEndsAt: string | null;
  rewardTiers: RewardTier[];
  leaderboard: LeaderboardEntry[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>(initialPageConfig.sections);
  const [headline, setHeadline] = useState(initialHeadline ?? '');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [endsAt, setEndsAt] = useState(toDatetimeLocalValue(initialEndsAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function addSection(type: SectionType) {
    const base = { id: uniqueSectionId() };
    const newSection: Section =
      type === 'HERO' ? { ...base, type: 'HERO' } : ({ ...base, type } as Section);
    setSections((prev) => [...prev, newSection]);
    setSaved(false);
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setSaved(false);
  }

  function moveSection(id: string, direction: -1 | 1) {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setSaved(false);
  }

  function updateHeroImageUrl(id: string, imageUrl: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === id && s.type === 'HERO' ? { ...s, imageUrl: imageUrl || undefined } : s))
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headline,
        description,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        pageConfig: { sections },
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        typeof body.error === 'string'
          ? body.error
          : body.error?.fieldErrors?.pageConfig?.[0] || body.error?.formErrors?.[0] || 'Failed to save';
      setError(message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit page</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select id="add-section-type" className="rounded border border-gray-300 p-2 text-sm" defaultValue="HERO">
              {ADDABLE_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const select = document.getElementById('add-section-type') as HTMLSelectElement;
                addSection(select.value as SectionType);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              + Add section
            </button>
          </div>

          <ul className="space-y-3">
            {sections.map((section, index) => (
              <li key={section.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{SECTION_LABELS[section.type]}</span>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label={`Move ${SECTION_LABELS[section.type]} up`}
                      onClick={() => moveSection(section.id, -1)}
                      disabled={index === 0}
                      className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${SECTION_LABELS[section.type]} down`}
                      onClick={() => moveSection(section.id, 1)}
                      disabled={index === sections.length - 1}
                      className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ↓
                    </button>
                    {section.type !== 'ENTRY_FORM' && (
                      <button
                        aria-label={`Remove ${SECTION_LABELS[section.type]}`}
                        onClick={() => removeSection(section.id)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {section.type === 'HERO' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Headline</label>
                      <input
                        name="headline"
                        value={headline}
                        onChange={(e) => {
                          setHeadline(e.target.value);
                          setSaved(false);
                        }}
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Subtext</label>
                      <textarea
                        name="description"
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          setSaved(false);
                        }}
                        rows={2}
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Image URL</label>
                      <input
                        name="imageUrl"
                        value={section.imageUrl ?? ''}
                        onChange={(e) => updateHeroImageUrl(section.id, e.target.value)}
                        placeholder="https://…"
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                {section.type === 'COUNTDOWN' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Ends at</label>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => {
                        setEndsAt(e.target.value);
                        setSaved(false);
                      }}
                      className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                    />
                  </div>
                )}

                {(section.type === 'LEADERBOARD' || section.type === 'REWARD_TIERS') && (
                  <p className="text-sm text-gray-400">No additional settings for this section.</p>
                )}

                {section.type === 'ENTRY_FORM' && (
                  <p className="text-sm text-gray-400">Always present — cannot be removed or configured.</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">Live preview</h2>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <Suspense fallback={<p className="p-6 text-center text-gray-500">Loading preview…</p>}>
              <PageRenderer
                pageConfig={{ sections }}
                campaignSlug={campaignSlug}
                headline={headline || null}
                description={description || null}
                prizeDescription={prizeDescription}
                appUrl={appUrl}
                endsAt={endsAt ? new Date(endsAt) : null}
                serverNowMs={Date.now()}
                rewardTiers={rewardTiers}
                leaderboard={leaderboard}
                preview
              />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

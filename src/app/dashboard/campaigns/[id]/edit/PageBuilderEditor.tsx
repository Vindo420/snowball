'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PageConfig, Section, SectionType } from '@/lib/pageConfig';
import { EditorTopBar, type SaveState } from './EditorTopBar';
import { SectionSidebar } from './SectionSidebar';
import { EditorCanvas } from './EditorCanvas';

type RewardTier = { id: string; name: string; referralsRequired: number; rewardDescription: string };
type LeaderboardEntry = { id: string; name: string | null; email: string; referralCount: number; points: number };

const AUTOSAVE_DEBOUNCE_MS = 800;

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
  campaignName,
  campaignSlug,
  appUrl,
  initialPageConfig,
  initialHeadline,
  initialDescription,
  prizeDescription,
  initialEndsAt,
  initialHasDraft,
  serverNowMs,
  rewardTiers,
  leaderboard,
}: {
  campaignId: string;
  campaignName: string;
  campaignSlug: string;
  appUrl: string;
  initialPageConfig: PageConfig;
  initialHeadline: string | null;
  initialDescription: string | null;
  prizeDescription: string | null;
  initialEndsAt: string | null;
  initialHasDraft: boolean;
  serverNowMs: number;
  rewardTiers: RewardTier[];
  leaderboard: LeaderboardEntry[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>(initialPageConfig.sections);
  const [headline, setHeadline] = useState(initialHeadline ?? '');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [endsAt, setEndsAt] = useState(toDatetimeLocalValue(initialEndsAt));
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(sections[0]?.id ?? null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saveState, setSaveState] = useState<SaveState>(initialHasDraft ? 'unpublished' : 'idle');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always read the latest state from the autosave closure, without making
  // scheduleAutosave's identity (and therefore effect deps) churn on every edit.
  const latestRef = useRef({ sections, headline, description, endsAt });
  latestRef.current = { sections, headline, description, endsAt };

  async function saveDraft() {
    setSaveState('saving');
    const { sections, headline, description, endsAt } = latestRef.current;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageConfigDraft: {
            headline: headline || null,
            description: description || null,
            endsAt: endsAt ? new Date(endsAt).toISOString() : null,
            pageConfig: { sections },
          },
        }),
      });
      setSaveState(res.ok ? 'unpublished' : 'failed');
    } catch {
      setSaveState('failed');
    }
  }

  function scheduleAutosave() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void saveDraft();
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Warn before leaving while the latest edit isn't confirmed persisted.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (saveState === 'saving' || saveState === 'failed') {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveState]);

  function addSection(type: SectionType) {
    const base = { id: uniqueSectionId() };
    const newSection: Section = type === 'HERO' ? { ...base, type: 'HERO' } : ({ ...base, type } as Section);
    setSections((prev) => [...prev, newSection]);
    setSelectedSectionId(newSection.id);
    scheduleAutosave();
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setSelectedSectionId((prev) => (prev === id ? null : prev));
    scheduleAutosave();
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
    scheduleAutosave();
  }

  function updateHeroImageUrl(id: string, imageUrl: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === id && s.type === 'HERO' ? { ...s, imageUrl: imageUrl || undefined } : s))
    );
    scheduleAutosave();
  }

  function handleHeadlineChange(value: string) {
    setHeadline(value);
    scheduleAutosave();
  }

  function handleDescriptionChange(value: string) {
    setDescription(value);
    scheduleAutosave();
  }

  function handleEndsAtChange(value: string) {
    setEndsAt(value);
    scheduleAutosave();
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    const res = await fetch(`/api/campaigns/${campaignId}/publish`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setPublishError(typeof body.error === 'string' ? body.error : 'Failed to publish');
      setPublishing(false);
      return;
    }
    setPublishing(false);
    router.refresh();
  }

  async function handleDiscard() {
    setPublishing(true);
    setPublishError(null);
    const res = await fetch(`/api/campaigns/${campaignId}/discard-draft`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setPublishError(typeof body.error === 'string' ? body.error : 'Failed to discard');
      setPublishing(false);
      return;
    }
    setPublishing(false);
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col">
      <EditorTopBar
        campaignName={campaignName}
        campaignId={campaignId}
        device={device}
        onDeviceChange={setDevice}
        saveState={saveState}
        onRetry={() => void saveDraft()}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
        publishing={publishing}
        publishError={publishError}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0">
          <SectionSidebar
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSelect={setSelectedSectionId}
            onAdd={addSection}
            onRemove={removeSection}
            onMove={moveSection}
            headline={headline}
            onHeadlineChange={handleHeadlineChange}
            description={description}
            onDescriptionChange={handleDescriptionChange}
            onImageUrlChange={updateHeroImageUrl}
            endsAt={endsAt}
            onEndsAtChange={handleEndsAtChange}
          />
        </div>

        <div className="flex-1">
          <EditorCanvas
            device={device}
            pageConfig={{ sections }}
            campaignSlug={campaignSlug}
            headline={headline || null}
            description={description || null}
            prizeDescription={prizeDescription}
            appUrl={appUrl}
            endsAt={endsAt ? new Date(endsAt) : null}
            serverNowMs={serverNowMs}
            rewardTiers={rewardTiers}
            leaderboard={leaderboard}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
            onMoveSection={moveSection}
            onRemoveSection={removeSection}
          />
        </div>
      </div>
    </div>
  );
}

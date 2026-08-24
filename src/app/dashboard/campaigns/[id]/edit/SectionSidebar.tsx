'use client';

import type { Section, SectionType } from '@/lib/pageConfig';
import { SECTION_LABELS } from '@/lib/pageConfig';
import { BlockLibraryPanel } from './BlockLibraryPanel';

export function SectionSidebar({
  sections,
  selectedSectionId,
  onSelect,
  onAdd,
  onRemove,
  onMove,
  headline,
  onHeadlineChange,
  description,
  onDescriptionChange,
  onImageUrlChange,
  endsAt,
  onEndsAtChange,
}: {
  sections: Section[];
  selectedSectionId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: SectionType) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  headline: string;
  onHeadlineChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  onImageUrlChange: (sectionId: string, url: string) => void;
  endsAt: string;
  onEndsAtChange: (value: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-4">
      <BlockLibraryPanel onAdd={onAdd} />

      <ul className="space-y-2">
        {sections.map((section, index) => {
          const selected = section.id === selectedSectionId;
          return (
            <li
              key={section.id}
              className={`rounded-lg border p-3 ${selected ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white'}`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(section.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(section.id);
                  }
                }}
                aria-label={`Select ${SECTION_LABELS[section.type]} section`}
                aria-pressed={selected}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="font-medium">{SECTION_LABELS[section.type]}</span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    aria-label={`Move ${SECTION_LABELS[section.type]} up`}
                    onClick={() => onMove(section.id, -1)}
                    disabled={index === 0}
                    className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Move ${SECTION_LABELS[section.type]} down`}
                    onClick={() => onMove(section.id, 1)}
                    disabled={index === sections.length - 1}
                    className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                  {section.type !== 'ENTRY_FORM' && (
                    <button
                      aria-label={`Remove ${SECTION_LABELS[section.type]}`}
                      onClick={() => onRemove(section.id)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {selected && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  {section.type === 'HERO' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Headline</label>
                        <input
                          name="headline"
                          value={headline}
                          onChange={(e) => onHeadlineChange(e.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Subtext</label>
                        <textarea
                          name="description"
                          value={description}
                          onChange={(e) => onDescriptionChange(e.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Image URL</label>
                        <input
                          name="imageUrl"
                          value={section.imageUrl ?? ''}
                          onChange={(e) => onImageUrlChange(section.id, e.target.value)}
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
                        onChange={(e) => onEndsAtChange(e.target.value)}
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
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { SectionType } from '@/lib/pageConfig';
import { SECTION_LABELS } from '@/lib/pageConfig';

const CATEGORIES: { category: string; types: SectionType[] }[] = [
  { category: 'Content', types: ['HERO'] },
  { category: 'Referral mechanics', types: ['LEADERBOARD', 'REWARD_TIERS', 'COUNTDOWN'] },
];

const ICONS: Record<SectionType, ReactNode> = {
  HERO: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="14" rx="1.5" />
      <circle cx="8" cy="9" r="1.5" />
      <path d="M4 15l4.5-4 3.5 3 4-3.5L20 15" />
    </svg>
  ),
  LEADERBOARD: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M6 20V12M12 20V4M18 20v-7" />
    </svg>
  ),
  REWARD_TIERS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4" />
      <path d="M12 12v3M9 20h6M10 17h4v3h-4z" />
    </svg>
  ),
  COUNTDOWN: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 2h6" />
    </svg>
  ),
  ENTRY_FORM: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M7 10h10M7 14h6" />
    </svg>
  ),
};

export function BlockLibraryPanel({ onAdd }: { onAdd: (type: SectionType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        + Add block
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          {CATEGORIES.map((cat) => (
            <div key={cat.category} className="mb-3 last:mb-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{cat.category}</p>
              <div className="grid grid-cols-3 gap-2">
                {cat.types.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      onAdd(type);
                      setOpen(false);
                    }}
                    className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 p-3 text-xs text-gray-600 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {ICONS[type]}
                    <span>{SECTION_LABELS[type]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

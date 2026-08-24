'use client';

import type { ReactNode } from 'react';

/**
 * Wraps a rendered section on the canvas with selection/hover chrome
 * (click-to-select, a highlight ring, and a floating move-up/move-down/delete
 * control strip) when the editor's canvas is rendering in `editable` mode.
 * Deliberately no duplicate control — duplicating a LEADERBOARD or COUNTDOWN
 * section isn't meaningful.
 */
export function SectionFrame({
  label,
  selected,
  isFirst,
  isLast,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  children,
}: {
  label: string;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  /** Omitted for the entry-form section, which cannot be removed. */
  onDelete?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Select ${label} section`}
      aria-pressed={selected}
      className={`group relative rounded-lg text-left transition-shadow ${
        selected ? 'ring-2 ring-brand-600' : 'hover:ring-2 hover:ring-gray-300'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm transition-opacity ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <button
          aria-label={`Move ${label} up`}
          onClick={onMoveUp}
          disabled={isFirst}
          className="rounded px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-30"
        >
          ↑
        </button>
        <button
          aria-label={`Move ${label} down`}
          onClick={onMoveDown}
          disabled={isLast}
          className="rounded px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-30"
        >
          ↓
        </button>
        {onDelete && (
          <button
            aria-label={`Remove ${label}`}
            onClick={onDelete}
            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

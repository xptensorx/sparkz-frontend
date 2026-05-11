// BlockListSidebar
// =================
// Vertical list of every block in the run, in display order. Each entry
// shows: title, block_type chip, and a tiny lock icon when the block has
// been edited (and is therefore protected from re-generation per
// Package Rule 4).
//
// Pure presentation — selection state lives on the parent page.

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Human-friendly labels for block_type. */
const TYPE_LABEL = {
  primary_statement:  'Primary',
  note:               'Note',
  accounting_policy:  'Policy',
  strategic_report:   'Strategic',
  directors_report:   'Directors',
  auditors_report:    'Auditors',
};

const TYPE_TONE = {
  primary_statement:  'bg-indigo-50 text-indigo-700',
  note:               'bg-amber-50 text-amber-700',
  accounting_policy:  'bg-emerald-50 text-emerald-700',
  strategic_report:   'bg-violet-50 text-violet-700',
  directors_report:   'bg-sky-50 text-sky-700',
  auditors_report:    'bg-rose-50 text-rose-700',
};

/**
 * @param {{
 *   blocks: Array<any>,
 *   selectedBlockId: string | null,
 *   onSelect: (id: string) => void,
 * }} props
 */
export function BlockListSidebar({ blocks, selectedBlockId, onSelect }) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs text-gray-400">
        No blocks generated yet.
      </div>
    );
  }

  return (
    <nav className="overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
      <ul className="space-y-0.5">
        {blocks.map((block) => {
          const isActive = block.id === selectedBlockId;
          const typeLabel = TYPE_LABEL[block.block_type] || block.block_type;
          const typeTone = TYPE_TONE[block.block_type] || 'bg-gray-100 text-gray-600';
          return (
            <li key={block.id}>
              <button
                type="button"
                onClick={() => onSelect(block.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                  isActive
                    ? 'bg-[#16133a] text-white'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold leading-snug">
                    {block.title || '(untitled)'}
                  </span>
                  <span className={cn(
                    'mt-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    isActive
                      ? 'bg-white/10 text-violet-200'
                      : typeTone,
                  )}>
                    {typeLabel}
                  </span>
                </span>
                {block.is_locked && (
                  <Lock
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0',
                      isActive ? 'text-amber-300' : 'text-amber-600',
                    )}
                    aria-label="edited"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

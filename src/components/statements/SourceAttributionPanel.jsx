// SourceAttributionPanel
// =======================
// Right-hand drawer that shows where the currently-selected block's
// content came from. Drives Package Rule 2 (every figure must be
// traceable to the workbook + every narrative paragraph to the 20-F).
//
// Sources arrive as a list of `{type, origin, ...}` dicts from the
// backend — see generator/{primary_table,notes_builder,reports_builder}.py
// for the producers and statements/__init__.py for the contract.

import { cn } from '@/lib/utils';

/** Pretty labels per source.type */
const TYPE_LABEL = {
  excel:    'Workbook',
  '20-f':   '20-F filing',
  prior:    'Prior-year AFS',
  audit:    'Generation audit',
};

const TYPE_TONE = {
  excel:    'bg-indigo-50 text-indigo-800 ring-indigo-100',
  '20-f':   'bg-amber-50 text-amber-800 ring-amber-100',
  prior:    'bg-emerald-50 text-emerald-800 ring-emerald-100',
  audit:    'bg-gray-50 text-gray-600 ring-gray-200',
};

/**
 * @param {{
 *   block: any | null,
 * }} props
 */
export function SourceAttributionPanel({ block }) {
  if (!block) {
    return (
      <aside className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs text-gray-400">
        Pick a block on the left to see its sources.
      </aside>
    );
  }

  const sources = Array.isArray(block.sources) ? block.sources : [];

  return (
    <aside className="space-y-3 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Source attribution
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-[#1e1b4b]" title={block.title}>
          {block.title || '(untitled)'}
        </p>
      </header>

      {block.is_locked && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
          <p className="font-bold">Edited (locked)</p>
          <p className="mt-0.5 text-amber-800">
            Re-generation will skip this block — its current content is
            preserved. Click <span className="font-mono">Unlock</span> in
            the toolbar to re-open it.
          </p>
        </div>
      )}

      {block.status === 'error' && block.error_message && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-900 ring-1 ring-red-100">
          <p className="font-bold">Last generation failed</p>
          <p className="mt-0.5">{block.error_message}</p>
        </div>
      )}

      {sources.length === 0 ? (
        <p className="text-xs italic text-gray-400">No sources recorded for this block.</p>
      ) : (
        <ul className="space-y-2">
          {sources.map((src, i) => (
            <SourceCard key={i} src={src} />
          ))}
        </ul>
      )}
    </aside>
  );
}

/** One row in the sources list. Shape varies by `type`. */
function SourceCard({ src }) {
  const type = String(src?.type || 'unknown');
  const label = TYPE_LABEL[type] || type;
  const tone = TYPE_TONE[type] || 'bg-gray-50 text-gray-700 ring-gray-200';

  // Pull the human-readable origin field; rest are detail rows
  const origin = src?.origin ?? '—';
  const detail = pickDetail(src);

  return (
    <li className={cn('rounded-lg p-3 ring-1', tone)}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-mono break-all">{origin}</p>
      {detail.length > 0 && (
        <dl className="mt-2 space-y-0.5 text-[11px]">
          {detail.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-current/70">{k}</dt>
              <dd className="text-current/90 font-medium tabular-nums">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

/** Return [key, value] pairs to render below the origin line, skipping
 *  fields already shown (type, origin). */
function pickDetail(src) {
  if (!src || typeof src !== 'object') return [];
  const skip = new Set(['type', 'origin']);
  const out = [];
  for (const [k, v] of Object.entries(src)) {
    if (skip.has(k)) continue;
    if (v == null) continue;
    // Audit objects can nest — render their leaves inline
    if (typeof v === 'object') {
      for (const [k2, v2] of Object.entries(v)) {
        if (v2 == null) continue;
        if (typeof v2 === 'object') continue;
        out.push([`${k}.${k2}`, v2]);
      }
      continue;
    }
    out.push([k, v]);
  }
  return out;
}

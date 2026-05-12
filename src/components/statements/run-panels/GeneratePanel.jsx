// GeneratePanel
// ==============
// Block-generation card. Renders one of three shapes based on
// ``generating`` + ``block_count``:
//
//   generating           → spinner ("Generating primary statements…")
//   blocks not yet built → CTA button "Generate primary statements"
//   blocks exist         → "Open block editor" + DOCX export + re-generate link
//
// The DOCX export action is its own component (ExportDocxLink) so the
// download UX is shared between this card and the editor page.

import { ExportDocxLink } from './ExportDocxLink';

/**
 * @param {{
 *   run: any,
 *   generating: boolean,
 *   generateError: string | null,
 *   onGenerate: () => void,
 *   onOpenEditor: () => void,
 * }} props
 */
export function GeneratePanel({ run, generating, generateError, onGenerate, onOpenEditor }) {
  const blockCount = run.block_count || 0;

  if (generating) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p className="font-bold text-brand-indigo">Generating primary statements…</p>
            <p className="text-sm text-gray-500">
              Building the five face-of-the-accounts blocks. Deterministic — no AI calls.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (blockCount === 0) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-brand-indigo">Generate primary statements</h2>
        <p className="mb-4 max-w-xl text-sm text-gray-500">
          Produce the five UK AFS primary statements (P&amp;L, OCI, Balance Sheet, Changes in Equity, Cash Flows) as editable blocks. Every numeric value is locked to a workbook reference; numbers can&apos;t be hallucinated by an AI.
        </p>
        {generateError && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-700">
            <p className="font-bold">Generation failed</p>
            <p>{generateError}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onGenerate}
          className="rounded-xl bg-gradient-to-r from-brand-gold to-brand-gold-dark px-5 py-2.5 text-sm font-bold text-brand-indigo-dark shadow-md hover:brightness-[1.02]"
        >
          Generate primary statements →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-brand-indigo">Primary statements</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{blockCount}</span> generated block{blockCount === 1 ? '' : 's'} — AI draft, accountant review required.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          className="flex-shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:underline"
        >
          Re-generate
        </button>
      </div>
      {generateError && (
        <div className="mb-3 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-700">
          <p className="font-bold">Last generation attempt failed</p>
          <p>{generateError}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenEditor}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-indigo-dark px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-indigo-hover"
        >
          Open block editor →
        </button>
        <ExportDocxLink runId={run.id} />
      </div>
    </div>
  );
}

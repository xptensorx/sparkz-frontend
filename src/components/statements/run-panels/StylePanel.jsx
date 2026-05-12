// StylePanel
// ===========
// Prior-year-AFS style-extraction summary. Two states:
//   - no style yet     → friendly explainer (no prior-year uploaded, or
//                        LLM key missing, or extraction failed validation)
//   - style extracted  → counts of section_order / terminology / tone

/**
 * @param {{ summary: {
 *   source_file: string | null,
 *   prompt_version: string | null,
 *   has_style: boolean,
 *   section_order_count: number,
 *   terminology_count: number,
 *   tone_observations_count: number,
 *   warnings_count: number,
 * } }} props
 */
export function StylePanel({ summary }) {
  if (!summary.has_style) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-brand-indigo">House style</h2>
        <p className="max-w-xl text-sm text-gray-500">
          No house-style guide has been extracted yet. Upload last year&apos;s final AFS as a prior-year document, then re-ingest, to capture this firm&apos;s section order, terminology, narrative tone and table conventions for the generator to reuse.
        </p>
        {summary.warnings_count > 0 && (
          <p className="mt-3 text-xs text-amber-700">
            {summary.warnings_count} warning{summary.warnings_count === 1 ? '' : 's'} recorded during the attempt.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-brand-indigo">House style</h2>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            Source: <span className="font-semibold text-gray-700">{summary.source_file || '—'}</span>
          </p>
        </div>
        {summary.prompt_version && (
          <span className="inline-flex flex-shrink-0 items-center rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-600">
            {summary.prompt_version}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sections</p>
          <p className="mt-1 text-2xl font-black text-brand-indigo">{summary.section_order_count}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">in document order</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Terminology</p>
          <p className="mt-1 text-2xl font-black text-brand-indigo">{summary.terminology_count}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">firm-specific terms</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tone notes</p>
          <p className="mt-1 text-2xl font-black text-brand-indigo">{summary.tone_observations_count}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Warnings</p>
          <p className="mt-1 text-2xl font-black text-brand-indigo">{summary.warnings_count}</p>
        </div>
      </div>
    </div>
  );
}

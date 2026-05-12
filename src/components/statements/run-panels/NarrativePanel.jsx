// NarrativePanel
// ===============
// 20-F narrative-ingest summary. Two states:
//   - no source detected     → friendly explainer + warnings
//   - source found + items   → tiles + UK-section chips

/**
 * @param {{ summary: {
 *   source_file: string | null,
 *   items_extracted: number,
 *   items_skipped: number,
 *   uk_sections_covered: string[],
 *   warnings_count: number,
 * } }} props
 */
export function NarrativePanel({ summary }) {
  const found = !!summary.source_file;

  if (!found) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-brand-indigo">20-F narrative</h2>
        <p className="max-w-xl text-sm text-gray-500">
          No 20-F-style narrative source was found among the uploaded context documents. Upload a US 20-F filing as a context document to enable Strategic Report / Directors&apos; Report narrative generation.
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
      <div className="mb-4">
        <h2 className="text-sm font-bold text-brand-indigo">20-F narrative</h2>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          Source: <span className="font-semibold text-gray-700">{summary.source_file}</span>
        </p>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Items extracted</p>
          <p className="mt-1 text-2xl font-black text-brand-indigo">{summary.items_extracted}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Items skipped</p>
          <p className="mt-1 text-2xl font-black text-brand-indigo">{summary.items_skipped}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">SEC-only / replaced by workbook</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">UK sections covered</p>
          <p className="mt-1 text-2xl font-black text-brand-indigo">{summary.uk_sections_covered.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Warnings</p>
          <p className="mt-1 text-2xl font-black text-brand-indigo">{summary.warnings_count}</p>
        </div>
      </div>
      {summary.uk_sections_covered.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.uk_sections_covered.map((section) => (
            <span
              key={section}
              className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
            >
              {section.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

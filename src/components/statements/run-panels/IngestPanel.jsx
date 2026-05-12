// IngestPanel
// ============
// State-driven UI for the workbook-ingest step. Renders one of four
// shapes depending on ``run.status``:
//
//   pending  + not in flight  → CTA button "Ingest workbook"
//   ingesting (in flight)     → spinner
//   error                     → error message + retry button
//   ready / beyond + summary  → parsed-workbook stats tiles
//
// The dispatch is owned by the parent page; this component is pure
// presentation + button wiring.

/**
 * @param {{
 *   run: any,
 *   ingesting: boolean,
 *   ingestError: string | null,
 *   onIngest: () => void,
 * }} props
 */
export function IngestPanel({ run, ingesting, ingestError, onIngest }) {
  const status = run.status;
  const summary = run.parsed_summary;

  // Pending — prompt the user to start ingestion
  if (status === 'pending' && !ingesting) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-brand-indigo">Ingest workbook</h2>
        <p className="mb-4 max-w-xl text-sm text-gray-500">
          Parse the uploaded Excel into structured accounts (primary statements, notes,
          basis of presentation). Deterministic — no AI calls, no cost. Typically
          completes in under 30 seconds.
        </p>
        {ingestError && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-700">
            <p className="font-bold">Ingest failed</p>
            <p>{ingestError}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onIngest}
          className="rounded-xl bg-gradient-to-r from-brand-gold to-brand-gold-dark px-5 py-2.5 text-sm font-bold text-brand-indigo-dark shadow-md hover:brightness-[1.02]"
        >
          Ingest workbook →
        </button>
      </div>
    );
  }

  if (ingesting || status === 'ingesting') {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p className="font-bold text-brand-indigo">Parsing workbook…</p>
            <p className="text-sm text-gray-500">
              Extracting primary statements, notes, and basis of presentation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 shadow-md ring-1 ring-red-100/80">
        <p className="font-bold text-red-800">Ingest failed</p>
        <p className="mt-2 text-sm leading-relaxed text-red-700/90">
          {run.error_message || 'The workbook could not be parsed. Check the file format and try again.'}
        </p>
        <button
          type="button"
          onClick={onIngest}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-indigo-dark px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-indigo-hover"
        >
          Retry ingest
        </button>
      </div>
    );
  }

  if (summary) {
    const tiles = [
      { label: 'Primary statements', value: summary.primary_statement_count },
      { label: 'Notes',               value: summary.notes_count },
      { label: 'Basis triples',       value: summary.basis_triples_count },
      { label: 'Currency',            value: summary.currency_detected || '—' },
      { label: 'Warnings',            value: summary.warnings_count },
      { label: 'Skipped sheets',      value: summary.skipped_sheets_count },
    ];
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-brand-indigo">Parsed workbook</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Deterministic extraction of accounts, notes, and basis-of-presentation triples.
            </p>
          </div>
          <button
            type="button"
            onClick={onIngest}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 hover:underline"
          >
            Re-ingest
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t.label}</p>
              <p className="mt-1 text-2xl font-black text-brand-indigo">{t.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/40 p-6 text-center">
      <p className="text-sm text-gray-500">
        Run is in state <code className="rounded bg-gray-100 px-1 text-xs">{status}</code>. No action available yet.
      </p>
    </div>
  );
}

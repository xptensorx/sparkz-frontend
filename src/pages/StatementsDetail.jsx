import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import SidebarLayout from '../components/SidebarLayout';
import { sparkzApi } from '../components/services/sparkzApi';
import { useAuth } from '@/lib/AuthContext';

const STATUS_TONE = {
  pending:    'bg-gray-100 text-gray-600 border-gray-200',
  ingesting:  'bg-blue-50 text-blue-700 border-blue-100',
  ready:      'bg-amber-50 text-amber-700 border-amber-100',
  generating: 'bg-violet-50 text-violet-700 border-violet-100',
  complete:   'bg-emerald-50 text-emerald-700 border-emerald-100',
  error:      'bg-red-50 text-red-700 border-red-100',
};

const FRAMEWORK_LABEL = {
  frs102: 'FRS 102 Section 1A',
  frs105: 'FRS 105',
  ifrs:   'IFRS',
};

function formatDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return String(s); }
}

function MetaRow({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b border-gray-50 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="col-span-2 text-sm text-gray-800">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

function FileChip({ name, kind }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">{name}</p>
        <p className="text-xs text-gray-400">{kind}</p>
      </div>
    </div>
  );
}

export default function StatementsDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [run, setRun] = useState(/** @type {any} */(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */(null));
  const [deleting, setDeleting] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(/** @type {string | null} */(null));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await sparkzApi.getStatement(runId);
        if (cancelled) return;
        setRun(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
          logout();
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message || 'Failed to load engagement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [runId, logout, navigate]);

  const handleGenerate = async () => {
    if (!runId) return;  // route guarantees this, but TypeScript needs the guard
    setGenerating(true);
    setGenerateError(null);
    try {
      const updated = await sparkzApi.generateStatement(runId);
      setRun(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate primary statements';
      if (message === 'SESSION_EXPIRED') {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setGenerateError(message);
      try {
        const refreshed = await sparkzApi.getStatement(runId);
        setRun(refreshed);
      } catch { /* ignore */ }
    } finally {
      setGenerating(false);
    }
  };

  const handleIngest = async () => {
    setIngesting(true);
    setIngestError(null);
    try {
      const updated = await sparkzApi.ingestStatement(runId);
      setRun(updated);
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setIngestError(err.message || 'Failed to ingest workbook');
      // Refresh the run record so we see status=error + error_message from the server
      try {
        const refreshed = await sparkzApi.getStatement(runId);
        setRun(refreshed);
      } catch { /* ignore */ }
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete engagement "${run?.engagement_name}"? This removes all uploaded files.`)) return;
    setDeleting(true);
    try {
      await sparkzApi.deleteStatement(runId);
      navigate('/statements', { replace: true });
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message || 'Failed to delete engagement');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout activePage="Statements">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="inline-flex items-center gap-2 text-sm text-gray-400">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading engagement…
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (error) {
    return (
      <SidebarLayout activePage="Statements">
        <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 shadow-md ring-1 ring-red-100/80">
          <p className="font-bold text-red-800">Couldn&apos;t load this engagement</p>
          <p className="text-red-700/90 text-sm mt-2">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/statements')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#16133a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#25216b]"
          >
            Back to engagements
          </button>
        </div>
      </SidebarLayout>
    );
  }

  if (!run) return null;

  const tone = STATUS_TONE[run.status] || STATUS_TONE.pending;
  const fwLabel = FRAMEWORK_LABEL[run.framework] || run.framework.toUpperCase();
  const contextNames = run.context_filenames || [];

  return (
    <SidebarLayout activePage="Statements">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate('/statements')}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              ← All engagements
            </button>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#1e1b4b] sm:text-3xl">
              {run.engagement_name}
            </h1>
            {run.entity_name && (
              <p className="mt-1 text-sm text-gray-500">{run.entity_name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${tone}`}>
              {run.status}
            </span>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-[#1e1b4b]">Engagement details</h2>
          <dl>
            <MetaRow label="Framework" value={fwLabel} />
            <MetaRow label="Entity type" value={run.entity_type === 'single' ? 'Single entity' : run.entity_type} />
            <MetaRow label="Currency" value={run.currency} />
            <MetaRow label="Reporting period" value={run.reporting_period} />
            <MetaRow label="Prior period" value={run.prior_period} />
            <MetaRow label="Created" value={formatDate(run.created_at)} />
            <MetaRow label="Updated" value={formatDate(run.updated_at)} />
            <MetaRow label="Blocks generated" value={run.block_count} />
          </dl>
          {run.error_message && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-700">
              <p className="font-bold">Last error</p>
              <p>{run.error_message}</p>
            </div>
          )}
        </div>

        {/* Files */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-[#1e1b4b]">Uploaded files</h2>
          <div className="space-y-3">
            {run.excel_filename && (
              <FileChip name={run.excel_filename} kind="Mapped Excel" />
            )}
            {run.prior_year_filename && (
              <FileChip name={run.prior_year_filename} kind="Prior-year statements" />
            )}
            {contextNames.map((name, idx) => (
              <FileChip key={idx} name={name} kind={`Context document ${idx + 1}`} />
            ))}
            {!run.excel_filename && contextNames.length === 0 && !run.prior_year_filename && (
              <p className="text-sm text-gray-400">No files attached.</p>
            )}
          </div>
        </div>

        {/* Ingest panel — state-aware: pending → button, ingesting → spinner, ready → summary, error → message */}
        <IngestPanel
          run={run}
          ingesting={ingesting}
          ingestError={ingestError}
          onIngest={handleIngest}
        />

        {/* Narrative panel — only shown once the run has been ingested */}
        {run.narrative_summary && <NarrativePanel summary={run.narrative_summary} />}

        {/* Style panel — only shown once a style-extraction attempt has been recorded */}
        {run.style_summary && <StylePanel summary={run.style_summary} />}

        {/* Generate panel — shown after a successful ingest (parsed_summary present) */}
        {run.parsed_summary && (
          <GeneratePanel
            run={run}
            generating={generating}
            generateError={generateError}
            onGenerate={handleGenerate}
            onOpenEditor={() => navigate(`/statements/${run.id}/editor`)}
          />
        )}
      </div>
    </SidebarLayout>
  );
}


/**
 * Generation panel — shown once the workbook has been ingested.
 *
 * States:
 *   - generating (in flight)                    → spinner
 *   - block_count > 0 and not generating        → block-count summary + "Re-generate" button
 *   - block_count === 0 and ingest succeeded    → "Generate primary statements" CTA
 *   - generateError                              → error message + retry
 *
 * @param {{
 *   run: any,
 *   generating: boolean,
 *   generateError: string | null,
 *   onGenerate: () => void,
 *   onOpenEditor: () => void
 * }} props
 */
function GeneratePanel({ run, generating, generateError, onGenerate, onOpenEditor }) {
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
            <p className="font-bold text-[#1e1b4b]">Generating primary statements…</p>
            <p className="text-sm text-gray-500">Building the five face-of-the-accounts blocks. Deterministic — no AI calls.</p>
          </div>
        </div>
      </div>
    );
  }

  if (blockCount === 0) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-[#1e1b4b]">Generate primary statements</h2>
        <p className="mb-4 text-sm text-gray-500 max-w-xl">
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
          className="rounded-xl bg-gradient-to-r from-[#e6c33a] to-[#d4af2f] px-5 py-2.5 text-sm font-bold text-[#16133a] shadow-md hover:brightness-[1.02]"
        >
          Generate primary statements →
        </button>
      </div>
    );
  }

  // block_count > 0
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#1e1b4b]">Primary statements</h2>
          <p className="text-xs text-gray-500 mt-0.5">
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
          className="inline-flex items-center gap-2 rounded-xl bg-[#16133a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#25216b]"
        >
          Open block editor →
        </button>
        <ExportDocxLink runId={run.id} />
      </div>
    </div>
  );
}


/**
 * House-style summary — shown after ingest when the prior-year AFS was
 * processed (or attempted). Renders two states:
 *  - style extracted → counts of section_order / terminology / tone observations
 *  - no style yet    → friendly explainer (no prior-year uploaded, or LLM key
 *                      missing, or extraction failed validation)
 *
 * The full style guide JSON lives on StatementRun.style_guide — this panel
 * only shows summary counts so the detail-page response stays compact.
 *
 * @param {{summary: {
 *   source_file: string | null,
 *   prompt_version: string | null,
 *   has_style: boolean,
 *   section_order_count: number,
 *   terminology_count: number,
 *   tone_observations_count: number,
 *   warnings_count: number,
 * }}} props
 */
function StylePanel({ summary }) {
  if (!summary.has_style) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-[#1e1b4b]">House style</h2>
        <p className="text-sm text-gray-500 max-w-xl">
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
          <h2 className="text-sm font-bold text-[#1e1b4b]">House style</h2>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            Source: <span className="font-semibold text-gray-700">{summary.source_file || '—'}</span>
          </p>
        </div>
        {summary.prompt_version && (
          <span className="flex-shrink-0 inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] font-mono font-semibold">
            {summary.prompt_version}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sections</p>
          <p className="mt-1 text-2xl font-black text-[#1e1b4b]">{summary.section_order_count}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">in document order</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Terminology</p>
          <p className="mt-1 text-2xl font-black text-[#1e1b4b]">{summary.terminology_count}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">firm-specific terms</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tone notes</p>
          <p className="mt-1 text-2xl font-black text-[#1e1b4b]">{summary.tone_observations_count}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Warnings</p>
          <p className="mt-1 text-2xl font-black text-[#1e1b4b]">{summary.warnings_count}</p>
        </div>
      </div>
    </div>
  );
}


/**
 * Narrative-extract summary — shown after ingest when a 20-F-style source
 * was processed (or attempted). Renders three states:
 *  - source found    → counts + UK sections covered
 *  - no source       → friendly explainer + warnings
 */
function NarrativePanel({ summary }) {
  const found = !!summary.source_file;

  if (!found) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-[#1e1b4b]">20-F narrative</h2>
        <p className="text-sm text-gray-500 max-w-xl">
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
        <h2 className="text-sm font-bold text-[#1e1b4b]">20-F narrative</h2>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          Source: <span className="font-semibold text-gray-700">{summary.source_file}</span>
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Items extracted</p>
          <p className="mt-1 text-2xl font-black text-[#1e1b4b]">{summary.items_extracted}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Items skipped</p>
          <p className="mt-1 text-2xl font-black text-[#1e1b4b]">{summary.items_skipped}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">SEC-only / replaced by workbook</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">UK sections covered</p>
          <p className="mt-1 text-2xl font-black text-[#1e1b4b]">{summary.uk_sections_covered.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Warnings</p>
          <p className="mt-1 text-2xl font-black text-[#1e1b4b]">{summary.warnings_count}</p>
        </div>
      </div>
      {summary.uk_sections_covered.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.uk_sections_covered.map((section) => (
            <span
              key={section}
              className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-semibold"
            >
              {section.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


/** State-aware ingest UI block. Renders different content per run.status. */
function IngestPanel({ run, ingesting, ingestError, onIngest }) {
  const status = run.status;
  const summary = run.parsed_summary;

  // Pending: prompt the user to start ingestion
  if (status === 'pending' && !ingesting) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-[#1e1b4b]">Ingest workbook</h2>
        <p className="mb-4 text-sm text-gray-500 max-w-xl">
          Parse the uploaded Excel into structured accounts (primary statements, notes, basis of presentation). Deterministic — no AI calls, no cost. Typically completes in under 30 seconds.
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
          className="rounded-xl bg-gradient-to-r from-[#e6c33a] to-[#d4af2f] px-5 py-2.5 text-sm font-bold text-[#16133a] shadow-md hover:brightness-[1.02]"
        >
          Ingest workbook →
        </button>
      </div>
    );
  }

  // Ingesting: spinner
  if (ingesting || status === 'ingesting') {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p className="font-bold text-[#1e1b4b]">Parsing workbook…</p>
            <p className="text-sm text-gray-500">Extracting primary statements, notes, and basis of presentation.</p>
          </div>
        </div>
      </div>
    );
  }

  // Error: show error_message + retry
  if (status === 'error') {
    return (
      <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 shadow-md ring-1 ring-red-100/80">
        <p className="font-bold text-red-800">Ingest failed</p>
        <p className="mt-2 text-sm text-red-700/90 leading-relaxed">
          {run.error_message || 'The workbook could not be parsed. Check the file format and try again.'}
        </p>
        <button
          type="button"
          onClick={onIngest}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#16133a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#25216b]"
        >
          Retry ingest
        </button>
      </div>
    );
  }

  // Ready (or beyond): show the parsed summary
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
            <h2 className="text-sm font-bold text-[#1e1b4b]">Parsed workbook</h2>
            <p className="text-xs text-gray-500 mt-0.5">Deterministic extraction of accounts, notes, and basis-of-presentation triples.</p>
          </div>
          <button
            type="button"
            onClick={onIngest}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 hover:underline"
          >
            Re-ingest
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t.label}</p>
              <p className="mt-1 text-2xl font-black text-[#1e1b4b]">{t.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback for unexpected status values
  return (
    <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/40 p-6 text-center">
      <p className="text-sm text-gray-500">Run is in state <code className="rounded bg-gray-100 px-1 text-xs">{status}</code>. No action available yet.</p>
    </div>
  );
}


/**
 * Secondary action that downloads the run's generated DOCX. Reuses the
 * sparkzApi helper, so the JWT travels in the auth header (not the URL)
 * and the filename comes from the server's Content-Disposition.
 *
 * @param {{ runId: string }} props
 */
function ExportDocxLink({ runId }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */(null));
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleClick = async () => {
    setPending(true);
    setError(null);
    try {
      await sparkzApi.downloadStatementDocx(runId);
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to export DOCX');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-[#16133a] hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {pending ? 'Building…' : 'Export DOCX'}
      </button>
      {error && <span className="text-xs text-red-700" title={error}>{error}</span>}
    </div>
  );
}

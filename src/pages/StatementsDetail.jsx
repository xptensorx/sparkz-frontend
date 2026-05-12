import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { sparkzApi } from '../components/services/sparkzApi';
import { useAuth } from '@/lib/AuthContext';
import { GeneratePanel } from '@/components/statements/run-panels/GeneratePanel';
import { IngestPanel } from '@/components/statements/run-panels/IngestPanel';
import { NarrativePanel } from '@/components/statements/run-panels/NarrativePanel';
import { StylePanel } from '@/components/statements/run-panels/StylePanel';

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

// Statuses where the backend is still doing work. While the run is in one
// of these we poll for updates; once it leaves, polling stops.
const TRANSITIONAL_STATUSES = new Set(['ingesting', 'generating']);
const POLL_INTERVAL_MS = 2000;

export default function StatementsDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [run, setRun] = useState(/** @type {any} */(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */(null));
  const [deleting, setDeleting] = useState(false);
  // Last failure of the dispatch HTTP call itself (network / 4xx). The
  // backend's own error (in run.error_message) is shown separately when
  // run.status === 'error'.
  const [ingestError, setIngestError] = useState(/** @type {string | null} */(null));
  const [generateError, setGenerateError] = useState(/** @type {string | null} */(null));
  // True between the click and the 202 response. Without this, the user
  // sees no feedback during the dispatch round-trip — the button stays
  // enabled until the response sets run.status, which can be 200-500ms.
  const [dispatchingIngest, setDispatchingIngest] = useState(false);
  const [dispatchingGenerate, setDispatchingGenerate] = useState(false);

  // ── Single source of truth: the server's status field on the run. ──
  // ``ingesting`` / ``generating`` are derived from it. ``dispatching*``
  // covers the small click→202 window so the UI never has a "did my
  // click register?" gap.
  const ingesting = dispatchingIngest || run?.status === 'ingesting';
  const generating = dispatchingGenerate || run?.status === 'generating';

  // Initial load (once)
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

  // Poll while the backend is still working. Stops automatically when
  // status becomes terminal (ready / complete / error). This is the
  // cure for "frontend stuck on 'working' while backend has finished":
  // the server is the only source of state, and we converge to it on
  // every tick.
  useEffect(() => {
    if (!runId || !run) return undefined;
    if (!TRANSITIONAL_STATUSES.has(run.status)) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const fresh = await sparkzApi.getStatement(runId);
        if (cancelled) return;
        setRun(fresh);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
          logout();
          navigate('/login', { replace: true });
        }
        // Transient network failures during polling are non-fatal — the
        // next tick will retry. Don't clobber the UI on every blip.
      }
    };
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [runId, run?.status, logout, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!runId) return;
    setGenerateError(null);
    setDispatchingGenerate(true);
    try {
      const accepted = await sparkzApi.generateStatement(runId);
      setRun(accepted); // status now 'generating'; polling effect takes over
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start generation';
      if (message === 'SESSION_EXPIRED') {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setGenerateError(message);
      // Re-read so the UI reflects whatever state the server is in
      try { setRun(await sparkzApi.getStatement(runId)); } catch { /* ignore */ }
    } finally {
      setDispatchingGenerate(false);
    }
  };

  const handleIngest = async () => {
    if (!runId) return;
    setIngestError(null);
    setDispatchingIngest(true);
    try {
      const accepted = await sparkzApi.ingestStatement(runId);
      setRun(accepted); // status now 'ingesting'; polling effect takes over
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setIngestError(err.message || 'Failed to start ingest');
      try { setRun(await sparkzApi.getStatement(runId)); } catch { /* ignore */ }
    } finally {
      setDispatchingIngest(false);
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
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-indigo-dark px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-indigo-hover"
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
            <h1 className="mt-1 text-2xl font-black tracking-tight text-brand-indigo sm:text-3xl">
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
          <h2 className="mb-3 text-sm font-bold text-brand-indigo">Engagement details</h2>
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
          <h2 className="mb-3 text-sm font-bold text-brand-indigo">Uploaded files</h2>
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

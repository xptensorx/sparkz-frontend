import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  frs102: 'FRS 102 (1A)',
  frs105: 'FRS 105',
  ifrs:   'IFRS',
};

function formatDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return String(s); }
}

export default function Statements() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const refresh = async () => {
    setError(null);
    try {
      const data = await sparkzApi.listStatements();
      setRuns(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message || 'Failed to load engagements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);  // intentional: refresh closes over `logout`/`navigate` from useAuth/useNavigate, both stable

  // Stale-data avoidance: re-fetch when the tab regains focus AND poll while
  // any run is in a transitional state (ingest/generate in flight on the
  // detail page). Without this the list keeps showing 'ingesting' / 'generating'
  // long after the backend finished, until the user manually reloads.
  useEffect(() => {
    const onFocus = () => { refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const transitional = runs.some((r) =>
      ['ingesting', 'generating', 'processing'].includes(r.status),
    );
    if (!transitional) return undefined;
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
  }, [runs]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (runId, name) => {
    if (!confirm(`Delete engagement "${name}"? This removes all uploaded files.`)) return;
    setDeletingId(runId);
    try {
      await sparkzApi.deleteStatement(runId);
      setRuns((prev) => prev.filter((r) => r.id !== runId));
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message || 'Failed to delete engagement');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SidebarLayout activePage="Statements">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-brand-indigo sm:text-3xl">
            Statements
          </h1>
          <p className="mt-1 text-sm text-gray-400 sm:text-base">
            Generate UK financial statements from a mapped Excel and supporting context.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/statements/new')}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-indigo px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#2d2a6e]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          New engagement
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!loading && runs.length === 0 && !error && (
        <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-indigo-50/50 to-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-indigo">
            <svg className="h-8 w-8 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-black text-brand-indigo">No engagements yet</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Upload a mapped Excel, add a prior-year PDF and any context documents, and Sparkz will draft a complete set of UK statements.
          </p>
          <button
            type="button"
            onClick={() => navigate('/statements/new')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-indigo hover:bg-[#d4b034] transition-colors"
          >
            Start an engagement →
          </button>
        </div>
      )}

      {runs.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-[#f6f6f8]">
                  {['Engagement', 'Framework', 'Period', 'Status', 'Created', ''].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 sm:px-6"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const tone = STATUS_TONE[r.status] || STATUS_TONE.pending;
                  const fwLabel = FRAMEWORK_LABEL[r.framework] || r.framework.toUpperCase();
                  return (
                    <tr key={r.id} className="border-t border-gray-50 transition-colors hover:bg-[#f6f6f8]/50">
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="font-semibold text-brand-indigo truncate max-w-[260px]">
                          {r.engagement_name}
                        </div>
                        {r.entity_name && (
                          <div className="text-xs text-gray-400 truncate max-w-[260px]">{r.entity_name}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold uppercase text-gray-700">
                          {fwLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">
                        {r.reporting_period || '—'}
                        {r.prior_period && (
                          <span className="text-gray-400"> · prior {r.prior_period}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 sm:px-6 sm:py-4">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/statements/${r.id}`)}
                          className="text-sm font-semibold text-brand-indigo hover:underline"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r.id, r.engagement_name)}
                          className="ml-4 text-sm font-semibold text-red-500 hover:underline disabled:opacity-50"
                        >
                          {deletingId === r.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && runs.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="inline-flex items-center gap-2 text-sm text-gray-400">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading engagements…
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

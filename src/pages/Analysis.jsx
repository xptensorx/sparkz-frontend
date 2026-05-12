import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApiHealthBanner from '../components/ApiHealthBanner';
import AnalysisForm from '../components/analysis/AnalysisForm';
import AnalysisSummary from '../components/analysis/AnalysisSummary';
import AnalysisResults from '../components/analysis/AnalysisResults';
import SidebarLayout from '../components/SidebarLayout';
import { sparkzApi } from '../components/services/sparkzApi';
import { useAuth } from '@/lib/AuthContext';

/**
 * @typedef {{ stage: string, detail: string, pct: number }} ProgressState
 * @typedef {{ run_id: string, filename: string, items?: any[], status?: string, error_message?: string, live_progress?: ProgressState }} AnalysisResult
 */

/** @type {Record<string, number>} */
const STAGE_STEPS = {
  starting: -1,
  pending: -0.5,
  extract: 0,
  redact: 1,
  normalize: 2,
  scope: 2.5,
  assess: 3,
  review: 4,
  complete: 5,
};

const STEP_LABELS = [
  'Parsing PDF',
  'Removing PII',
  'Normalizing text',
  'AI Assessment',
  'AI Review',
  'Complete',
];

const STALL_THRESHOLD_S = 45;

/**
 * @param {number} seconds
 */
function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * @param {string | undefined} detail
 */
function parseItemProgress(detail) {
  const m = detail?.match(/(?:Assessed|Reviewed)\s+(\d+)\/(\d+)\s+items/i);
  return m ? { done: parseInt(m[1], 10), total: parseInt(m[2], 10) } : null;
}

/**
 * Single-writer rule for pipeline %: never accept a *lower* pct than we already show (stale HTTP
 * responses, overlapping polls, or old EventSource chunks). Stops 25% ↔ 0% stress.
 *
 * @param {import('react').Dispatch<import('react').SetStateAction<ProgressState | null>>} setProgress
 * @param {import('react').MutableRefObject<ProgressState | null>} progressRef
 * @param {ProgressState} next
 */
function applyMonotonicPipelineProgress(setProgress, progressRef, next) {
  if (!next || typeof next.pct !== 'number' || !next.stage) return;
  setProgress((prev) => {
    if (next.stage === 'error' || next.stage === 'complete') {
      progressRef.current = next;
      return next;
    }
    if (!prev) {
      progressRef.current = next;
      return next;
    }
    if (next.pct < prev.pct) {
      return prev;
    }
    progressRef.current = next;
    return next;
  });
}

export default function Analysis() {
  const { runId: paramRunId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] =
    /** @type {[string | null, import('react').Dispatch<import('react').SetStateAction<string | null>>]} */ (
      useState(null)
    );
  const [progress, setProgress] =
    /** @type {[ProgressState | null, import('react').Dispatch<import('react').SetStateAction<ProgressState | null>>]} */ (
      useState(null)
    );
  const [result, setResult] =
    /** @type {[AnalysisResult | null, import('react').Dispatch<import('react').SetStateAction<AnalysisResult | null>>]} */ (
      useState(null)
    );
  const [error, setError] =
    /** @type {[string | null, import('react').Dispatch<import('react').SetStateAction<string | null>>]} */ (
      useState(null)
    );
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stalledFor, setStalledFor] = useState(0);
  /** @type {import('react').MutableRefObject<number | null>} */
  const lastProgressAt = useRef(null);
  const stallWarnedRef = useRef(false);
  /** @type {import('react').MutableRefObject<ProgressState | null>} */
  const progressRef = useRef(null);
  const runFinishedRef = useRef(false);

  useEffect(() => {
    runFinishedRef.current = false;
  }, [runId]);

  useEffect(() => {
    sparkzApi.health().catch(() => {});
  }, []);

  useEffect(() => {
    if (!paramRunId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await sparkzApi.getResults(paramRunId);
        if (cancelled) return;
        if (data.status === 'complete') {
          setResult(data);
          setLoading(false);
          setRunId(null);
          setError(null);
        } else if (data.status === 'error') {
          setError(data.error_message || 'Analysis failed.');
          setLoading(false);
          setRunId(null);
        } else {
          setRunId(paramRunId);
          setLoading(true);
          setResult(null);
          setError(null);
          // Progress comes only from GET /api/results polling (live_progress). Never setProgress here.
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
            runFinishedRef.current = true;
            logout();
            setLoading(false);
            setRunId(null);
            setProgress(null);
            navigate('/login', { replace: true });
            return;
          }
          setError(err instanceof Error ? err.message : 'Could not load analysis');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [paramRunId, logout, navigate]);

  useEffect(() => {
    if (!loading) {
      setElapsedTime(0);
      setStalledFor(0);
      stallWarnedRef.current = false;
      return;
    }
    const startedAt = Date.now();
    lastProgressAt.current = startedAt;
    const id = setInterval(() => {
      const now = Date.now();
      setElapsedTime(Math.floor((now - startedAt) / 1000));
      const stalled = Math.floor((now - (lastProgressAt.current ?? now)) / 1000);
      setStalledFor(stalled);
      if (stalled >= STALL_THRESHOLD_S && !stallWarnedRef.current) {
        stallWarnedRef.current = true;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [loading]);

  /** Poll processing runs via GET /api/results (live_progress). Single source of truth — no EventSource. */
  useEffect(() => {
    if (!runId || !loading || result) return undefined;
    const rid = runId;
    let cancelled = false;

    async function tick() {
      try {
        if (cancelled || runFinishedRef.current) return;
        const data = await sparkzApi.getResults(rid);
        if (cancelled || runFinishedRef.current) return;

        if (data.status === 'complete') {
          runFinishedRef.current = true;
          setResult(data);
          setLoading(false);
          return;
        }
        if (data.status === 'error') {
          runFinishedRef.current = true;
          setError(data.error_message || 'Analysis failed.');
          setLoading(false);
          return;
        }

        lastProgressAt.current = Date.now();
        const lp = data.live_progress;
        if (lp && typeof lp.pct === 'number' && lp.stage) {
          setStalledFor(0);
          stallWarnedRef.current = false;
          applyMonotonicPipelineProgress(setProgress, progressRef, {
            stage: lp.stage,
            detail: lp.detail ?? '',
            pct: lp.pct,
          });
        }
      } catch (err) {
        if (cancelled || runFinishedRef.current) return;
        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
          runFinishedRef.current = true;
          logout();
          setLoading(false);
          setRunId(null);
          setProgress(null);
          navigate('/login', { replace: true });
        }
      }
    }

    tick();
    const intervalId = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [runId, loading, result, logout, navigate]);

  const handleAnalysisStarting = () => {
    setError(null);
    const p = {
      stage: 'starting',
      detail: 'Uploading your PDF and contacting the analysis server…',
      pct: 0,
    };
    progressRef.current = p;
    setProgress(p);
  };

  /**
   * @param {string} id
   */
  const handleRunStarted = (id) => {
    setRunId(id);
    setResult(null);
    setError(null);
    const p = { stage: 'extract', detail: 'Starting…', pct: 0 };
    progressRef.current = p;
    setProgress(p);
    navigate(`/analysis/${id}`, { replace: true });
  };

  const handleReset = () => {
    setRunId(null);
    setResult(null);
    setError(null);
    setProgress(null);
    setLoading(false);
    navigate('/analysis', { replace: true });
  };

  const currentStepIndex = progress ? (STAGE_STEPS[progress.stage] ?? 0) : -1;

  return (
    <SidebarLayout activePage="Analysis">
      <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
        <ApiHealthBanner />

        {!result && !loading && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-indigo-dark via-brand-indigo to-[#312e81] px-5 py-8 text-white shadow-xl shadow-indigo-950/30 ring-1 ring-white/10 sm:rounded-3xl sm:px-8 sm:py-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-gold/15 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-200/90">Checklist engine</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Run a disclosure analysis
              </h2>
              <p className="mt-3 text-sm sm:text-base text-violet-100/85 max-w-xl leading-relaxed">
                Upload your statutory accounts as a PDF, pick FRS 102 or FRS 105, and let the pipeline extract text,
                redact sensitive fields, and assess every checklist row.
              </p>
            </div>
          </div>
        )}

        {loading && runId && progress === null && !result && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50 ring-1 ring-black/[0.04] sm:rounded-3xl sm:p-8">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
                <svg className="h-6 w-6 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-indigo-dark">Loading analysis</p>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                  Fetching run status from the server… Progress will appear within a few seconds.
                </p>
                <p className="text-xs text-gray-500 mt-3 tabular-nums font-medium">Elapsed {formatElapsed(elapsedTime)}</p>
              </div>
            </div>
          </div>
        )}

        {loading && progress?.stage === 'starting' && !result && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50 ring-1 ring-black/[0.04] sm:rounded-3xl sm:p-8">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
                <svg className="h-6 w-6 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-indigo-dark">Starting analysis</p>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{progress.detail}</p>
                <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                  On free cloud tiers the API can take <strong className="text-gray-600">30–60 seconds</strong> to wake
                  after idle. This page updates as soon as the server responds.
                </p>
                <p className="text-xs text-gray-500 mt-3 tabular-nums font-medium">Elapsed {formatElapsed(elapsedTime)}</p>
              </div>
            </div>
          </div>
        )}

        {loading && progress && progress.stage !== 'starting' && !result && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50 ring-1 ring-black/[0.04] sm:rounded-3xl sm:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pipeline</p>
                <p className="font-bold text-brand-indigo-dark text-lg mt-0.5">Analysis in progress</p>
              </div>
              <div className="flex flex-row items-center justify-between gap-3 sm:block sm:text-right">
                <span className="text-xs tabular-nums text-gray-400 sm:block">{formatElapsed(elapsedTime)}</span>
                <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  {progress.pct}%
                </span>
              </div>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-4 ring-1 ring-black/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-400 transition-all duration-500 ease-out"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mb-6">{progress.detail}</p>

            {stalledFor >= STALL_THRESHOLD_S && (
              <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
                {progress.stage === 'assess' && 'AI assessment can take 1–2 minutes on large checklists — still running.'}
                {progress.stage === 'review' && 'AI review is working through items — please wait.'}
                {!['assess', 'review'].includes(progress.stage) &&
                  'No update for a while — large documents can take several minutes. Still processing.'}
              </div>
            )}

            <div className="space-y-2">
              {STEP_LABELS.map((label, i) => {
                const status = i < currentStepIndex ? 'done' : i === currentStepIndex ? 'active' : 'waiting';
                const itemProgress = status === 'active' ? parseItemProgress(progress.detail) : null;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-colors ${
                      status === 'done'
                        ? 'bg-emerald-50/90 text-emerald-800 border border-emerald-100'
                        : status === 'active'
                          ? 'bg-indigo-50 border border-indigo-100 text-indigo-900 shadow-sm'
                          : 'bg-gray-50/80 text-gray-400 border border-transparent'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        status === 'done'
                          ? 'bg-emerald-500 text-white'
                          : status === 'active'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 animate-pulse'
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {status === 'done' ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className="font-semibold flex-1">{label}</span>
                    {itemProgress && (
                      <span className="text-xs font-mono font-bold bg-white/80 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {itemProgress.done}/{itemProgress.total}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 shadow-md ring-1 ring-red-100/80">
            <p className="font-bold text-red-800">We couldn&apos;t complete this analysis</p>
            <p className="text-red-700/90 text-sm mt-2 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-indigo-dark px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-indigo-hover transition-colors"
            >
              Try another file
            </button>
          </div>
        )}

        {!loading && !result && (
          <AnalysisForm
            onAnalysisStarting={handleAnalysisStarting}
            onRunStarted={handleRunStarted}
            onError={setError}
            loading={loading}
            setLoading={setLoading}
          />
        )}

        {result && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Results</p>
                <h2 className="text-2xl font-black text-brand-indigo-dark mt-1">Disclosure checklist</h2>
                <p className="text-sm text-gray-500 mt-1">{result.filename}</p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-brand-indigo-dark hover:border-brand-gold hover:bg-amber-50/50 transition-colors"
              >
                New analysis
              </button>
            </div>
            <AnalysisSummary result={result} />
            <AnalysisResults results={result.items || []} runId={result.run_id} />
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

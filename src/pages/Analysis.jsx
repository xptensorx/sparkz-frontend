import { useEffect, useRef, useState } from 'react';
import { createPageUrl } from '@/utils';
import SparkzLogo from '../components/SparkzLogo';
import ApiHealthBanner from '../components/ApiHealthBanner';
import AnalysisForm from '../components/analysis/AnalysisForm';
import AnalysisSummary from '../components/analysis/AnalysisSummary';
import AnalysisResults from '../components/analysis/AnalysisResults';
import { sparkzApi } from '../components/services/sparkzApi';

const STAGE_STEPS = {
  starting: -1,
  extract: 0,
  redact:  1,
  assess:  2,
  review:  3,
  complete: 4,
};

const STEP_LABELS = [
  'Parsing PDF',
  'Removing PII',
  'AI Assessment',
  'AI Review',
  'Complete',
];

const STALL_THRESHOLD_S = 45;

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

// Parse "Assessed 12/45 items" or "Reviewed 3/45 items" → { done, total }
function parseItemProgress(detail) {
  const m = detail?.match(/(?:Assessed|Reviewed)\s+(\d+)\/(\d+)\s+items/i);
  return m ? { done: parseInt(m[1], 10), total: parseInt(m[2], 10) } : null;
}

export default function Analysis() {
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState(null);
  const [progress, setProgress] = useState(null);  // { stage, detail, pct }
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stalledFor, setStalledFor] = useState(0);
  const esRef = useRef(null);
  const lastProgressAt = useRef(null);
  const stallWarnedRef = useRef(false);
  const progressRef = useRef(null);

  // Elapsed time + stall detection ticker
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
        // progress ref not stable here — warning appears via stalledFor state
      }
    }, 1000);
    return () => clearInterval(id);
  }, [loading]);

  // Start SSE stream when we have a run_id
  useEffect(() => {
    if (!runId) return;

    const url = sparkzApi.progressUrl(runId);
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      console.log('[SSE]', new Date().toISOString(), data);
      lastProgressAt.current = Date.now();
      setStalledFor(0);
      stallWarnedRef.current = false;
      progressRef.current = data;
      setProgress(data);

      if (data.stage === 'complete') {
        es.close();
        try {
          const fullResult = await sparkzApi.getResults(runId);
          setResult(fullResult);
        } catch (err) {
          setError('Analysis finished but failed to load results. Please refresh.');
        } finally {
          setLoading(false);
        }
      } else if (data.stage === 'error') {
        es.close();
        setError(data.detail || 'Analysis failed.');
        setLoading(false);
      }
    };

    es.onerror = (e) => {
      const lastStage = progressRef.current?.stage;
      console.warn('[SSE error]', new Date().toISOString(), { stage: lastStage, pct: progressRef.current?.pct });
      es.close();
      const aiStages = ['assess', 'review'];
      const msg = aiStages.includes(lastStage)
        ? 'Lost connection during AI processing — the analysis may still be running. Please wait a moment and check History.'
        : 'Lost connection to the analysis server. Please try again.';
      setError(msg);
      setLoading(false);
    };

    return () => es.close();
  }, [runId]);

  const handleAnalysisStarting = () => {
    setError(null);
    setProgress({
      stage: 'starting',
      detail: 'Uploading your PDF and contacting the analysis server…',
      pct: 0,
    });
  };

  const handleRunStarted = (id) => {
    setRunId(id);
    setResult(null);
    setError(null);
    setProgress({ stage: 'extract', detail: 'Starting…', pct: 0 });
    // loading stays true — set false when SSE completes or errors
  };

  const handleReset = () => {
    esRef.current?.close();
    setRunId(null);
    setResult(null);
    setError(null);
    setProgress(null);
    setLoading(false);
  };

  const currentStepIndex = progress ? (STAGE_STEPS[progress.stage] ?? 0) : -1;

  return (
    <div className="min-h-screen bg-[#f8f8fb]">
      <ApiHealthBanner />
      <header className="bg-[#1e1b4b] border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <SparkzLogo size="sm" variant="light" />
          <nav className="flex gap-6 text-sm text-purple-200">
            <button onClick={() => window.location.href = createPageUrl('Dashboard')} className="hover:text-white">Dashboard</button>
            <button onClick={() => window.location.href = createPageUrl('History')} className="hover:text-white">History</button>
            <button className="text-white font-semibold">Analysis</button>
          </nav>
          <div className="w-8 h-8 rounded-full bg-[#e6c33a] flex items-center justify-center text-[#1e1b4b] text-xs font-bold">AR</div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#1e1b4b]">Document Analysis</h1>
          <p className="text-gray-400 mt-1">Upload a PDF financial statement and run an AI-powered disclosure checklist analysis.</p>
        </div>

        {/* Progress: “starting” = before run_id (upload + cold backend); avoids blank screen */}
        {loading && progress?.stage === 'starting' && !result && (
          <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start gap-4">
              <svg className="w-8 h-8 text-[#1313ec] flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="font-bold text-[#1e1b4b] text-sm">Starting analysis</p>
                <p className="text-sm text-gray-600 mt-1">{progress.detail}</p>
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                  If the backend is on <strong className="font-semibold text-gray-500">free</strong> cloud hosting, it may
                  need <strong className="font-semibold text-gray-500">30–60 seconds</strong> to wake after idle. This page
                  will update as soon as the server responds — nothing is wrong.
                </p>
                <p className="text-xs text-gray-400 mt-2 tabular-nums">Elapsed {formatElapsed(elapsedTime)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress panel (pipeline stages) */}
        {loading && progress && progress.stage !== 'starting' && !result && (
          <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-[#1e1b4b] text-sm">Analysis in progress</p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 tabular-nums">{formatElapsed(elapsedTime)}</span>
                <span className="text-lg font-black text-[#1313ec]">{progress.pct}%</span>
              </div>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[#1313ec] rounded-full transition-all duration-500"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mb-4">{progress.detail}</p>

            {/* Stall warning */}
            {stalledFor >= STALL_THRESHOLD_S && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                {progress.stage === 'assess'
                  ? 'AI Assessment can take 1–2 minutes for large checklists. The LLM is still processing — please wait.'
                  : progress.stage === 'review'
                  ? 'AI Review can take a moment for large checklists. Still running — please wait.'
                  : 'The server hasn\'t responded in a while — this is normal for large documents. Still running.'}
              </div>
            )}

            <div className="space-y-2">
              {STEP_LABELS.map((label, i) => {
                const status = i < currentStepIndex ? 'done' : i === currentStepIndex ? 'active' : 'waiting';
                const itemProgress = status === 'active' ? parseItemProgress(progress.detail) : null;
                return (
                  <div key={label} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm ${status === 'done' ? 'bg-green-50 text-green-700' : status === 'active' ? 'bg-blue-50 text-[#1313ec]' : 'bg-gray-50 text-gray-400'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${status === 'done' ? 'bg-green-500' : status === 'active' ? 'bg-[#1313ec] animate-pulse' : 'bg-gray-200'}`}>
                      {status === 'done' && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                    <span className="font-semibold">{label}</span>
                    {itemProgress && (
                      <span className="ml-auto text-xs font-mono bg-blue-100 text-[#1313ec] px-2 py-0.5 rounded-full">
                        {itemProgress.done}/{itemProgress.total} items
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="font-semibold text-red-700 text-sm mb-0.5">Analysis failed</p>
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={handleReset} className="mt-3 text-sm text-red-600 underline">Try again</button>
          </div>
        )}

        {/* Form */}
        {!loading && !result && (
          <AnalysisForm
            onAnalysisStarting={handleAnalysisStarting}
            onRunStarted={handleRunStarted}
            onError={setError}
            loading={loading}
            setLoading={setLoading}
          />
        )}

        {/* Results */}
        {result && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1e1b4b]">Results</h2>
              <button
                onClick={handleReset}
                className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
              >
                ← Run another analysis
              </button>
            </div>
            <AnalysisSummary result={result} />
            <AnalysisResults
              results={result.items || []}
              runId={result.run_id}
            />
          </div>
        )}
      </div>
    </div>
  );
}

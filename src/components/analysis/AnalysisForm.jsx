import { useRef, useState } from 'react';
import { sparkzApi } from '../services/sparkzApi';

const STANDARDS = [
  { value: 'frs105', label: 'FRS 105 — Micro-entity accounts' },
  { value: 'frs102', label: 'FRS 102 Section 1A — Small company accounts' },
];

export default function AnalysisForm({ onAnalysisStarting, onRunStarted, onError, loading, setLoading }) {
  const [standard, setStandard] = useState('frs105');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !standard) return;
    setLoading(true);
    onError(null);
    onAnalysisStarting?.();

    const fd = new FormData();
    fd.append('file', file);
    fd.append('standard', standard);

    try {
      const { run_id } = await sparkzApi.startAnalysis(fd);
      onRunStarted(run_id);
    } catch (err) {
      let msg = err.message;
      if (err.status === 422) msg = 'Invalid file or standard. Please upload a PDF and select a standard.';
      else if (err.status === 402) msg = 'OpenAI quota exceeded — please check billing.';
      onError(msg);
      setLoading(false);
    }
    // Note: setLoading(false) is NOT called here on success — the parent
    // manages loading state while SSE is streaming.
  };

  const canSubmit = file && standard && !loading;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
      <div>
        <h2 className="text-xl font-black text-[#1e1b4b] mb-1">Run Document Analysis</h2>
        <p className="text-sm text-gray-400">
          Upload a financial statement PDF and select the accounting standard. Analysis usually takes 2–5 minutes after the
          run starts. The first request after idle can take longer if the API is on free hosting (cold start).
        </p>
      </div>

      {/* Standard selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Accounting Standard</label>
        <div className="space-y-2">
          {STANDARDS.map(s => (
            <label key={s.value} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${standard === s.value ? 'border-[#1e1b4b] bg-[#1e1b4b]/5' : 'border-gray-200 hover:border-gray-300'}`}>
              <input
                type="radio"
                name="standard"
                value={s.value}
                checked={standard === s.value}
                onChange={() => setStandard(s.value)}
                className="accent-[#1e1b4b]"
              />
              <span className={`text-sm font-semibold ${standard === s.value ? 'text-[#1e1b4b]' : 'text-gray-600'}`}>{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">PDF Document</label>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files[0] || null)} />
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl px-6 py-8 flex flex-col items-center justify-center cursor-pointer hover:border-gray-300 transition-colors"
        >
          {file ? (
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
            </div>
          ) : (
            <>
              <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              <p className="text-sm text-gray-500 font-medium">Click to upload PDF</p>
              <p className="text-xs text-gray-400 mt-1">PDF only · Max 20MB</p>
            </>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-3 bg-[#e6c33a] text-[#1e1b4b] font-bold text-sm rounded-xl hover:bg-[#d4b034] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Analysing...
          </>
        ) : 'Run Analysis →'}
      </button>
    </form>
  );
}

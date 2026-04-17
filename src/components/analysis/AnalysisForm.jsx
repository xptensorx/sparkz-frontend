import { useRef, useState } from 'react';
import { sparkzApi } from '../services/sparkzApi';

const STANDARDS = [
  { value: 'frs105', label: 'FRS 105 — Micro-entity accounts', hint: 'Streamlined disclosures for micro-entities' },
  { value: 'frs102', label: 'FRS 102 Section 1A — Small company', hint: 'Reduced disclosures for small entities' },
];

export default function AnalysisForm({ onAnalysisStarting, onRunStarted, onError, loading, setLoading }) {
  const [standard, setStandard] = useState('frs105');
  const [file, setFile] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('');
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
    if (companyName.trim()) fd.append('company_name', companyName.trim());
    if (reportingPeriod.trim()) fd.append('reporting_period', reportingPeriod.trim());

    try {
      const { run_id } = await sparkzApi.startAnalysis(fd);
      onRunStarted(run_id);
    } catch (err) {
      let msg = err.message;
      if (err.status === 422) msg = 'Invalid file or standard. Please upload a PDF and select a standard.';
      else if (err.status === 402) msg = 'Monthly analysis quota reached. Upgrade your plan or try again next month.';
      onError(msg);
      setLoading(false);
    }
  };

  const canSubmit = file && standard && !loading;

  return (
    <form
      onSubmit={handleSubmit}
      className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-xl shadow-gray-200/60 ring-1 ring-black/[0.04] sm:rounded-3xl sm:p-8 md:p-10"
    >
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-100/80 to-transparent blur-2xl pointer-events-none" />
      <div className="relative space-y-8">
        <div>
          <h2 className="text-2xl font-black text-[#16133a] tracking-tight">Upload & configure</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-lg leading-relaxed">
            PDF financial statements only. Typical runs finish in a few minutes; large files or cold servers may take longer.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Accounting framework</label>
          <div className="grid sm:grid-cols-2 gap-3">
            {STANDARDS.map((s) => (
              <label
                key={s.value}
                className={`relative flex cursor-pointer flex-col rounded-2xl border-2 p-4 transition-all ${
                  standard === s.value
                    ? 'border-[#16133a] bg-gradient-to-br from-indigo-50/80 to-white shadow-md ring-1 ring-indigo-100'
                    : 'border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="standard"
                    value={s.value}
                    checked={standard === s.value}
                    onChange={() => setStandard(s.value)}
                    className="mt-1 accent-[#16133a]"
                  />
                  <div>
                    <span className={`text-sm font-bold ${standard === s.value ? 'text-[#16133a]' : 'text-gray-700'}`}>
                      {s.label}
                    </span>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">{s.hint}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Company (optional)</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Example Ltd"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Reporting period (optional)</label>
            <input
              type="text"
              value={reportingPeriod}
              onChange={(e) => setReportingPeriod(e.target.value)}
              placeholder="FY 2024"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">PDF document</label>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`group w-full rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all ${
              file
                ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                : 'border-gray-200 bg-gray-50/30 hover:border-indigo-200 hover:bg-indigo-50/20'
            }`}
          >
            {file ? (
              <div>
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB · click to change</p>
              </div>
            ) : (
              <div>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 group-hover:scale-105 transition-transform">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-800">Drop or click to upload</p>
                <p className="text-xs text-gray-500 mt-1">PDF · max 20 MB</p>
              </div>
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-2xl bg-gradient-to-r from-[#e6c33a] to-[#d4af2f] py-4 text-[#16133a] font-black text-sm shadow-lg shadow-amber-900/15 hover:shadow-xl hover:brightness-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting…
            </>
          ) : (
            <>
              Run analysis
              <span aria-hidden>→</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

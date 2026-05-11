export default function AnalysisSummary({ result }) {
  const { filename, standard, metadata, summary } = result;
  const total = summary.total || (summary.met + summary.partially_met + summary.missing + summary.not_applicable);

  const stats = [
    { label: 'Met',          count: summary.met,              color: 'bg-green-100 text-green-700 border-green-200' },
    { label: 'Partially Met',count: summary.partially_met,    color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { label: 'Missing',      count: summary.missing,          color: 'bg-red-100 text-red-700 border-red-200' },
    { label: 'N/A',          count: summary.not_applicable,   color: 'bg-gray-100 text-gray-500 border-gray-200' },
  ].map(s => ({ ...s, pct: total ? Math.round((s.count / total) * 100) : 0 }));

  const standardLabel =
    standard === 'frs105' ? 'FRS 105 (Micro-entity)'
      : standard === 'ifrs' ? 'IFRS (UK-adopted)'
        : 'FRS 102 Section 1A (Small company)';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-[#1e1b4b]">{filename}</h2>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 font-medium">
            <span>{standardLabel}</span>
            {metadata?.pages && <><span>·</span><span>{metadata.pages} pages</span></>}
            <span>·</span>
            <span>{total} items checked</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`border rounded-xl p-4 text-center ${s.color}`}>
            <p className="text-2xl font-black">{s.count}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
            <p className="text-xs opacity-70 mt-0.5">{s.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

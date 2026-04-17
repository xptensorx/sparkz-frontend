import { useState } from 'react';
import { sparkzApi } from '../services/sparkzApi';

const STATUS_STYLES = {
  met:            'bg-green-100 text-green-700 border border-green-200',
  partially_met:  'bg-amber-100 text-amber-700 border border-amber-200',
  missing:        'bg-red-100 text-red-700 border border-red-200',
  not_applicable: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const STATUS_LABELS = {
  met: 'Met',
  partially_met: 'Partially Met',
  missing: 'Missing',
  not_applicable: 'N/A',
};

const OVERRIDE_OPTIONS = ['', 'met', 'partially_met', 'missing', 'not_applicable'];
const OVERRIDE_LABELS  = { '': '— no override —', met: 'Met', partially_met: 'Partially Met', missing: 'Missing', not_applicable: 'N/A' };

function ResultRow({ item, runId }) {
  const [expanded, setExpanded]     = useState(false);
  const [override, setOverride]     = useState(item.human_override || '');
  const [notes, setNotes]           = useState(item.human_notes || '');
  const [saving, setSaving]         = useState(false);

  const effectiveStatus = override || item.status;

  const saveOverride = async () => {
    setSaving(true);
    try {
      await sparkzApi.updateItem(runId, item.item_id, {
        human_override: override || null,
        human_notes: notes || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const isDirty = override !== (item.human_override || '') || notes !== (item.human_notes || '');

  return (
    <>
      <tr
        className="border-t border-gray-50 hover:bg-[#f8f8fb] cursor-pointer transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{item.item_id}</td>
        <td className="px-4 py-3 text-sm text-gray-800 font-medium max-w-xs truncate">{item.requirement}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[effectiveStatus] || STATUS_STYLES.not_applicable}`}>
            {STATUS_LABELS[effectiveStatus] || effectiveStatus}
            {override && <span className="opacity-60">(override)</span>}
            {item.reviewer_changed === 1 && (
              <span className="text-orange-600 font-semibold" title="Reviewer corrected the initial assessment">✎</span>
            )}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-400 text-sm">{expanded ? '▲' : '▼'}</td>
      </tr>

      {expanded && (
        <tr className="bg-[#f8f8fb] border-t border-gray-100">
          <td colSpan={4} className="px-6 py-4 space-y-4">
            {item.requirement_full && item.requirement_full !== item.requirement && (
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full requirement (with parent context)</p>
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{item.requirement_full}</div>
              </div>
            )}
            {item.reasoning && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">Reasoning: </span>{item.reasoning}
              </p>
            )}
            {item.evidence_location && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">Found in: </span>
                {item.evidence_location}
              </p>
            )}
            {item.evidence && (
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Evidence</p>
                <p className="text-sm text-gray-700 italic">"{item.evidence}"</p>
              </div>
            )}
            {item.evidence_snippet && (
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Document excerpt</p>
                <p className="text-sm text-gray-700 italic whitespace-pre-wrap">"{item.evidence_snippet}"</p>
              </div>
            )}

            {/* Human override */}
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Human Review</p>
              <div className="flex gap-3 items-start flex-wrap">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Override status</label>
                  <select
                    value={override}
                    onChange={e => setOverride(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                  >
                    {OVERRIDE_OPTIONS.map(v => (
                      <option key={v} value={v}>{OVERRIDE_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-48">
                  <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                  <input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="Add notes..."
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/20"
                  />
                </div>
                {isDirty && (
                  <button
                    onClick={e => { e.stopPropagation(); saveOverride(); }}
                    disabled={saving}
                    className="mt-5 px-4 py-1.5 bg-[#1e1b4b] text-white text-xs font-semibold rounded-lg hover:bg-[#2d2a6e] disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const STATUS_FILTERS = ['all', 'met', 'partially_met', 'missing', 'not_applicable'];
const FILTER_LABELS  = { all: 'All', met: 'Met', partially_met: 'Partially Met', missing: 'Missing', not_applicable: 'N/A' };

export default function AnalysisResults({ results, runId }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = results.filter(r => {
    const matchStatus = statusFilter === 'all' || (r.human_override || r.status) === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || r.requirement?.toLowerCase().includes(q)
      || r.requirement_full?.toLowerCase().includes(q)
      || r.item_id?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleExport = () => {
    window.open(sparkzApi.exportUrl(runId), '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? 'bg-[#1e1b4b] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {FILTER_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative min-w-0 flex-1 sm:flex-initial">
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/20 sm:w-44"
              />
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="bg-[#f6f6f8]">
                {['Item ID', 'Requirement', 'Status', ''].map(h => (
                  <th key={h || 'expand'} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <ResultRow key={item.item_id} item={item} runId={runId} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">No results match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
          Showing {filtered.length} of {results.length} items
        </div>
      </div>
    </div>
  );
}

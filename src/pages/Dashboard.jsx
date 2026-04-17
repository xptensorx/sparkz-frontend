import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { sparkzApi } from '../components/services/sparkzApi';
import { useAuth } from '@/lib/AuthContext';

const statusLabel = (s) => {
  if (s === 'complete') return 'Completed';
  if (s === 'processing' || s === 'pending') return 'Processing';
  if (s === 'error') return 'Failed';
  return s;
};

const StatusDot = ({ status }) => {
  const color = status === 'complete' ? 'bg-green-500' : status === 'processing' || status === 'pending' ? 'bg-blue-500' : 'bg-red-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${color} mr-2`} />;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = user?.email?.split('@')[0] || 'there';

  const used = user?.analyses_completed_this_month ?? 0;
  const quota = user?.monthly_quota ?? 3;
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        await refreshUser();
        const data = await sparkzApi.listRuns();
        if (!cancelled) setRuns(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load analyses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshUser]);

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return String(d);
    }
  };

  return (
    <SidebarLayout activePage="Dashboard">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-[#1e1b4b] sm:text-3xl">
            {greeting}, {first}
          </h1>
          <p className="mt-1 text-sm text-gray-400 sm:text-base">Your disclosure checklist analyses and usage.</p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/analysis')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e1b4b] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#2d2a6e] sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            New analysis
          </button>
        </div>
      </div>

      {runs.length === 0 && !loading && (
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-[#1e1b4b] p-5 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-white font-bold text-lg mb-1">Welcome to Sparkz</p>
            <p className="text-purple-200 text-sm">Upload a financial statement PDF to generate your first disclosure checklist.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/analysis')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#e6c33a] text-[#1e1b4b] font-bold text-sm rounded-xl hover:bg-[#d4b034] transition-colors flex-shrink-0"
          >
            Start an analysis
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:mb-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Saved analyses</p>
            <div className="w-9 h-9 bg-[#1e1b4b]/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#1e1b4b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
            </div>
          </div>
          <p className="text-4xl font-black text-[#1e1b4b]">{loading ? '…' : runs.length}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Quota this month</p>
            <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#e6c33a]" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            </div>
          </div>
          <p className="text-4xl font-black text-[#1e1b4b]">
            {quota - used}
            <span className="text-xl text-gray-400 font-medium"> / {quota}</span>
          </p>
          <div className="mt-3">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#e6c33a] rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{used} completed this month</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-50 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="font-bold text-gray-900">Your analyses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="bg-[#f6f6f8]">
                {['File', 'Standard', 'Started', 'Status', ''].map((h) => (
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
              {runs.map((r) => (
                <tr key={r.run_id} className="border-t border-gray-50 transition-colors hover:bg-[#f6f6f8]/50">
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm font-medium text-gray-900 sm:max-w-none sm:px-6 sm:py-4">
                    {r.filename}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                    <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold uppercase text-gray-700">
                      {r.standard}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 sm:px-6 sm:py-4">{formatDate(r.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm sm:px-6 sm:py-4">
                    <StatusDot status={r.status} />
                    <span
                      className={
                        r.status === 'complete'
                          ? 'text-green-700'
                          : r.status === 'error'
                            ? 'text-red-600'
                            : 'text-[#1e1b4b]'
                      }
                    >
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/analysis/${r.run_id}`)}
                      className="text-sm font-semibold text-[#1e1b4b] hover:underline"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && runs.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400 sm:px-6">No analyses yet.</p>
        )}
      </div>
    </SidebarLayout>
  );
}

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { sparkzApi } from '../components/services/sparkzApi';
import { useAuth } from '@/lib/AuthContext';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [checklist, setChecklist] = useState(null);
  const [framework, setFramework] = useState('frs105');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.is_admin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const u = await sparkzApi.adminUsers();
        if (!cancelled) setUsers(Array.isArray(u) ? u : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.is_admin]);

  useEffect(() => {
    if (!user?.is_admin || tab !== 'checklist') return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const c = await sparkzApi.adminChecklist(framework);
        if (!cancelled) setChecklist(c);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load checklist');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.is_admin, tab, framework]);

  if (!user?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarLayout activePage="Admin">
      <h1 className="mb-2 text-xl font-black text-brand-indigo sm:text-2xl">Admin</h1>
      <p className="mb-6 text-sm text-gray-400">User activity and checklist templates (read-only).</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'users' ? 'bg-brand-indigo text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setTab('checklist')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'checklist' ? 'bg-brand-indigo text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Checklist JSON
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {tab === 'users' && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="bg-[#f6f6f8] text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Runs</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!loading && users.map((u) => (
                <tr key={u.id} className="border-t border-gray-50">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.is_admin ? 'Admin' : 'User'}</td>
                  <td className="px-4 py-3">{u.analysis_runs}</td>
                  <td className="px-4 py-3 text-gray-500">{u.created_at || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === 'checklist' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {['frs105', 'frs102', 'ifrs'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFramework(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${framework === f ? 'bg-brand-indigo text-white' : 'bg-gray-100'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <pre className="bg-brand-indigo text-green-100 text-xs p-4 rounded-xl overflow-auto max-h-[480px] whitespace-pre-wrap">
            {loading ? '…' : checklist ? JSON.stringify(checklist, null, 2) : '—'}
          </pre>
        </div>
      )}
    </SidebarLayout>
  );
}

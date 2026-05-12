// ExportDocxLink
// ===============
// Secondary action that downloads the run's generated DOCX. The auth
// token travels in the fetch headers (not the URL); the filename comes
// from the server's Content-Disposition. Used inside GeneratePanel.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { sparkzApi } from '@/components/services/sparkzApi';
import { useAuth } from '@/lib/AuthContext';

/**
 * @param {{ runId: string }} props
 */
export function ExportDocxLink({ runId }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */(null));
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleClick = async () => {
    setPending(true);
    setError(null);
    try {
      await sparkzApi.downloadStatementDocx(runId);
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to export DOCX');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-indigo-dark hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {pending ? 'Building…' : 'Export DOCX'}
      </button>
      {error && <span className="text-xs text-red-700" title={error}>{error}</span>}
    </div>
  );
}

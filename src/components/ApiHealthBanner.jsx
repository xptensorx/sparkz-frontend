import { useState, useEffect } from 'react';
import { sparkzApi, SPARKZ_V2_API_BASE } from './services/sparkzApi';

export default function ApiHealthBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    sparkzApi.health()
      .then(d => setOffline(d?.status !== 'ok'))
      .catch(() => setOffline(true));
  }, []);

  if (!offline) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-semibold px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center sm:text-left shadow-lg shadow-red-900/20 ring-1 ring-white/10">
      <span className="flex items-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Sparkz v2 API unreachable (PDF analysis).
      </span>
      <span className="font-normal opacity-90">
        Start the backend and set <code className="bg-red-700/80 px-1 rounded">VITE_SPARKZ_API_URL</code> if not using{' '}
        <code className="bg-red-700/80 px-1 rounded">{SPARKZ_V2_API_BASE}</code>
      </span>
    </div>
  );
}
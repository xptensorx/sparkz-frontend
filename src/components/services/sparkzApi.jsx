// Sparkz API — same origin in dev (Vite proxy) or full URL in production.
import { clearToken, getToken, setToken } from '@/lib/authStorage';

export const SPARKZ_V2_API_BASE =
  import.meta.env.VITE_SPARKZ_API_URL ?? '';

export const SPARKZ_LEGACY_API_BASE =
  import.meta.env.VITE_SPARKZ_LEGACY_API_URL ?? 'https://sparkz-dct-49d5c04c0d5c.herokuapp.com';

const NEW_API_BASE = SPARKZ_V2_API_BASE;

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const get = (base, path) =>
  fetch(`${base}${path}`, { headers: { ...authHeaders() } }).then(r => {
    if (r.status === 401) {
      clearToken();
      throw new Error('SESSION_EXPIRED');
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export const sparkzApi = {
  health: () => fetch(`${NEW_API_BASE}/api/health`).then(r => r.json()),

  login: async (email, password) => {
    const r = await fetch(`${NEW_API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      let detail = 'Login failed';
      try {
        const j = await r.json();
        detail = j.detail || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    const data = await r.json();
    setToken(data.access_token);
    return data;
  },

  register: async (email, password) => {
    const r = await fetch(`${NEW_API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      let detail = 'Registration failed';
      try {
        const j = await r.json();
        detail = j.detail || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    const data = await r.json();
    setToken(data.access_token);
    return data;
  },

  me: () => get(NEW_API_BASE, '/api/auth/me'),

  logout: () => {
    clearToken();
  },

  startAnalysis: (formData) =>
    fetch(`${NEW_API_BASE}/api/analyse`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: formData,
    }).then(async r => {
      if (r.status === 401) {
        clearToken();
        throw new Error('SESSION_EXPIRED');
      }
      if (r.status === 402) {
        let detail = 'Monthly quota exceeded';
        try {
          const j = await r.json();
          detail = j.detail || detail;
        } catch { /* ignore */ }
        const err = new Error(detail);
        err.status = 402;
        throw err;
      }
      if (!r.ok) {
        let detail = `HTTP ${r.status}`;
        try {
          const j = await r.json();
          detail = j.detail || j.message || detail;
        } catch { /* ignore */ }
        const err = new Error(detail);
        err.status = r.status;
        throw err;
      }
      return r.json();
    }),

  progressUrl: (runId) => {
    const t = getToken();
    const q = t ? `?access_token=${encodeURIComponent(t)}` : '';
    return `${NEW_API_BASE}/api/analyse/${runId}/progress${q}`;
  },

  getResults: (runId) => get(NEW_API_BASE, `/api/results/${runId}`),

  exportUrl: (runId) => {
    const t = getToken();
    const q = t ? `?access_token=${encodeURIComponent(t)}` : '';
    return `${NEW_API_BASE}/api/results/${runId}/export${q}`;
  },

  updateItem: (runId, itemId, body) =>
    fetch(`${NEW_API_BASE}/api/results/${runId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    }).then(async r => {
      if (r.status === 401) {
        clearToken();
        throw new Error('SESSION_EXPIRED');
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  listRuns: () => get(NEW_API_BASE, '/api/runs'),

  deleteRun: (runId) =>
    fetch(`${NEW_API_BASE}/api/runs/${runId}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    }).then(async r => {
      if (r.status === 401) {
        clearToken();
        throw new Error('SESSION_EXPIRED');
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  adminChecklist: (standard) => get(NEW_API_BASE, `/api/admin/checklists/${standard}`),

  adminUsers: () => get(NEW_API_BASE, '/api/admin/users'),

  billingConfig: () => get(NEW_API_BASE, '/api/billing/config'),

  billingCheckout: async (plan) => {
    const r = await fetch(`${NEW_API_BASE}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ plan }),
    });
    if (r.status === 401) {
      clearToken();
      throw new Error('SESSION_EXPIRED');
    }
    if (!r.ok) {
      let detail = `HTTP ${r.status}`;
      try {
        const j = await r.json();
        detail = j.detail || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    return r.json();
  },

  billingPortal: async () => {
    const r = await fetch(`${NEW_API_BASE}/api/billing/portal`, {
      method: 'POST',
      headers: { ...authHeaders() },
    });
    if (r.status === 401) {
      clearToken();
      throw new Error('SESSION_EXPIRED');
    }
    if (!r.ok) {
      let detail = `HTTP ${r.status}`;
      try {
        const j = await r.json();
        detail = j.detail || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    return r.json();
  },

  billingCompleteCheckout: async (sessionId) => {
    const r = await fetch(`${NEW_API_BASE}/api/billing/complete-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (r.status === 401) {
      clearToken();
      throw new Error('SESSION_EXPIRED');
    }
    if (!r.ok) {
      let detail = `HTTP ${r.status}`;
      try {
        const j = await r.json();
        detail = j.detail || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    return r.json();
  },

  billingSyncSubscription: async () => {
    const r = await fetch(`${NEW_API_BASE}/api/billing/sync-subscription`, {
      method: 'POST',
      headers: { ...authHeaders() },
    });
    if (r.status === 401) {
      clearToken();
      throw new Error('SESSION_EXPIRED');
    }
    if (!r.ok) {
      let detail = `HTTP ${r.status}`;
      try {
        const j = await r.json();
        detail = j.detail || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    return r.json();
  },

  frameworks: (jurisdiction = 'UK') =>
    get(SPARKZ_LEGACY_API_BASE, `/frameworks?jurisdiction=${jurisdiction}`),
  framework: (code) => get(SPARKZ_LEGACY_API_BASE, `/frameworks/${code}`),
  templates: (frameworkCode) =>
    get(SPARKZ_LEGACY_API_BASE, `/checklist${frameworkCode ? `?framework_code=${frameworkCode}` : ''}`),
  checklistTree: (templateCode, frameworkCode) =>
    get(SPARKZ_LEGACY_API_BASE, `/checklist/${templateCode}${frameworkCode ? `?framework_code=${frameworkCode}` : ''}`),
};

// Sparkz API client.
//
// Single base URL configured via VITE_SPARKZ_API_URL (or empty in dev — the
// Vite dev server proxies /api to the backend, see vite.config.js).
//
// All authenticated calls go through one of the verb helpers (`get`, `postJson`,
// `postForm`, `postEmpty`, `patchJson`, `del`) so error handling and 401
// logout are uniform across every endpoint.

import { clearToken, getToken, setToken } from '@/lib/authStorage';

export const API_BASE = import.meta.env.VITE_SPARKZ_API_URL ?? '';

// ── Internal helpers ────────────────────────────────────────────────────────

/** @returns {Record<string, string>} */
function authHeaders() {
  const t = getToken();
  if (t) return { Authorization: `Bearer ${t}` };
  return {};
}

/**
 * Normalise a fetch Response into either a parsed JSON value or a thrown
 * error. 401 responses clear the local token and throw the sentinel
 * `SESSION_EXPIRED` so callers can redirect to /login. Non-2xx responses
 * surface the server's `detail` / `message` field when present.
 *
 * @param {Response} r
 * @returns {Promise<any>}
 */
async function handleResponse(r) {
  if (r.status === 401) {
    clearToken();
    throw new Error('SESSION_EXPIRED');
  }
  if (!r.ok) {
    let detail = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      detail = j.detail || j.message || detail;
    } catch { /* ignore non-JSON error bodies */ }
    /** @type {Error & { status?: number }} */
    const err = new Error(detail);
    err.status = r.status;
    throw err;
  }
  // Tolerate empty bodies (e.g. some backends return empty 200 / 204 on delete).
  const text = await r.text();
  return text ? JSON.parse(text) : {};
}

/** @param {string} path */
function get(path) {
  return fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
  }).then(handleResponse);
}

/**
 * @param {string} path
 * @param {unknown} body
 */
function postJson(path, body) {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then(handleResponse);
}

/**
 * @param {string} path
 * @param {FormData} formData
 */
function postForm(path, formData) {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(), // browser sets multipart Content-Type with boundary
    body: formData,
  }).then(handleResponse);
}

/** @param {string} path */
function postEmpty(path) {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
  }).then(handleResponse);
}

/**
 * @param {string} path
 * @param {unknown} body
 */
function patchJson(path, body) {
  return fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then(handleResponse);
}

/** @param {string} path */
function del(path) {
  return fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handleResponse);
}

/**
 * Append the access token as a query param. Used for endpoints the browser
 * hits directly (download links, EventSource) where we can't add an
 * Authorization header.
 *
 * @param {string} path
 */
function withToken(path) {
  const t = getToken();
  if (!t) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}access_token=${encodeURIComponent(t)}`;
}

// ── Public API ──────────────────────────────────────────────────────────────

export const sparkzApi = {
  // Health (no auth)
  health: () => fetch(`${API_BASE}/api/health`).then((r) => r.json()),

  // Auth
  /** @param {string} email @param {string} password */
  login: async (email, password) => {
    const data = await postJson('/api/auth/login', { email, password });
    setToken(data.access_token);
    return data;
  },
  /** @param {string} email @param {string} password */
  register: async (email, password) => {
    const data = await postJson('/api/auth/register', { email, password });
    setToken(data.access_token);
    return data;
  },
  me: () => get('/api/auth/me'),
  logout: () => { clearToken(); },

  // Disclosure analysis (PDF → checklist)
  /** @param {FormData} formData */
  startAnalysis: (formData) => postForm('/api/analyse', formData),
  /** @param {string} runId */
  progressUrl: (runId) => `${API_BASE}${withToken(`/api/analyse/${runId}/progress`)}`,
  /** @param {string} runId */
  getResults: (runId) => get(`/api/results/${runId}`),
  /** @param {string} runId */
  exportUrl: (runId) => `${API_BASE}${withToken(`/api/results/${runId}/export`)}`,
  /** @param {string} runId @param {string} itemId @param {unknown} body */
  updateItem: (runId, itemId, body) => patchJson(`/api/results/${runId}/items/${itemId}`, body),
  listRuns: () => get('/api/runs'),
  /** @param {string} runId */
  deleteRun: (runId) => del(`/api/runs/${runId}`),

  // Admin
  /** @param {string} standard */
  adminChecklist: (standard) => get(`/api/admin/checklists/${standard}`),
  adminUsers: () => get('/api/admin/users'),

  // Billing (Stripe)
  billingConfig: () => get('/api/billing/config'),
  /** @param {string} plan */
  billingCheckout: (plan) => postJson('/api/billing/checkout', { plan }),
  billingPortal: () => postEmpty('/api/billing/portal'),
  /** @param {string} sessionId */
  billingCompleteCheckout: (sessionId) => postJson('/api/billing/complete-checkout', { session_id: sessionId }),
  billingSyncSubscription: () => postEmpty('/api/billing/sync-subscription'),

  // Statements (financial-statements generator)
  listStatements: () => get('/api/statements'),
  /** @param {string} runId */
  getStatement: (runId) => get(`/api/statements/${runId}`),
  /** @param {FormData} formData */
  createStatement: (formData) => postForm('/api/statements', formData),
  /** @param {string} runId */
  deleteStatement: (runId) => del(`/api/statements/${runId}`),
  /** @param {string} runId */
  ingestStatement: (runId) => postEmpty(`/api/statements/${runId}/ingest`),
  /** @param {string} runId */
  generateStatement: (runId) => postEmpty(`/api/statements/${runId}/generate`),

  // Editor (Task 8) — block list/patch + reference value list/patch
  /** @param {string} runId */
  listStatementBlocks: (runId) => get(`/api/statements/${runId}/blocks`),
  /** @param {string} runId @param {string} blockId @param {unknown} body */
  patchStatementBlock: (runId, blockId, body) =>
    patchJson(`/api/statements/${runId}/blocks/${blockId}`, body),
  /** @param {string} runId */
  listStatementReferences: (runId) => get(`/api/statements/${runId}/references`),
  /** @param {string} runId @param {string} refId @param {unknown} body */
  patchStatementReference: (runId, refId, body) =>
    patchJson(`/api/statements/${runId}/references/${refId}`, body),

  /**
   * Download the run's generated DOCX into the browser. Uses an authed
   * fetch so the JWT travels in the header (not in a query string), then
   * triggers a save dialog via a transient blob URL. Returns the filename
   * that was used.
   *
   * @param {string} runId
   * @returns {Promise<string>}
   */
  downloadStatementDocx: async (runId) => {
    const r = await fetch(`${API_BASE}/api/statements/${runId}/export.docx`, {
      headers: authHeaders(),
    });
    if (r.status === 401) {
      clearToken();
      throw new Error('SESSION_EXPIRED');
    }
    if (!r.ok) {
      let detail = `HTTP ${r.status}`;
      try {
        const j = await r.json();
        detail = j.detail || j.message || detail;
      } catch { /* binary body — keep default */ }
      const err = /** @type {Error & { status?: number }} */ (new Error(detail));
      err.status = r.status;
      throw err;
    }
    const blob = await r.blob();
    // Prefer the server-suggested filename when present.
    const cd = r.headers.get('Content-Disposition') || '';
    const match = /filename="?([^";]+)"?/i.exec(cd);
    const filename = match ? match[1] : `statements-${runId}.docx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return filename;
  },
};

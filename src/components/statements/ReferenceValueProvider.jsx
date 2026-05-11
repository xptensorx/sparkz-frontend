// ReferenceValueProvider
// =========================
// Single source of truth for the editor's `ref_id -> value` map.
// Every <ReferenceToken> reads from this context; updating a value here
// re-renders all referencing tokens instantly (the "linked numbers"
// experience).
//
// Update flow:
//   1. caller calls updateValue(ref_id, newValue) — optimistic local update
//   2. provider issues PATCH /api/statements/:runId/references/:refId
//   3. on success: keeps local value; surfaces the server's audit info
//   4. on failure: rolls back the local value and bubbles the error up
//
// Single-editor assumption: one accountant at a time per run. No SSE / no
// CRDT — if we add multi-user editing later, this provider grows a
// websocket subscription, but the surface stays the same.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { sparkzApi } from '@/components/services/sparkzApi';

/**
 * @typedef {{
 *   ref_id: string,
 *   account_key: string,
 *   period: string,
 *   value: string,
 *   unit: string,
 *   scale: string,
 *   last_edited_at: string | null,
 *   last_edited_by: string | null,
 * }} ReferenceEntry
 */

const ReferenceValueContext = createContext(/** @type {any} */(null));

/**
 * Provider that loads all references for one run and exposes the
 * `ref_id -> ReferenceEntry` map + an `updateValue` action.
 *
 * @param {{ runId: string, children: any }} props
 */
export function ReferenceValueProvider({ runId, children }) {
  const [byRefId, setByRefId] = useState(/** @type {Record<string, ReferenceEntry>} */ ({}));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(/** @type {string | null} */(null));
  // Track which ref_ids have an in-flight PATCH so the UI can show pending state.
  const [pendingByRefId, setPendingByRefId] = useState(/** @type {Record<string, boolean>} */ ({}));
  // Surface the latest update error per ref_id (cleared on next successful update)
  const [errorByRefId, setErrorByRefId] = useState(/** @type {Record<string, string>} */ ({}));

  // Keep a stable reference to the previous value for rollback on failure.
  const previousValueRef = useRef(/** @type {Record<string, string>} */ ({}));

  // Initial load
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    sparkzApi.listStatementReferences(runId)
      .then((rows) => {
        if (cancelled) return;
        const next = /** @type {Record<string, ReferenceEntry>} */ ({});
        for (const r of rows) next[r.ref_id] = r;
        setByRefId(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message || 'Failed to load references');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [runId]);

  /** Get the current value for a ref_id, or undefined if unknown. */
  const getValue = useCallback(
    /** @param {string} refId */
    (refId) => byRefId[refId]?.value,
    [byRefId],
  );

  /**
   * Update a ref value optimistically, then persist. Rolls back on failure.
   *
   * @param {string} refId
   * @param {string} newValue
   * @returns {Promise<void>}
   */
  const updateValue = useCallback(async (refId, newValue) => {
    const existing = byRefId[refId];
    if (!existing) throw new Error(`unknown ref_id: ${refId}`);
    if (newValue === existing.value) return;

    previousValueRef.current[refId] = existing.value;
    // Optimistic: update the local map immediately
    setByRefId((prev) => ({
      ...prev,
      [refId]: { ...prev[refId], value: newValue },
    }));
    setPendingByRefId((prev) => ({ ...prev, [refId]: true }));
    setErrorByRefId((prev) => {
      if (!(refId in prev)) return prev;
      const next = { ...prev };
      delete next[refId];
      return next;
    });

    try {
      const updated = await sparkzApi.patchStatementReference(runId, refId, { value: newValue });
      setByRefId((prev) => ({ ...prev, [refId]: updated }));
    } catch (err) {
      // Roll back the optimistic update
      const previous = previousValueRef.current[refId];
      setByRefId((prev) => ({
        ...prev,
        [refId]: { ...prev[refId], value: previous },
      }));
      const message = err instanceof Error ? err.message : 'Failed to update reference';
      setErrorByRefId((prev) => ({ ...prev, [refId]: message }));
      throw err;
    } finally {
      setPendingByRefId((prev) => {
        const next = { ...prev };
        delete next[refId];
        return next;
      });
    }
  }, [byRefId, runId]);

  /** Reload from the server. Useful after a re-generate. */
  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await sparkzApi.listStatementReferences(runId);
      const next = /** @type {Record<string, ReferenceEntry>} */ ({});
      for (const r of rows) next[r.ref_id] = r;
      setByRefId(next);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load references');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  const value = useMemo(() => ({
    byRefId,
    loading,
    loadError,
    pendingByRefId,
    errorByRefId,
    getValue,
    updateValue,
    refresh,
  }), [byRefId, loading, loadError, pendingByRefId, errorByRefId, getValue, updateValue, refresh]);

  return (
    <ReferenceValueContext.Provider value={value}>
      {children}
    </ReferenceValueContext.Provider>
  );
}

export function useReferenceValues() {
  const ctx = useContext(ReferenceValueContext);
  if (!ctx) throw new Error('useReferenceValues must be inside <ReferenceValueProvider>');
  return ctx;
}

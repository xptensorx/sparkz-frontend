// ReferenceEditPopover
// =====================
// Modal opened when the user clicks a <ReferenceToken>. Lets them edit
// the underlying numeric value for that ref_id. Routes the save through
// the ReferenceValueProvider so every other token bound to the same
// ref_id updates instantly (optimistic), with rollback on PATCH failure.
//
// We deliberately keep this UI minimal:
//   - one prefilled <input> bound to the live value
//   - metadata strip showing account_key / period / last edited
//   - Save / Cancel
//
// Numeric validation: empty is rejected; non-numeric strings are
// accepted (some refs hold formatted strings like "(1,234)" or
// percentages — the backend treats `value` as an opaque string, so we
// don't enforce a parse here, only block oversize input).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReferenceValues } from './ReferenceValueProvider';

const MAX_LENGTH = 2048; // mirrors backend ReferencePatchBody.max_length

/**
 * @param {{
 *   refId: string,
 *   onClose: () => void,
 * }} props
 */
export function ReferenceEditPopover({ refId, onClose }) {
  const { byRefId, pendingByRefId, errorByRefId, updateValue } = useReferenceValues();
  const entry = byRefId[refId];

  const [draft, setDraft] = useState(entry?.value ?? '');
  const [localError, setLocalError] = useState(/** @type {string | null} */(null));
  const inputRef = useRef(/** @type {HTMLInputElement | null} */(null));

  // When the dialog opens, focus the input and select all so a single
  // keystroke replaces the existing value — matches spreadsheet muscle memory.
  useEffect(() => {
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
    return () => window.clearTimeout(id);
  }, []);

  // Keep draft in sync if the live value changes underneath us (e.g.
  // someone else's edit just landed via re-fetch).
  useEffect(() => {
    if (entry) setDraft(entry.value);
  }, [entry?.value]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = !!pendingByRefId[refId];
  const serverError = errorByRefId[refId];

  const dirty = useMemo(
    () => entry != null && draft !== entry.value,
    [draft, entry],
  );

  if (!entry) {
    return (
      <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reference not found</DialogTitle>
            <DialogDescription>
              This reference no longer exists in the current run. It may
              have been removed by a re-generation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  /** @param {React.FormEvent} e */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed === '') {
      setLocalError('Value cannot be empty.');
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setLocalError(`Value is too long (max ${MAX_LENGTH} characters).`);
      return;
    }
    setLocalError(null);
    try {
      await updateValue(refId, trimmed);
      onClose();
    } catch {
      // error already surfaced through errorByRefId; keep the dialog open
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit reference value</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {entry.account_key} · {entry.period}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">
              Value
            </span>
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setLocalError(null); }}
              maxLength={MAX_LENGTH}
              disabled={pending}
              className="font-mono tabular-nums"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            {entry.unit ? <span>Unit: <span className="font-medium text-gray-700">{entry.unit}</span></span> : null}
            {entry.scale ? <span>Scale: <span className="font-medium text-gray-700">{entry.scale}</span></span> : null}
            {entry.last_edited_at ? (
              <span>
                Edited <span className="font-medium text-gray-700">{formatTimestamp(entry.last_edited_at)}</span>
              </span>
            ) : (
              <span className="italic">Original value</span>
            )}
          </div>

          {(localError || serverError) && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
              {localError ?? serverError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!dirty || pending}
            >
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** @param {string} iso */
function formatTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

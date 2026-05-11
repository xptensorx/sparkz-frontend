// StatementsEditor
// =================
// Three-pane block editor for one StatementRun.
//
//   ┌──────────────┬─────────────────────────────────┬──────────────┐
//   │ BlockList    │ BlockRenderer                   │ Source       │
//   │ (sidebar)    │ (the document, click-to-edit)   │ Attribution  │
//   └──────────────┴─────────────────────────────────┴──────────────┘
//
// Numbers come through <ReferenceToken> which reads from the shared
// `ReferenceValueProvider` context — editing a value anywhere updates
// every reference instantly.
//
// Two write paths:
//   * PATCH /references/{ref_id}  — via ReferenceValueProvider, optimistic
//   * PATCH /blocks/{block_id}    — title + paragraph edits, auto-locks
//
// Both surface failures in-place and refetch the affected row on success.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Loader2, Lock, LockOpen, RefreshCcw } from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';
import { sparkzApi } from '@/components/services/sparkzApi';
import { useAuth } from '@/lib/AuthContext';
import { BlockListSidebar } from '@/components/statements/BlockListSidebar';
import { BlockRenderer } from '@/components/statements/BlockRenderer';
import { SourceAttributionPanel } from '@/components/statements/SourceAttributionPanel';
import { ReferenceValueProvider } from '@/components/statements/ReferenceValueProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function StatementsEditor() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [run, setRun] = useState(/** @type {any} */(null));
  const [blocks, setBlocks] = useState(/** @type {any[]} */([]));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(/** @type {string | null} */(null));
  const [selectedBlockId, setSelectedBlockId] = useState(/** @type {string | null} */(null));

  // Surface SESSION_EXPIRED uniformly.
  const handleAuthError = useCallback((err) => {
    if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
      logout();
      navigate('/login', { replace: true });
      return true;
    }
    return false;
  }, [logout, navigate]);

  // Initial load: run metadata + block list in parallel.
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      sparkzApi.getStatement(runId),
      sparkzApi.listStatementBlocks(runId),
    ])
      .then(([runData, blocksData]) => {
        if (cancelled) return;
        setRun(runData);
        setBlocks(Array.isArray(blocksData) ? blocksData : []);
        if (Array.isArray(blocksData) && blocksData.length > 0) {
          setSelectedBlockId(blocksData[0].id);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (handleAuthError(err)) return;
        setLoadError(err.message || 'Failed to load editor data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [runId, handleAuthError]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) || null,
    [blocks, selectedBlockId],
  );

  /** Replace one block in local state (after PATCH or refetch). */
  const replaceBlock = useCallback((updated) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }, []);

  if (loading) {
    return (
      <SidebarLayout activePage="Statements">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="inline-flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading editor…
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (loadError) {
    return (
      <SidebarLayout activePage="Statements">
        <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 shadow-md ring-1 ring-red-100/80">
          <p className="font-bold text-red-800">Couldn&apos;t open the editor</p>
          <p className="mt-2 text-sm text-red-700/90">{loadError}</p>
          <button
            type="button"
            onClick={() => navigate(`/statements/${runId}`)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#16133a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#25216b]"
          >
            Back to engagement
          </button>
        </div>
      </SidebarLayout>
    );
  }

  if (!run) return null;

  return (
    <SidebarLayout activePage="Statements">
      <ReferenceValueProvider runId={runId}>
        <div className="flex flex-col gap-4">
          {/* Header strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/statements/${runId}`)}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                ← {run.engagement_name}
              </button>
              <h1 className="mt-1 text-xl font-black tracking-tight text-[#1e1b4b]">
                Block editor
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500">
                {blocks.length} block{blocks.length === 1 ? '' : 's'} · {run.framework?.toUpperCase()}
              </div>
              <ExportDocxButton
                runId={runId}
                disabled={blocks.length === 0}
                onAuthError={handleAuthError}
              />
            </div>
          </div>

          {/* Three-pane grid */}
          <div className="grid h-[calc(100dvh-13rem)] min-h-[36rem] grid-cols-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_18rem]">
            <BlockListSidebar
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onSelect={setSelectedBlockId}
            />
            <BlockWorkspace
              runId={runId}
              block={selectedBlock}
              onBlockUpdated={replaceBlock}
              onAuthError={handleAuthError}
            />
            <SourceAttributionPanel block={selectedBlock} />
          </div>
        </div>
      </ReferenceValueProvider>
    </SidebarLayout>
  );
}


/** Center pane — block title toolbar + the rendered Tiptap document. */
function BlockWorkspace({ runId, block, onBlockUpdated, onAuthError }) {
  if (!block) {
    return (
      <section className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-sm text-gray-400">
        Select a block to start editing.
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
      <BlockToolbar
        runId={runId}
        block={block}
        onBlockUpdated={onBlockUpdated}
        onAuthError={onAuthError}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <BlockRenderer doc={block.content} />
      </div>
    </section>
  );
}


/** Title + lock-status row sitting above the block content. */
function BlockToolbar({ runId, block, onBlockUpdated, onAuthError }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(block.title);
  const [titlePending, setTitlePending] = useState(false);
  const [unlockPending, setUnlockPending] = useState(false);
  const [titleError, setTitleError] = useState(/** @type {string | null} */(null));

  // Reset draft if the block prop changes underneath us.
  useEffect(() => {
    setDraftTitle(block.title);
    setEditingTitle(false);
    setTitleError(null);
  }, [block.id, block.title]);

  const saveTitle = async () => {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      setTitleError('Title cannot be empty');
      return;
    }
    if (trimmed === block.title) {
      setEditingTitle(false);
      return;
    }
    setTitlePending(true);
    setTitleError(null);
    try {
      const updated = await sparkzApi.patchStatementBlock(runId, block.id, { title: trimmed });
      onBlockUpdated(updated);
      setEditingTitle(false);
    } catch (err) {
      if (onAuthError(err)) return;
      setTitleError(err instanceof Error ? err.message : 'Failed to update title');
    } finally {
      setTitlePending(false);
    }
  };

  const unlock = async () => {
    setUnlockPending(true);
    try {
      const updated = await sparkzApi.patchStatementBlock(runId, block.id, { unlock: true });
      onBlockUpdated(updated);
    } catch (err) {
      if (onAuthError(err)) return;
      // surface in the toolbar as a non-fatal toast-like line
      setTitleError(err instanceof Error ? err.message : 'Failed to unlock block');
    } finally {
      setUnlockPending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-3">
      <div className="min-w-0 flex-1">
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              value={draftTitle}
              autoFocus
              maxLength={500}
              onChange={(e) => { setDraftTitle(e.target.value); setTitleError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveTitle(); }
                if (e.key === 'Escape') {
                  setDraftTitle(block.title); setEditingTitle(false); setTitleError(null);
                }
              }}
              disabled={titlePending}
              className="text-base font-bold"
            />
            <Button size="sm" onClick={saveTitle} disabled={titlePending}>
              {titlePending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setDraftTitle(block.title); setEditingTitle(false); setTitleError(null); }}
              disabled={titlePending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="block w-full truncate text-left text-base font-bold text-[#1e1b4b] hover:text-indigo-700"
            title="Click to rename"
          >
            {block.title || '(untitled)'}
          </button>
        )}
        {titleError && (
          <p className="mt-1 text-xs text-red-700">{titleError}</p>
        )}
      </div>

      {block.is_locked ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-amber-100">
            <Lock className="h-3 w-3" />
            Edited
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={unlock}
            disabled={unlockPending}
            title="Unlock so re-generation can overwrite this block"
          >
            <LockOpen className="h-3.5 w-3.5" />
            {unlockPending ? 'Unlocking…' : 'Unlock'}
          </Button>
        </div>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
          <RefreshCcw className="h-3 w-3" />
          Re-generatable
        </span>
      )}
    </div>
  );
}


/**
 * Header-strip button that triggers the DOCX export. Disabled while no blocks
 * exist; shows pending + error states inline so the toolbar layout is stable.
 *
 * @param {{
 *   runId: string,
 *   disabled: boolean,
 *   onAuthError: (err: unknown) => boolean,
 * }} props
 */
function ExportDocxButton({ runId, disabled, onAuthError }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */(null));

  const handleClick = async () => {
    setPending(true);
    setError(null);
    try {
      await sparkzApi.downloadStatementDocx(runId);
    } catch (err) {
      if (onAuthError(err)) return;
      setError(err instanceof Error ? err.message : 'Failed to export DOCX');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || pending}
        className="inline-flex items-center gap-2 rounded-xl bg-[#16133a] px-4 py-2 text-xs font-bold text-white hover:bg-[#25216b] disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {pending ? 'Building…' : 'Export DOCX'}
      </button>
      {error && (
        <span className="text-[11px] text-red-700" title={error}>
          {error.length > 60 ? `${error.slice(0, 60)}…` : error}
        </span>
      )}
    </div>
  );
}

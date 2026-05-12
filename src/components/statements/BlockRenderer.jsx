// BlockRenderer
// =============
// Recursive renderer: Tiptap JSON document → React.
//
// Node types handled (must mirror what backend `generator/tiptap.py` emits):
//   doc, heading, paragraph, text, hardBreak,
//   table, tableRow, tableHeader, tableCell, referenceToken.
//
// Unknown node types render a small warning chip so we notice immediately
// if the backend introduces a node we haven't accounted for.
//
// `<ReferenceToken>` reads from the ReferenceValueProvider context (so a
// value edit anywhere in the run instantly re-renders every place it's
// cited). Clicking a token surfaces the edit popover.

import { useState } from 'react';
import { useReferenceValues } from './ReferenceValueProvider';
import { ReferenceEditPopover } from './ReferenceEditPopover';

/**
 * Render any Tiptap-shaped JSON document to React. Safe against missing /
 * malformed nodes — returns null rather than throwing.
 *
 * @param {{ doc: any }} props
 */
export function BlockRenderer({ doc }) {
  if (!doc || typeof doc !== 'object') {
    return <EmptyHint>Block has no content yet.</EmptyHint>;
  }
  if (doc.type !== 'doc') {
    return <UnknownNode type={String(doc.type)} />;
  }
  return (
    <div className="prose prose-sm max-w-none text-gray-900">
      {(doc.content || []).map((node, i) => (
        <Node key={i} node={node} />
      ))}
    </div>
  );
}

/** Dispatch one node to the right React component by type. */
function Node({ node }) {
  if (!node || typeof node !== 'object' || !node.type) return null;
  switch (node.type) {
    case 'heading':       return <HeadingNode node={node} />;
    case 'paragraph':     return <ParagraphNode node={node} />;
    case 'text':          return <TextNode node={node} />;
    case 'hardBreak':     return <br />;
    case 'table':         return <TableNode node={node} />;
    case 'tableRow':      return <TableRowNode node={node} />;
    case 'tableHeader':   return <TableHeaderNode node={node} />;
    case 'tableCell':     return <TableCellNode node={node} />;
    case 'referenceToken':return <ReferenceToken node={node} />;
    default:              return <UnknownNode type={node.type} />;
  }
}

// ── Block-level nodes ───────────────────────────────────────────────────────

function HeadingNode({ node }) {
  const level = Math.min(Math.max(parseInt(node?.attrs?.level ?? 2, 10) || 2, 1), 6);
  const children = (node.content || []).map((c, i) => <Node key={i} node={c} />);
  switch (level) {
    case 1: return <h1 className="text-2xl font-black text-brand-indigo mt-6 mb-3 first:mt-0">{children}</h1>;
    case 2: return <h2 className="text-lg font-bold text-brand-indigo mt-5 mb-2">{children}</h2>;
    case 3: return <h3 className="text-base font-bold text-gray-700 mt-4 mb-2">{children}</h3>;
    default: return <h4 className="text-sm font-semibold text-gray-700 mt-3 mb-2">{children}</h4>;
  }
}

function ParagraphNode({ node }) {
  const children = (node.content || []).map((c, i) => <Node key={i} node={c} />);
  return <p className="text-sm leading-relaxed text-gray-800 mb-3 last:mb-0">{children}</p>;
}

function TextNode({ node }) {
  return <>{node.text ?? ''}</>;
}

function TableNode({ node }) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <tbody>
          {(node.content || []).map((row, i) => <Node key={i} node={row} />)}
        </tbody>
      </table>
    </div>
  );
}

function TableRowNode({ node }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      {(node.content || []).map((c, i) => <Node key={i} node={c} />)}
    </tr>
  );
}

function TableHeaderNode({ node }) {
  return (
    <th className="border-b-2 border-brand-indigo/30 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-brand-indigo">
      {(node.content || []).map((c, i) => <CellInner key={i} node={c} />)}
    </th>
  );
}

function TableCellNode({ node }) {
  return (
    <td className="px-3 py-2 align-top text-sm text-gray-800">
      {(node.content || []).map((c, i) => <CellInner key={i} node={c} />)}
    </td>
  );
}

/** Inside a cell, paragraphs are visually flattened (no margin). */
function CellInner({ node }) {
  if (node?.type === 'paragraph') {
    return (
      <span className="block">
        {(node.content || []).map((c, i) => <Node key={i} node={c} />)}
      </span>
    );
  }
  return <Node node={node} />;
}

// ── Reference token ─────────────────────────────────────────────────────────

/**
 * Clickable inline node that shows the current value of a referenced
 * accounting figure. Reading the value through the
 * ReferenceValueProvider context makes every instance update instantly
 * when the user edits the underlying reference.
 *
 * @param {{ node: any }} props
 */
function ReferenceToken({ node }) {
  const { getValue, byRefId, pendingByRefId, errorByRefId } = useReferenceValues();
  const refId = node?.attrs?.ref_id;
  const fallback = node?.attrs?.display_value ?? '';
  const [popoverOpen, setPopoverOpen] = useState(false);

  if (!refId) {
    return <span className="rounded bg-red-50 px-1 text-xs text-red-700 line-through">[ref?]</span>;
  }

  const live = getValue(refId);
  const entry = byRefId[refId];
  const display = live ?? fallback ?? '—';
  const pending = !!pendingByRefId[refId];
  const errored = !!errorByRefId[refId];

  // Render the value with thousand separators when the stored value parses
  // cleanly as a number. We keep the stored string as the source of truth
  // for editing; the formatter is display-only.
  const formattedDisplay = formatForDisplay(display);

  return (
    <>
      <button
        type="button"
        onClick={() => setPopoverOpen(true)}
        className={
          'inline-flex items-baseline rounded px-1 py-0 -mx-0.5 transition-colors ' +
          'font-mono tabular-nums ' +
          (errored
            ? 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100'
            : pending
              ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
              : 'bg-indigo-50/60 text-indigo-900 hover:bg-indigo-100 hover:ring-1 hover:ring-indigo-200')
        }
        title={
          entry
            ? `${entry.account_key} / ${entry.period}${entry.last_edited_at ? ' (edited)' : ''}`
            : 'reference'
        }
      >
        {formattedDisplay}
      </button>
      {popoverOpen && (
        <ReferenceEditPopover
          refId={refId}
          onClose={() => setPopoverOpen(false)}
        />
      )}
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function UnknownNode({ type }) {
  return (
    <span
      className="inline-block rounded bg-yellow-50 px-1 text-xs font-mono text-yellow-800"
      title={`Unknown Tiptap node type: ${type}`}
    >
      ?{type}
    </span>
  );
}

function EmptyHint({ children }) {
  return <p className="text-sm italic text-gray-400">{children}</p>;
}

/**
 * Format a stored value for display. Negatives keep parens; we DON'T
 * round or alter precision. If the input doesn't parse as a number,
 * return it untouched.
 *
 * @param {string} v
 */
function formatForDisplay(v) {
  if (v == null || v === '') return '—';
  const trimmed = String(v).trim();
  // Already formatted (e.g. "(9,450,944)") — keep as-is
  if (/[,(]/.test(trimmed)) return trimmed;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return trimmed;
  const abs = Math.abs(n);
  const isInt = abs === Math.floor(abs);
  const body = isInt ? abs.toLocaleString('en-GB') : abs.toLocaleString('en-GB', { minimumFractionDigits: 2 });
  return n < 0 ? `(${body})` : body;
}

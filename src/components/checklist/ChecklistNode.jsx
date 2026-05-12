import { useState } from 'react';

const INDENT = { 0: '', 1: 'ml-0', 2: 'ml-6', 3: 'ml-12' };

const AnswerToggle = ({ nodeId, answers, onChange }) => {
  const current = answers[nodeId] || null;
  const options = [
    { val: 'Y',  label: 'Yes', active: 'bg-green-600 text-white border-green-600' },
    { val: 'N',  label: 'No',  active: 'bg-red-500 text-white border-red-500' },
    { val: 'NA', label: 'N/A', active: 'bg-gray-400 text-white border-gray-400' },
  ];
  return (
    <div className="flex items-center gap-1 flex-shrink-0 ml-4">
      {options.map(opt => (
        <button
          key={opt.val}
          onClick={() => onChange(nodeId, current === opt.val ? null : opt.val)}
          className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-all ${current === opt.val ? opt.active : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

function isApplicable(node, entityType) {
  if (!entityType || !node.applicability_rules?.length) return true;
  const entityRules = node.applicability_rules.filter(r => r.rule_type === 'entity_type');
  if (!entityRules.length) return true;
  return entityRules.some(r => {
    if (r.operator === '=') return r.value_json === entityType;
    if (r.operator === '!=') return r.value_json !== entityType;
    return true;
  });
}

export default function ChecklistNode({ node, answers, onChange, entityType }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const indent = INDENT[node.level] || 'ml-12';
  const isSection = node.level === 0;
  const applicable = isApplicable(node, entityType);

  if (isSection) {
    return (
      <div className={`mb-6 ${!applicable ? 'opacity-40' : ''}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-brand-indigo text-white rounded-xl text-left hover:bg-[#2a2768] transition-colors"
        >
          <span className="w-6 h-6 flex items-center justify-center bg-brand-gold text-brand-indigo rounded-md text-xs font-black flex-shrink-0">
            {node.display_number}
          </span>
          <span className="font-bold text-sm flex-1">{node.title}</span>
          {!applicable && <span className="text-xs text-purple-300 italic">not applicable</span>}
          <span className="text-purple-300 text-xs font-medium">
            {node.children?.length || 0} items
          </span>
          <svg className={`w-4 h-4 text-purple-300 transition-transform flex-shrink-0 ${collapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>
        </button>

        {!collapsed && hasChildren && (
          <div className="mt-2 space-y-1">
            {node.children.map(child => (
              <ChecklistNode key={child.id} node={child} answers={answers} onChange={onChange} entityType={entityType} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${indent} ${!applicable ? 'opacity-40' : ''}`}>
      <div className={`group flex items-start gap-3 px-4 py-3 rounded-lg transition-colors ${applicable ? 'hover:bg-[#f0f0f8]' : ''} ${node.level === 1 ? 'border-b border-gray-100' : ''}`}>
        <span className={`flex-shrink-0 text-xs font-bold mt-0.5 w-10 ${node.level === 1 ? 'text-brand-indigo' : 'text-gray-400'}`}>
          {node.display_number}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-relaxed ${node.level === 1 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {node.title}
          </p>
          {node.references?.length > 0 && (
            <p className="mt-1 text-xs text-gray-400 italic">
              {node.references.map(r => r.citation).join(' · ')}
            </p>
          )}
          {!applicable && (
            <p className="mt-0.5 text-xs text-orange-400 font-medium">Not applicable to this entity type</p>
          )}
          {hasChildren && !collapsed && (
            <div className="mt-2 space-y-0.5">
              {node.children.map(child => (
                <ChecklistNode key={child.id} node={child} answers={answers} onChange={onChange} entityType={entityType} />
              ))}
            </div>
          )}
        </div>
        {node.is_answerable && applicable && (
          <AnswerToggle nodeId={node.id} answers={answers} onChange={onChange} />
        )}
      </div>
    </div>
  );
}
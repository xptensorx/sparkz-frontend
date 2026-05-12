import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { sparkzApi } from '../components/services/sparkzApi';
import { useAuth } from '@/lib/AuthContext';

const FRAMEWORKS = [
  { value: 'ifrs',   label: 'IFRS',                hint: 'IFRS as adopted by the UK — for listed entities and PIEs' },
  { value: 'frs102', label: 'FRS 102 Section 1A', hint: 'Reduced disclosures for small entities' },
  { value: 'frs105', label: 'FRS 105',            hint: 'Streamlined disclosures for micro-entities' },
];

// Whitelists must mirror the backend (schemas_stmt.ALLOWED_*_EXTS).
const EXCEL_EXTS = ['.xlsx'];
const PRIOR_EXTS = ['.pdf', '.docx'];
const CONTEXT_EXTS = ['.pdf', '.docx'];

function extOf(name = '') {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function FileSlot({ label, hint, accept, file, onChange, required = false }) {
  const inputRef = useRef(null);
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files[0] || null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`group w-full rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-all ${
          file
            ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
            : 'border-gray-200 bg-gray-50/30 hover:border-indigo-200 hover:bg-indigo-50/20'
        }`}
      >
        {file ? (
          <div>
            <p className="font-bold text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(0)} KB · click to replace
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-bold text-gray-700">Drop or click to upload</p>
            <p className="text-xs text-gray-500 mt-1">{hint}</p>
          </div>
        )}
      </button>
    </div>
  );
}

function MultiFileSlot({ label, hint, accept, files, onChange }) {
  const inputRef = useRef(null);

  const addFiles = (newFiles) => {
    if (!newFiles || newFiles.length === 0) return;
    onChange([...files, ...Array.from(newFiles)]);
  };
  const removeAt = (idx) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {label}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group w-full rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/30 px-5 py-6 text-center transition-all hover:border-indigo-200 hover:bg-indigo-50/20"
      >
        <p className="text-sm font-bold text-gray-700">
          {files.length === 0 ? 'Drop or click to upload' : `Add another (${files.length} so far)`}
        </p>
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      </button>
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm"
            >
              <span className="truncate text-gray-800">
                {f.name}
                <span className="ml-2 text-xs text-gray-400">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="ml-3 text-xs font-semibold text-red-500 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StatementsNew() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [engagementName, setEngagementName] = useState('');
  const [framework, setFramework] = useState('frs102');
  const [entityName, setEntityName] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('');
  const [priorPeriod, setPriorPeriod] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  const [priorYearFile, setPriorYearFile] = useState(null);
  const [contextFiles, setContextFiles] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Client-side validation mirrors backend rules so the user gets a
  // clear message before we burn a network round-trip.
  const validateLocally = () => {
    if (!engagementName.trim()) return 'Engagement name is required.';
    if (!excelFile) return 'A mapped Excel (.xlsx) is required.';
    if (!EXCEL_EXTS.includes(extOf(excelFile.name))) {
      return `Excel must be one of: ${EXCEL_EXTS.join(', ')}`;
    }
    if (priorYearFile && !PRIOR_EXTS.includes(extOf(priorYearFile.name))) {
      return `Prior-year file must be one of: ${PRIOR_EXTS.join(', ')}`;
    }
    for (const cf of contextFiles) {
      if (!CONTEXT_EXTS.includes(extOf(cf.name))) {
        return `Context document "${cf.name}" must be one of: ${CONTEXT_EXTS.join(', ')}`;
      }
    }
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const localErr = validateLocally();
    if (localErr) { setError(localErr); return; }

    setSubmitting(true);
    const fd = new FormData();
    fd.append('engagement_name', engagementName.trim());
    fd.append('framework', framework);
    if (entityName.trim()) fd.append('entity_name', entityName.trim());
    if (reportingPeriod.trim()) fd.append('reporting_period', reportingPeriod.trim());
    if (priorPeriod.trim()) fd.append('prior_period', priorPeriod.trim());
    fd.append('excel', excelFile);
    if (priorYearFile) fd.append('prior_year', priorYearFile);
    for (const cf of contextFiles) fd.append('context', cf);

    try {
      const created = await sparkzApi.createStatement(fd);
      navigate(`/statements/${created.id}`, { replace: true });
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message || 'Failed to create engagement.');
      setSubmitting(false);
    }
  };

  return (
    <SidebarLayout activePage="Statements">
      <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-indigo-dark via-brand-indigo to-[#312e81] px-6 py-8 text-white shadow-xl shadow-indigo-950/30 ring-1 ring-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-200/90">New engagement</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Generate financial statements</h2>
          <p className="mt-3 text-sm text-violet-100/85 max-w-xl">
            Upload your mapped Excel plus any supporting context. We&apos;ll draft a complete set of UK statements you can review and edit in-browser.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/60 ring-1 ring-black/[0.04] sm:p-8"
        >
          <div className="space-y-7">
            {/* Engagement metadata */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Engagement name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={engagementName}
                onChange={(e) => setEngagementName(e.target.value)}
                placeholder="e.g. Acme Ltd FY2025"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                required
                maxLength={255}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Framework <span className="text-red-500">*</span>
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                {FRAMEWORKS.map((f) => (
                  <label
                    key={f.value}
                    className={`relative flex cursor-pointer flex-col rounded-2xl border-2 p-4 transition-all ${
                      framework === f.value
                        ? 'border-brand-indigo-dark bg-gradient-to-br from-indigo-50/80 to-white shadow-md ring-1 ring-indigo-100'
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="framework"
                        value={f.value}
                        checked={framework === f.value}
                        onChange={() => setFramework(f.value)}
                        className="mt-1 accent-brand-indigo-dark"
                      />
                      <div>
                        <span className={`text-sm font-bold ${framework === f.value ? 'text-brand-indigo-dark' : 'text-gray-700'}`}>
                          {f.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-1 leading-snug">{f.hint}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Entity name</label>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="Acme Ltd"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Reporting period</label>
                <input
                  type="text"
                  value={reportingPeriod}
                  onChange={(e) => setReportingPeriod(e.target.value)}
                  placeholder="FY2025"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Prior period</label>
                <input
                  type="text"
                  value={priorPeriod}
                  onChange={(e) => setPriorPeriod(e.target.value)}
                  placeholder="FY2024"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* File slots */}
            <div className="space-y-5">
              <FileSlot
                label="Mapped Excel"
                hint=".xlsx · the structured account mapping"
                accept=".xlsx"
                file={excelFile}
                onChange={setExcelFile}
                required
              />
              <FileSlot
                label="Prior-year statements (optional)"
                hint=".pdf · used to extract the in-house style and tone"
                accept=".pdf"
                file={priorYearFile}
                onChange={setPriorYearFile}
              />
              <MultiFileSlot
                label="Context documents (optional)"
                hint=".pdf or .docx · e.g. 20-F, board minutes, engagement scope"
                accept=".pdf,.docx"
                files={contextFiles}
                onChange={setContextFiles}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/statements')}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-brand-gold to-brand-gold-dark py-3 text-sm font-black text-brand-indigo-dark shadow-lg shadow-amber-900/15 hover:shadow-xl hover:brightness-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Uploading…' : 'Create engagement →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}

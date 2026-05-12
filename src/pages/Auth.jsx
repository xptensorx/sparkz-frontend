import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SparkzLogo from '../components/SparkzLogo';
import { useAuth } from '@/lib/AuthContext';

const passwordRules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
];

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();
  const [tab, setTab] = useState('signup');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'signin' || t === 'signup') setTab(t);
  }, [searchParams]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const allRulesPassed = passwordRules.every(r => r.test(form.password));
    if (tab === 'signup' && !allRulesPassed) return;
    setLoading(true);
    try {
      if (tab === 'signup') {
        await register(form.email.trim(), form.password);
      } else {
        await login(form.email.trim(), form.password);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = passwordRules.filter(r => r.test(form.password)).length;

  return (
    <div className="flex min-h-[100dvh] bg-[#f8f8fb]">
      <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-brand-indigo flex-col justify-between p-12">
        <SparkzLogo variant="light" />
        <div>
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/10 text-purple-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-pulse" />
              Trusted by 500+ accounting firms
            </div>
            <h2 className="text-3xl font-black text-white leading-tight mb-4">
              The smarter way to manage disclosure checklists.
            </h2>
            <p className="text-purple-200 text-sm leading-relaxed">
              AI-powered compliance for IFRS, FRS 102, and more. Save hours of manual review every month.
            </p>
          </div>
        </div>
        <p className="text-purple-300 text-xs">© 2026 Sparkz AI Technologies Inc.</p>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <SparkzLogo />
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            {[{ val: 'signup', label: 'Create account' }, { val: 'signin', label: 'Sign in' }].map(t => (
              <button
                key={t.val}
                type="button"
                onClick={() => setTab(t.val)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === t.val ? 'bg-white text-brand-indigo shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'signup' ? (
            <>
              <h1 className="text-2xl font-black text-brand-indigo mb-1">Create your account</h1>
              <p className="text-sm text-gray-500 mb-6">Start automating your disclosure checklists today.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black text-brand-indigo mb-1">Welcome back</h1>
              <p className="text-sm text-gray-500 mb-6">Sign in to your Sparkz workspace.</p>
            </>
          )}

          {formError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                  <input
                    value={form.firstName}
                    onChange={e => set('firstName', e.target.value)}
                    placeholder="Alex"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo/20 focus:border-brand-indigo transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                  <input
                    value={form.lastName}
                    onChange={e => set('lastName', e.target.value)}
                    placeholder="Rivera"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo/20 focus:border-brand-indigo transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Work email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="alex@yourfirm.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo/20 focus:border-brand-indigo transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  onFocus={() => setFocused(true)}
                  placeholder={tab === 'signup' ? 'Create a strong password' : 'Enter your password'}
                  required
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo/20 focus:border-brand-indigo pr-11 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
                  </svg>
                </button>
              </div>

              {tab === 'signup' && focused && form.password && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= pwStrength ? pwStrength === 1 ? 'bg-red-400' : pwStrength === 2 ? 'bg-brand-gold' : 'bg-green-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <div className="space-y-1">
                    {passwordRules.map(rule => (
                      <div key={rule.label} className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${rule.test(form.password) ? 'bg-green-500' : 'bg-gray-200'}`}>
                          {rule.test(form.password) && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                        <span className={`text-xs transition-colors ${rule.test(form.password) ? 'text-green-700' : 'text-gray-400'}`}>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-gold text-brand-indigo font-bold rounded-xl hover:bg-[#d4b034] transition-colors disabled:opacity-70 text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Please wait...
                </span>
              ) : tab === 'signup' ? 'Create account →' : 'Sign in to Sparkz →'}
            </button>
          </form>

          {tab === 'signup' && (
            <p className="mt-5 text-center text-xs text-gray-400 leading-relaxed">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

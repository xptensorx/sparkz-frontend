import { useNavigate } from 'react-router-dom';
import SparkzLogo from '../components/SparkzLogo';

const plans = [
  { name: 'Free',    price: '£0',   analyses: '3 analyses/mo',   cta: 'Get Started',      highlight: false },
  { name: 'Starter', price: '£50',  analyses: '10 analyses/mo',  cta: 'Start Free Trial',  highlight: false },
  { name: 'Builder', price: '£100', analyses: '25 analyses/mo',  cta: 'Start Free Trial',  highlight: true  },
  { name: 'Pro',     price: '£200', analyses: '50 analyses/mo',  cta: 'Contact Sales',     highlight: false },
  { name: 'Elite',   price: '£300', analyses: '100 analyses/mo', cta: 'Contact Sales',     highlight: false },
];

const features = [
  { icon: '🔍', title: 'Automated Extraction', desc: 'Our AI parses your PDFs and spreadsheets, instantly mapping data to disclosure requirements without manual work.' },
  { icon: '✅', title: 'Framework Checks', desc: 'Built-in intelligence for IFRS, FRS, and UK GAAP. Stay compliant with the latest regulatory updates automatically applied.' },
  { icon: '📄', title: 'Export-Ready Reports', desc: 'Generate audit-ready Excel or PDF reports in seconds. Ready to be included in your financial statements or workpapers.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const goToAuth = (mode = 'signup') => {
    const tab = typeof mode === 'string' && (mode === 'signup' || mode === 'signin') ? mode : 'signup';
    navigate(`/login?tab=${encodeURIComponent(tab)}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#1e1b4b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6 md:min-h-[3.5rem] md:py-0">
          <SparkzLogo variant="light" />
          <div className="order-3 flex w-full items-center justify-center gap-5 border-t border-white/10 pt-3 text-xs text-purple-200 sm:order-none sm:w-auto sm:border-0 sm:pt-0 md:gap-6 md:text-sm">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => goToAuth('signin')}
              className="text-xs font-medium text-purple-200 transition-colors hover:text-white sm:text-sm"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => goToAuth('signup')}
              className="rounded-lg bg-[#e6c33a] px-3 py-1.5 text-xs font-bold text-[#1e1b4b] transition-colors hover:bg-[#d4b034] sm:px-4 sm:py-2 sm:text-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero - dark purple like reference site */}
      <section className="bg-[#1e1b4b] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-purple-200 sm:mb-6">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e6c33a]" />
              AI-Powered Compliance
            </div>
            <h1 className="mb-5 text-3xl font-black leading-[1.15] text-white sm:mb-6 sm:text-4xl md:text-5xl">
              Automate your<br />
              <span className="text-[#e6c33a]">disclosure</span>
              <br />
              checklists with AI.
            </h1>
            <p className="mb-6 text-base leading-relaxed text-purple-200 sm:mb-8 sm:text-lg">
              Upload financial statements, select your framework, and get instant compliance insights. Save hours of manual review.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <button
                type="button"
                onClick={() => goToAuth('signup')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e6c33a] px-5 py-3 font-bold text-[#1e1b4b] transition-colors hover:bg-[#d4b034] sm:px-6"
              >
                Start your free analysis →
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white transition-colors hover:bg-white/10 sm:px-6"
              >
                Book a demo
              </button>
            </div>
            <p className="mt-5 text-xs text-purple-300 sm:mt-6">Trusted by 500+ accounting firms</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="space-y-3">
                {[
                  { label: 'IAS 1.10 — Complete Statements', status: 'Met', color: 'bg-green-500', chip: 'bg-green-900/50 text-green-300' },
                  { label: 'IFRS 16.53 — Lease Disclosures', status: 'Partial', color: 'bg-[#e6c33a]', chip: 'bg-yellow-900/50 text-yellow-300' },
                  { label: 'IAS 24.18 — Related Parties', status: 'Missing', color: 'bg-red-400', chip: 'bg-red-900/50 text-red-300' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`} />
                    <span className="text-sm text-white font-medium">{item.label}</span>
                    <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${item.chip}`}>{item.status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 bg-green-900/30 rounded-lg p-3">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>
                <span className="text-sm text-green-300 font-semibold">98.4% Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#f8f8fb] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-14">
            <h2 className="mb-3 text-2xl font-black text-[#1e1b4b] sm:text-3xl">Streamline Your Compliance Workflow</h2>
            <p className="mx-auto max-w-2xl text-sm text-gray-500 sm:text-base">
              Everything you need to manage financial reporting disclosures in one secure, AI-powered platform.
            </p>
          </div>
          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md transition-shadow hover:border-[#e6c33a]/40">
                <div className="w-12 h-12 bg-[#1e1b4b] rounded-xl flex items-center justify-center mb-4 text-2xl">
                  {f.icon}
                </div>
                <h3 className="font-bold text-[#1e1b4b] mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-14">
            <h2 className="mb-3 text-2xl font-black text-[#1e1b4b] sm:text-3xl">Simple, scalable pricing</h2>
            <p className="text-sm text-gray-500 sm:text-base">Choose the plan that fits your firm&apos;s volume. No hidden setup fees.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-2xl border-2 p-5 transition-all sm:p-6 ${
                  plan.highlight
                    ? 'border-[#e6c33a] bg-[#1e1b4b] text-white shadow-xl md:scale-[1.02]'
                    : 'border-gray-200 bg-white hover:border-[#1e1b4b]/30'
                }`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${plan.highlight ? 'text-[#e6c33a]' : 'text-gray-400'}`}>{plan.name}</div>
                <div className={`text-2xl font-black mb-1 ${plan.highlight ? 'text-white' : 'text-[#1e1b4b]'}`}>{plan.price}</div>
                <div className={`text-xs mb-4 ${plan.highlight ? 'text-purple-300' : 'text-gray-400'}`}>/mo</div>
                <div className={`text-sm font-medium mb-6 ${plan.highlight ? 'text-purple-200' : 'text-gray-600'}`}>{plan.analyses}</div>
                <button
                  type="button"
                  onClick={() => goToAuth('signup')}
                  className={`mt-auto py-2.5 rounded-xl text-sm font-bold transition-colors ${plan.highlight ? 'bg-[#e6c33a] text-[#1e1b4b] hover:bg-[#d4b034]' : 'bg-[#1e1b4b] text-white hover:opacity-90'}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-[#1e1b4b] py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="mb-3 text-2xl font-black text-white sm:text-3xl">Ready to automate your disclosures?</h2>
          <p className="mb-6 text-sm text-purple-200 sm:mb-8 sm:text-base">
            Join hundreds of accounting firms saving hours on compliance every week.
          </p>
          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={() => goToAuth('signup')}
              className="rounded-xl bg-[#e6c33a] px-6 py-3 font-bold text-[#1e1b4b] transition-colors hover:bg-[#d4b034]"
            >
              Start your free analysis
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/30 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Schedule a demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#17153d] py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <SparkzLogo variant="light" size="sm" />
              <p className="mt-3 text-sm text-purple-300 leading-relaxed">The AI platform for modern financial compliance.</p>
            </div>
            {[
              { title: 'Product', links: ['AI Disclosures', 'Frameworks', 'Reporting', 'Pricing'] },
              { title: 'Company', links: ['About Us', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-white font-semibold text-sm mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}><a href="#" className="text-purple-300 text-sm hover:text-white transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-purple-300">© 2026 Sparkz AI Technologies Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
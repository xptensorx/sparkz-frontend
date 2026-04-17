import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { sparkzApi } from '../components/services/sparkzApi';
import { useAuth } from '@/lib/AuthContext';

const FREE_QUOTA_FALLBACK = 3;
const PAID_STATUSES = new Set(['active', 'trialing', 'past_due']);

const STATIC_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '£49',
    period: '/month',
    highlight: false,
    features: ['FRS 102 & 105 checklists', 'CSV export', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: '£99',
    period: '/month',
    highlight: true,
    features: ['Everything in Starter', 'Higher monthly quota', 'Priority processing (coming)'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    highlight: false,
    stripe: false,
    features: ['SSO & audit logs', 'Dedicated success manager', 'Custom retention', 'SLA'],
  },
];

export default function Billing() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [banner, setBanner] = useState(null);

  const quota = user?.monthly_quota ?? FREE_QUOTA_FALLBACK;
  const used = user?.analyses_completed_this_month ?? 0;
  const remaining = Math.max(0, quota - used);

  const subStatus = (user?.subscription_status || '').toLowerCase();
  const isPaidActive = PAID_STATUSES.has(subStatus);
  const currentPlan = (user?.billing_plan || 'free').toLowerCase();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await sparkzApi.billingConfig();
        if (!cancelled) setConfig(c);
      } catch (e) {
        if (!cancelled) setConfigError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout !== 'success' && checkout !== 'cancel') return;

    const sessionId = searchParams.get('session_id');
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    next.delete('session_id');
    setSearchParams(next, { replace: true });

    if (checkout === 'cancel') {
      setBanner({ type: 'warn', text: 'Checkout was cancelled. No changes were made.' });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (sessionId) {
          await sparkzApi.billingCompleteCheckout(sessionId);
        } else {
          await sparkzApi.billingSyncSubscription();
        }
        if (cancelled) return;
        await refreshUser?.();
        const c = await sparkzApi.billingConfig();
        if (!cancelled) setConfig(c);
        if (!cancelled) {
          setBanner({
            type: 'ok',
            text: 'You are subscribed. Your plan and monthly quota are updated.',
          });
        }
      } catch (e) {
        if (cancelled) return;
        try {
          await sparkzApi.billingSyncSubscription();
          await refreshUser?.();
          const c = await sparkzApi.billingConfig();
          if (!cancelled) setConfig(c);
          setBanner({
            type: 'ok',
            text: 'You are subscribed. Your plan and monthly quota are updated.',
          });
        } catch {
          setBanner({
            type: 'warn',
            text:
              e.message ||
              'Payment may have succeeded. Refresh this page or check the billing portal if your plan still looks wrong.',
          });
          await refreshUser?.();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, refreshUser]);

  const goCheckout = async (planId) => {
    setBusy(planId);
    setBanner(null);
    try {
      const { url } = await sparkzApi.billingCheckout(planId);
      if (url) window.location.href = url;
    } catch (e) {
      setBanner({ type: 'err', text: e.message || 'Could not start checkout.' });
    } finally {
      setBusy(null);
    }
  };

  const goPortal = async () => {
    setBusy('portal');
    setBanner(null);
    try {
      const { url } = await sparkzApi.billingPortal();
      if (url) window.location.href = url;
    } catch (e) {
      setBanner({ type: 'err', text: e.message || 'Could not open billing portal.' });
    } finally {
      setBusy(null);
    }
  };

  const checkoutReady = config?.checkout_ready;
  const quotaFor = (id) => config?.plans?.find((p) => p.id === id)?.monthly_quota;

  return (
    <SidebarLayout activePage="Billing">
      <div className="mx-auto max-w-5xl space-y-8 pb-8 sm:space-y-10 sm:pb-12">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6366f1]">Billing</p>
          <h1 className="text-2xl font-black tracking-tight text-[#1e1b4b] sm:text-3xl">Plan & usage</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-base">
            Usage limits follow your subscription. Subscribe with Stripe Checkout; changes sync via webhooks to this app.
          </p>
        </div>

        {banner && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              banner.type === 'ok'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : banner.type === 'warn'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {banner.text}
          </div>
        )}

        {configError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Could not load billing config: {configError}
          </div>
        )}

        {config && !config.checkout_ready && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Stripe is not fully configured on the server.</p>
            <p className="mt-1 text-amber-900/90">
              Set <code className="rounded bg-amber-100/80 px-1">STRIPE_SECRET_KEY</code>,{' '}
              <code className="rounded bg-amber-100/80 px-1">STRIPE_PRICE_STARTER</code>,{' '}
              <code className="rounded bg-amber-100/80 px-1">STRIPE_PRICE_PRO</code>,{' '}
              <code className="rounded bg-amber-100/80 px-1">STRIPE_WEBHOOK_SECRET</code>, and{' '}
              <code className="rounded bg-amber-100/80 px-1">PUBLIC_FRONTEND_URL</code> (your SPA origin). Forward webhooks to{' '}
              <code className="rounded bg-amber-100/80 px-1">/api/billing/webhook</code>.
            </p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] p-6 text-white shadow-xl shadow-indigo-900/20 ring-1 ring-white/10 sm:rounded-3xl sm:p-8">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#e6c33a]/20 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-widest text-purple-200/90">Current allowance</p>
              <p className="text-xs text-purple-200/70 mt-1">
                Plan: <span className="font-bold text-white capitalize">{user?.billing_plan || 'free'}</span>
                {user?.subscription_status && (
                  <span className="ml-2 opacity-80">({user.subscription_status})</span>
                )}
              </p>
              <p className="mt-3 text-4xl font-black tabular-nums">
                {remaining}
                <span className="text-lg font-semibold text-purple-200/80"> / {quota}</span>
              </p>
              <p className="mt-1 text-sm text-purple-100/90">analyses you can still complete this calendar month</p>
              <div className="mt-6 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#e6c33a] transition-all duration-500"
                  style={{ width: `${quota ? Math.min(100, (used / quota) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-purple-200/80">{used} used · resets on the 1st of each month</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/[0.03] sm:rounded-3xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Stripe</p>
            <h2 className="mt-2 text-lg font-bold text-[#1e1b4b]">Manage subscription</h2>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              Update payment method, cancel, or download invoices in the Stripe Customer Portal.
            </p>
            <button
              type="button"
              onClick={goPortal}
              disabled={busy === 'portal' || !config?.portal_available}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#16133a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#25216b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {busy === 'portal' ? 'Opening…' : 'Open billing portal'}
            </button>
            {!config?.portal_available && (
              <p className="mt-2 text-xs text-gray-400">Available after you complete a subscription checkout.</p>
            )}
            <p className="mt-4 text-xs text-gray-400">
              Questions?{' '}
              <a href="mailto:support@sparkz.ai" className="font-medium text-[#1e1b4b] hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#1e1b4b] mb-1">Compare plans</h2>
          <p className="text-sm text-gray-500 mb-6">
            Checkout uses your Stripe product prices. Quotas: free {config?.free_quota ?? '—'} · starter{' '}
            {quotaFor('starter') ?? '—'} · pro {quotaFor('pro') ?? '—'} per month when subscribed.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {STATIC_PLANS.map((plan) => {
              const isEnterprise = plan.id === 'enterprise';
              const canStripe = !isEnterprise && checkoutReady;
              const isCurrentPlan = !isEnterprise && isPaidActive && plan.id === currentPlan;
              const isDowngradeCard =
                !isEnterprise && isPaidActive && currentPlan === 'pro' && plan.id === 'starter';
              const showUpgradeCta =
                !isEnterprise &&
                isPaidActive &&
                currentPlan === 'starter' &&
                plan.id === 'pro';
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-shadow ${
                    plan.highlight
                      ? 'border-[#e6c33a] bg-gradient-to-b from-amber-50/80 to-white shadow-lg shadow-amber-900/5 ring-2 ring-[#e6c33a]/30'
                      : 'border-gray-100 bg-white shadow-sm ring-1 ring-black/[0.03]'
                  } ${isCurrentPlan ? 'ring-2 ring-emerald-500/40 border-emerald-200/80' : ''}`}
                >
                  {isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Current plan
                    </span>
                  )}
                  {plan.highlight && !isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1e1b4b] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#e6c33a]">
                      Popular
                    </span>
                  )}
                  <h3 className="text-lg font-black text-[#1e1b4b]">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#1e1b4b]">{plan.price}</span>
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  </div>
                  {!isEnterprise && (
                    <p className="mt-1 text-sm text-gray-600">
                      <span className="font-semibold text-[#1e1b4b]">
                        {plan.id === 'starter' ? (quotaFor('starter') ?? '—') : (quotaFor('pro') ?? '—')}
                      </span>{' '}
                      analyses / month (when active)
                    </p>
                  )}
                  <ul className="mt-5 space-y-2.5 text-sm text-gray-600 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="mt-0.5 text-emerald-500" aria-hidden>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isEnterprise ? (
                    <a
                      href="mailto:support@sparkz.ai?subject=Sparkz%20Enterprise"
                      className="mt-6 block w-full rounded-xl border-2 border-gray-200 py-2.5 text-center text-sm font-bold text-[#1e1b4b] hover:border-[#e6c33a] transition-colors"
                    >
                      Contact sales
                    </a>
                  ) : isCurrentPlan ? (
                    <button
                      type="button"
                      disabled
                      className="mt-6 w-full cursor-not-allowed rounded-xl border-2 border-emerald-200 bg-emerald-50/90 py-2.5 text-sm font-bold text-emerald-800"
                    >
                      Current plan
                    </button>
                  ) : isDowngradeCard ? (
                    <button
                      type="button"
                      disabled
                      className="mt-6 w-full cursor-not-allowed rounded-xl border-2 border-gray-200 bg-gray-50 py-2.5 text-sm font-bold text-gray-500"
                    >
                      Change plan in billing portal
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canStripe || busy === plan.id}
                      onClick={() => goCheckout(plan.id)}
                      className={`mt-6 w-full rounded-xl py-2.5 text-sm font-bold transition-colors ${
                        plan.highlight
                          ? 'bg-[#e6c33a] text-[#1e1b4b] hover:brightness-95 disabled:opacity-40'
                          : 'bg-[#16133a] text-white hover:bg-[#25216b] disabled:opacity-40'
                      } disabled:cursor-not-allowed`}
                    >
                      {busy === plan.id
                        ? 'Redirecting…'
                        : checkoutReady
                          ? showUpgradeCta
                            ? 'Upgrade'
                            : 'Subscribe'
                          : 'Configure Stripe'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-5 text-center text-sm text-gray-500">
          <Link to="/dashboard" className="font-semibold text-[#1e1b4b] hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </SidebarLayout>
  );
}

/**
 * Shared navigation metadata for app shell (desktop sidebar + mobile drawer).
 */
export const APP_NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    page: 'Dashboard',
    icon: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />,
  },
  {
    label: 'Document analysis',
    path: '/analysis',
    page: 'Analysis',
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
  },
  {
    label: 'Billing & plan',
    path: '/billing',
    page: 'Billing',
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </>
    ),
  },
  {
    label: 'Admin',
    path: '/admin',
    page: 'Admin',
    adminOnly: true,
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
];

export function getAppHeaderCopy(pathname) {
  if (pathname.startsWith('/analysis')) {
    return {
      title: 'Document analysis',
      subtitle: 'Upload a PDF and run the AI disclosure checklist',
    };
  }
  if (pathname.startsWith('/billing')) {
    return {
      title: 'Billing & plan',
      subtitle: 'Usage, limits, and subscription',
    };
  }
  if (pathname.startsWith('/admin')) {
    return { title: 'Admin', subtitle: 'Templates and user activity' };
  }
  if (pathname.startsWith('/dashboard')) {
    return { title: 'Dashboard', subtitle: 'Your analyses and workspace' };
  }
  return { title: 'Sparkz', subtitle: 'AI disclosure compliance' };
}

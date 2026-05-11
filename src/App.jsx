import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Admin from './pages/Admin';
import Billing from './pages/Billing';
import Statements from './pages/Statements';
import StatementsNew from './pages/StatementsNew';
import StatementsDetail from './pages/StatementsDetail';
import StatementsEditor from './pages/StatementsEditor';

function RequireAuth() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f8f8fb]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Navigate to="/login?tab=signup" replace />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/analysis/:runId" element={<Analysis />} />
        <Route path="/statements" element={<Statements />} />
        <Route path="/statements/new" element={<StatementsNew />} />
        <Route path="/statements/:runId" element={<StatementsDetail />} />
        <Route path="/statements/:runId/editor" element={<StatementsEditor />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;

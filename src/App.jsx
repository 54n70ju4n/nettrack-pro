import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useEffect } from 'react';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './pages/Dashboard';
import Floors from './pages/Floors';
import FloorDetail from './pages/FloorDetail';
import Points from './pages/Points';
import Checklist from './pages/Checklist';
import Configuration from './pages/Configuration';
import Templates from './pages/Templates';
import AppLayout from './components/layout/AppLayout';
import { loadTemplatesFromDB } from './lib/checklistTemplates';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Load templates from DB on app start
  useEffect(() => { loadTemplatesFromDB(); }, []);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pisos" element={<Floors />} />
        <Route path="/pisos/:floorId" element={<FloorDetail />} />
        <Route path="/puntos" element={<Points />} />
        <Route path="/checklist/:pointId" element={<Checklist />} />
        <Route path="/configuracion" element={<Configuration />} />
        <Route path="/plantillas" element={<Templates />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
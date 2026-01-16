import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { getProfile } from './lib/auth';
import type { Profile } from './types';

import LoginPage from './pages/Login';
import IssuePage from './pages/Issue';
import OperatorPage from './pages/Operator';
import ReportsPage from './pages/Reports';
import AdminPage from './pages/Admin';
import PrintPage from './pages/Print';
import ScreenInternalPage from './pages/ScreenInternal';
import ScreenExternalPage from './pages/ScreenExternal';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile();
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async () => {
    const p = await getProfile();
    setProfile(p);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/queue/print/:ticketId" element={<PrintPage />} />
        <Route path="/queue/screens/internal" element={<ScreenInternalPage />} />
        <Route path="/queue/screens/external" element={<ScreenExternalPage />} />
        
        <Route
          path="/queue/issue"
          element={
            <ProtectedRoute allowedRoles={['admin', 'reception_security']} profile={profile}>
              <IssuePage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/queue/operator"
          element={
            <ProtectedRoute allowedRoles={['admin', 'operator_queue']} profile={profile}>
              <OperatorPage profile={profile} />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/queue/reports"
          element={
            <ProtectedRoute allowedRoles={['admin']} profile={profile}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/queue/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']} profile={profile}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        
        <Route path="/" element={<Navigate to={user ? "/queue/operator" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

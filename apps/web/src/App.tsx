import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/routes/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { OperatorPage } from './pages/OperatorPage';
import { IssuePage } from './pages/IssuePage';
import { ScreensPage } from './pages/ScreensPage';
import { ReportsPage } from './pages/Reports';
import { AdminPage } from './pages/Admin';
import { SettingsPage } from './pages/SettingsPage';
import { PrintPage } from './pages/Print';
import { NotFound } from './pages/NotFound';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route path="/queue/print/:ticketId" element={<PrintPage />} />

        {/* Protected routes with layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/operator/:queueType"
          element={
            <ProtectedRoute allowedRoles={['admin', 'operator_queue']}>
              <AppLayout>
                <OperatorPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/issue"
          element={
            <ProtectedRoute allowedRoles={['admin', 'reception_security']}>
              <AppLayout>
                <IssuePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/screens"
          element={
            <ProtectedRoute allowedRoles={['admin', 'operator_queue', 'reception_security']}>
              <ScreensPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <ReportsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Legacy routes - redirects */}
        <Route path="/queue/issue" element={<Navigate to="/issue" replace />} />
        <Route path="/queue/operator" element={<Navigate to="/operator/reg" replace />} />
        <Route path="/queue/reports" element={<Navigate to="/reports" replace />} />
        <Route path="/queue/admin" element={<Navigate to="/admin" replace />} />
        <Route
          path="/queue/screens/internal"
          element={<Navigate to="/screens" replace />}
        />
        <Route
          path="/queue/screens/external"
          element={<Navigate to="/screens" replace />}
        />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            <Navigate
              to={user ? getDefaultRouteForUser() : '/login'}
              replace
            />
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function getDefaultRouteForUser(): string {
  // This will be determined by ProtectedRoute based on role
  return '/dashboard';
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;

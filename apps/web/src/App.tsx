import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfficeProvider, useOffice } from './contexts/OfficeContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { useAccessibleOffices } from './hooks/useAccessibleOffices';
import { buildOfficePath, buildOfficeScreenPath, buildRoleDefaultPath } from './lib/office-routing';
import { AdminPage } from './pages/Admin';
import { Dashboard } from './pages/Dashboard';
import { IssuePage } from './pages/IssuePage';
import { LoginPage } from './pages/LoginPage';
import { NotFound } from './pages/NotFound';
import { OperatorPage } from './pages/OperatorPage';
import PrintPage from './pages/Print';
import { ReportsPage } from './pages/Reports';
import { ScreensPage } from './pages/ScreensPage';
import { SettingsPage } from './pages/SettingsPage';
import type { UserRole } from './types';

function FullScreenLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Загрузка...</p>
      </div>
    </div>
  );
}

function OfficeRoute({
  allowedRoles,
  children,
  withLayout = true,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  withLayout?: boolean;
}) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <OfficeProvider>
        {withLayout ? <AppLayout>{children}</AppLayout> : children}
      </OfficeProvider>
    </ProtectedRoute>
  );
}

function RootRedirect({
  target,
  screenMode,
}: {
  target?: string;
  screenMode?: 'internal' | 'external';
}) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const { defaultOffice, isLoading } = useAccessibleOffices({ enabled: !!user });

  if (loading || (user && isLoading)) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile || !defaultOffice) {
    return <Navigate to="/login" replace />;
  }

  if (screenMode) {
    return (
      <Navigate
        to={`${buildOfficeScreenPath(defaultOffice.slug, screenMode)}${location.search}`}
        replace
      />
    );
  }

  if (target) {
    return <Navigate to={`${buildOfficePath(defaultOffice.slug, target)}${location.search}`} replace />;
  }

  return <Navigate to={`${buildRoleDefaultPath(profile.role, defaultOffice.slug)}${location.search}`} replace />;
}

function OfficeHomeRedirect() {
  const { profile } = useAuth();
  const { office } = useOffice();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={buildRoleDefaultPath(profile.role, office.slug)} replace />;
}

function SameOfficeRedirect({ target }: { target: string }) {
  const { office } = useOffice();

  return <Navigate to={buildOfficePath(office.slug, target)} replace />;
}

function PublicScreensRoute() {
  return <ScreensPage />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />

        <Route path="/screen/:officeSlug" element={<PublicScreensRoute />} />
        <Route path="/screen/:officeSlug/:mode" element={<PublicScreensRoute />} />

        <Route
          path="/:officeSlug"
          element={
            <OfficeRoute allowedRoles={['admin', 'operator_queue', 'reception_security']}>
              <OfficeHomeRedirect />
            </OfficeRoute>
          }
        />

        <Route
          path="/:officeSlug/dashboard"
          element={
            <OfficeRoute allowedRoles={['admin']}>
              <Dashboard />
            </OfficeRoute>
          }
        />

        <Route
          path="/:officeSlug/operator/:queueType"
          element={
            <OfficeRoute allowedRoles={['admin', 'operator_queue']}>
              <OperatorPage />
            </OfficeRoute>
          }
        />

        <Route
          path="/:officeSlug/operator"
          element={
            <OfficeRoute allowedRoles={['admin', 'operator_queue']}>
              <SameOfficeRedirect target="/operator/reg" />
            </OfficeRoute>
          }
        />

        <Route
          path="/:officeSlug/issue"
          element={
            <OfficeRoute allowedRoles={['admin', 'reception_security']}>
              <IssuePage />
            </OfficeRoute>
          }
        />

        <Route
          path="/:officeSlug/reports"
          element={
            <OfficeRoute allowedRoles={['admin']}>
              <ReportsPage />
            </OfficeRoute>
          }
        />

        <Route
          path="/:officeSlug/admin"
          element={
            <OfficeRoute allowedRoles={['admin']}>
              <AdminPage />
            </OfficeRoute>
          }
        />

        <Route
          path="/:officeSlug/settings"
          element={
            <OfficeRoute allowedRoles={['admin']}>
              <SettingsPage />
            </OfficeRoute>
          }
        />

        <Route
          path="/:officeSlug/print"
          element={
            <OfficeRoute allowedRoles={['admin', 'reception_security']} withLayout={false}>
              <PrintPage />
            </OfficeRoute>
          }
        />

        <Route path="/dashboard" element={<RootRedirect target="/dashboard" />} />
        <Route path="/operator" element={<RootRedirect target="/operator/reg" />} />
        <Route path="/operator/:queueType" element={<RootRedirect target="/operator/reg" />} />
        <Route path="/issue" element={<RootRedirect target="/issue" />} />
        <Route path="/reports" element={<RootRedirect target="/reports" />} />
        <Route path="/admin" element={<RootRedirect target="/admin" />} />
        <Route path="/settings" element={<RootRedirect target="/settings" />} />
        <Route path="/screens" element={<RootRedirect screenMode="internal" />} />
        <Route path="/print" element={<RootRedirect target="/print" />} />

        <Route path="/queue/issue" element={<RootRedirect target="/issue" />} />
        <Route path="/queue/operator" element={<RootRedirect target="/operator/reg" />} />
        <Route path="/queue/reports" element={<RootRedirect target="/reports" />} />
        <Route path="/queue/admin" element={<RootRedirect target="/admin" />} />
        <Route path="/queue/screens/internal" element={<RootRedirect screenMode="internal" />} />
        <Route path="/queue/screens/external" element={<RootRedirect screenMode="external" />} />

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;

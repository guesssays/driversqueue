import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import type { UserRole } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LogOut, AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

export function ProtectedRoute({ children, allowedRoles, fallbackPath }: ProtectedRouteProps) {
  const { user, signOut, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error } = useProfile();
  const location = useLocation();

  // Show loading state
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Profile error - show error screen instead of redirect loop
  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Профиль не найден или доступ запрещён
            </h2>
            {error && (
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {error}
                </span>
              </p>
            )}
            <p className="text-gray-600 mb-6">
              Обратитесь к администратору для настройки доступа.
            </p>
            <Button onClick={signOut} variant="primary">
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Check role access
  if (!allowedRoles.includes(profile.role)) {
    // Redirect to fallback or default route
    const redirectPath = fallbackPath || getDefaultRouteForRole(profile.role);
    // Show message briefly via state, then redirect
    return (
      <Navigate
        to={redirectPath}
        state={{ message: 'Недостаточно прав доступа' }}
        replace
      />
    );
  }

  return <>{children}</>;
}

function getDefaultRouteForRole(role: string): string {
  const routes: Record<string, string> = {
    admin: '/dashboard',
    operator_queue: '/operator/reg',
    reception_security: '/issue',
  };
  return routes[role] || '/dashboard';
}

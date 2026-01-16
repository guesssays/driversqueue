import { Navigate } from 'react-router-dom';
import type { Profile, UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  profile: Profile | null;
}

export default function ProtectedRoute({ children, allowedRoles, profile }: ProtectedRouteProps) {
  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Недостаточно прав доступа</div>
      </div>
    );
  }

  return <>{children}</>;
}

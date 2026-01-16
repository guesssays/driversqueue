import { LogOut, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function TopBar({ onMenuClick, showMenuButton = false }: TopBarProps) {
  const { user, profile, signOut } = useAuth();

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Администратор',
      operator_queue: 'Оператор',
      reception_security: 'Ресепшен',
    };
    return labels[role] || role;
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-900">Электронная очередь</h1>
      </div>

      <div className="flex items-center gap-4">
        {profile && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900">
              {user?.email || 'Пользователь'}
            </span>
            <span className="text-xs text-gray-500">{getRoleLabel(profile.role)}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Выйти</span>
        </Button>
      </div>
    </header>
  );
}

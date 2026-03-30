import { LogOut, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOffice } from '../../contexts/OfficeContext';
import { replaceOfficeSlug } from '../../lib/office-routing';
import { Button } from '../ui/Button';

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function TopBar({ onMenuClick, showMenuButton = false }: TopBarProps) {
  const { user, profile, signOut } = useAuth();
  const { office, offices } = useOffice();
  const location = useLocation();
  const navigate = useNavigate();

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ',
      operator_queue: 'РћРїРµСЂР°С‚РѕСЂ',
      reception_security: 'Р РµСЃРµРїС€РµРЅ',
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
        <div>
          <h1 className="text-xl font-bold text-gray-900">Р­Р»РµРєС‚СЂРѕРЅРЅР°СЏ РѕС‡РµСЂРµРґСЊ</h1>
          <p className="text-xs text-gray-500">{office.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {offices.length > 1 && (
          <select
            value={office.slug}
            onChange={(event) => navigate(replaceOfficeSlug(location.pathname, event.target.value))}
            className="hidden md:block px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {offices.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        )}
        {profile && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900">
              {user?.email || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'}
            </span>
            <span className="text-xs text-gray-500">{getRoleLabel(profile.role)}</span>
          </div>
        )}
        {(import.meta.env.DEV || import.meta.env.VITE_SHOW_VERSION) && (
          <span className="text-xs text-gray-400 hidden lg:inline" title="Build version">
            v{import.meta.env.VITE_APP_VERSION || 'dev'}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Р’С‹Р№С‚Рё</span>
        </Button>
      </div>
    </header>
  );
}

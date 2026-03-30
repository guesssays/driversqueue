import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Ticket,
  Monitor,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useOffice } from '../../contexts/OfficeContext';
import { useProfile } from '../../hooks/useProfile';
import { buildOfficePath, buildOfficeScreenPath } from '../../lib/office-routing';
import type { UserRole } from '../../types';

interface MenuItem {
  path: (officeSlug: string) => string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    path: (officeSlug) => buildOfficePath(officeSlug, '/dashboard'),
    label: 'РџР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ',
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    path: (officeSlug) => buildOfficePath(officeSlug, '/operator/reg'),
    label: 'РћРїРµСЂР°С‚РѕСЂ (Р РµРіРёСЃС‚СЂР°С†РёСЏ)',
    icon: Users,
    roles: ['admin', 'operator_queue'],
  },
  {
    path: (officeSlug) => buildOfficePath(officeSlug, '/operator/tech'),
    label: 'РћРїРµСЂР°С‚РѕСЂ (РўРµС…. РІРѕРїСЂРѕСЃС‹)',
    icon: Users,
    roles: ['admin', 'operator_queue'],
  },
  {
    path: (officeSlug) => buildOfficePath(officeSlug, '/issue'),
    label: 'Р’С‹РґР°С‡Р° Р±РёР»РµС‚РѕРІ',
    icon: Ticket,
    roles: ['admin', 'reception_security'],
  },
  {
    path: (officeSlug) => buildOfficeScreenPath(officeSlug),
    label: 'РўР°Р±Р»Рѕ',
    icon: Monitor,
    roles: ['admin', 'operator_queue', 'reception_security'],
  },
  {
    path: (officeSlug) => buildOfficePath(officeSlug, '/settings'),
    label: 'РќР°СЃС‚СЂРѕР№РєРё',
    icon: Settings,
    roles: ['admin'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const { hasRole } = useProfile();
  const { office } = useOffice();
  const location = useLocation();

  const filteredItems = menuItems.filter((item) => hasRole(item.roles));

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed && <span className="font-bold text-lg">РњРµРЅСЋ</span>}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded hover:bg-gray-100 hidden md:block"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const path = item.path(office.slug);
            const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

            return (
              <li key={path}>
                <NavLink
                  to={path}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    'hover:bg-gray-100',
                    {
                      'bg-blue-50 text-blue-700 font-medium': isActive,
                      'text-gray-700': !isActive,
                    },
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 z-50',
          'transition-all duration-300 ease-in-out',
          {
            '-translate-x-full md:translate-x-0': !isOpen,
            'translate-x-0': isOpen,
            'w-64': !isCollapsed,
            'w-16': isCollapsed,
          },
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

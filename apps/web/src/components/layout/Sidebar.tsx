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
import { useProfile } from '../../hooks/useProfile';
import type { UserRole } from '../../types';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    path: '/dashboard',
    label: 'Панель управления',
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    path: '/operator/reg',
    label: 'Оператор (Регистрация)',
    icon: Users,
    roles: ['admin', 'operator_queue'],
  },
  {
    path: '/operator/tech',
    label: 'Оператор (Тех. вопросы)',
    icon: Users,
    roles: ['admin', 'operator_queue'],
  },
  {
    path: '/issue',
    label: 'Выдача билетов',
    icon: Ticket,
    roles: ['admin', 'reception_security'],
  },
  {
    path: '/screens',
    label: 'Табло',
    icon: Monitor,
    roles: ['admin', 'operator_queue', 'reception_security'],
  },
  {
    path: '/settings',
    label: 'Настройки',
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
  const { profile, hasRole } = useProfile();
  const location = useLocation();

  // Filter items based on role
  const filteredItems = menuItems.filter((item) => hasRole(item.roles));

  // Filter operator items based on assigned queue
  const visibleItems = filteredItems.filter((item) => {
    if (item.path.startsWith('/operator/')) {
      if (profile?.role === 'operator_queue') {
        // Only show the queue type assigned to this operator
        const queueType = item.path.includes('/reg') ? 'REG' : 'TECH';
        return profile.operator_queue_type === queueType;
      }
      // Admin can see both
      return true;
    }
    return true;
  });

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed && <span className="font-bold text-lg">Меню</span>}
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

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    'hover:bg-gray-100',
                    {
                      'bg-blue-50 text-blue-700 font-medium': isActive,
                      'text-gray-700': !isActive,
                    }
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
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 z-50',
          'transition-all duration-300 ease-in-out',
          {
            '-translate-x-full md:translate-x-0': !isOpen,
            'translate-x-0': isOpen,
            'w-64': !isCollapsed,
            'w-16': isCollapsed,
          }
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

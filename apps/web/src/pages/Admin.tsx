import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import type { Profile, UserRole } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { extractWindowNumber } from '../lib/window-utils';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'config'>('users');

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.getUsers(),
  });

  const handleUpdateUser = async (userId: string, updates: Partial<Profile>) => {
    try {
      await adminApi.updateUser(userId, updates);
      refetchUsers();
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Администрирование</h1>
        <p className="text-gray-600">Управление пользователями</p>
      </div>

      <Card padding="none">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Пользователи
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'config'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Настройки
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Управление пользователями</h2>
              {!users ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Роль</th>
                        <th className="text-left p-2">Очередь</th>
                        <th className="text-left p-2">Окно</th>
                        <th className="text-left p-2">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map((user) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          onUpdate={(updates) => handleUpdateUser(user.id, updates)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div>
              <p className="text-gray-600 mb-4">
                Настройки системы перенесены на отдельную страницу.
              </p>
              <Button variant="primary" onClick={() => window.location.href = '/settings'}>
                Перейти в Настройки
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function UserRow({ user, onUpdate }: { user: Profile; onUpdate: (updates: Partial<Profile>) => void }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<UserRole>(user.role);
  // Extract window number from window_label, default to empty
  const currentWindowNum = extractWindowNumber(user.window_label);
  const [windowNumber, setWindowNumber] = useState<number | ''>(currentWindowNum || '');

  const handleSave = () => {
    // Store window_label as plain number string "1".."9" (not "Окно 1" or "Oyna 1")
    // This will be extracted and formatted on frontend for display
    const windowLabel = windowNumber ? String(windowNumber) : null;
    onUpdate({
      role,
      operator_queue_type: null, // Operators can now serve both queues, so operator_queue_type is set to NULL
      window_label: windowLabel,
    });
    setEditing(false);
  };

  return (
    <tr className="border-b">
      <td className="p-2 font-mono text-xs">{user.id.slice(0, 8)}...</td>
      <td className="p-2">
        {editing ? (
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="px-2 py-1 border rounded">
            <option value="admin">admin</option>
            <option value="operator_queue">operator_queue</option>
            <option value="reception_security">reception_security</option>
          </select>
        ) : (
          user.role
        )}
      </td>
      <td className="p-2">
        {/* operator_queue_type is no longer used - operators can serve both queues */}
        <span className="text-gray-400">-</span>
      </td>
      <td className="p-2">
        {editing ? (
          role === 'operator_queue' ? (
            <select
              value={windowNumber}
              onChange={(e) => setWindowNumber(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              className="px-2 py-1 border rounded w-32"
            >
              <option value="">-</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <option key={num} value={num}>
                  Окно {num}
                </option>
              ))}
            </select>
          ) : (
            '-'
          )
        ) : (
          user.window_label ? (extractWindowNumber(user.window_label) ? `Окно ${extractWindowNumber(user.window_label)}` : user.window_label) : '-'
        )}
      </td>
      <td className="p-2">
        {editing ? (
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" variant="primary">
              Сохранить
            </Button>
            <Button onClick={() => setEditing(false)} size="sm" variant="secondary">
              Отмена
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)} size="sm" variant="primary">
            Редактировать
          </Button>
        )}
      </td>
    </tr>
  );
}

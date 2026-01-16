import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import type { Profile, SystemConfig, UserRole, QueueType } from '../types';

export default function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'config'>('users');

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.getUsers(),
  });

  const { data: config, refetch: refetchConfig } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => adminApi.getConfig(),
  });

  const handleUpdateUser = async (userId: string, updates: Partial<Profile>) => {
    try {
      await adminApi.updateUser(userId, updates);
      refetchUsers();
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления');
    }
  };

  const handleUpdateConfig = async (updates: Partial<SystemConfig>) => {
    try {
      await adminApi.updateConfig(updates);
      refetchConfig();
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Администрирование</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Выход
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md">
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
              </div>
            )}

            {activeTab === 'config' && config && (
              <div>
                <h2 className="text-xl font-bold mb-4">Настройки системы</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">URL логотипа</label>
                    <input
                      type="url"
                      value={config.logo_url}
                      onChange={(e) => handleUpdateConfig({ logo_url: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.qr_enabled}
                        onChange={(e) => handleUpdateConfig({ qr_enabled: e.target.checked })}
                      />
                      <span>Включить QR-коды на билетах</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Дней хранения данных</label>
                    <input
                      type="number"
                      value={config.retention_days}
                      onChange={(e) => handleUpdateConfig({ retention_days: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Часовой пояс</label>
                    <input
                      type="text"
                      value={config.timezone}
                      onChange={(e) => handleUpdateConfig({ timezone: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, onUpdate }: { user: Profile; onUpdate: (updates: Partial<Profile>) => void }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<UserRole>(user.role);
  const [queueType, setQueueType] = useState<QueueType | null>(user.operator_queue_type);
  const [windowLabel, setWindowLabel] = useState(user.window_label || '');

  const handleSave = () => {
    onUpdate({
      role,
      operator_queue_type: role === 'operator_queue' ? queueType : null,
      window_label: windowLabel || null,
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
        {editing ? (
          role === 'operator_queue' ? (
            <select value={queueType || ''} onChange={(e) => setQueueType(e.target.value as QueueType || null)} className="px-2 py-1 border rounded">
              <option value="">-</option>
              <option value="REG">REG</option>
              <option value="TECH">TECH</option>
            </select>
          ) : (
            '-'
          )
        ) : (
          user.operator_queue_type || '-'
        )}
      </td>
      <td className="p-2">
        {editing ? (
          <input
            type="text"
            value={windowLabel}
            onChange={(e) => setWindowLabel(e.target.value)}
            className="px-2 py-1 border rounded w-32"
            placeholder="Окно 1"
          />
        ) : (
          user.window_label || '-'
        )}
      </td>
      <td className="p-2">
        {editing ? (
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-2 py-1 bg-blue-600 text-white text-sm rounded">
              Сохранить
            </button>
            <button onClick={() => setEditing(false)} className="px-2 py-1 bg-gray-400 text-white text-sm rounded">
              Отмена
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="px-2 py-1 bg-blue-600 text-white text-sm rounded">
            Редактировать
          </button>
        )}
      </td>
    </tr>
  );
}

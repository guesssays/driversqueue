import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Office, Profile, UserRole } from '../types';
import { useOffice } from '../contexts/OfficeContext';
import { adminApi } from '../lib/api';
import { extractWindowNumber } from '../lib/window-utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

type AdminTab = 'users' | 'offices' | 'config';

export function AdminPage() {
  const { office } = useOffice();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.getUsers(),
  });

  const { data: offices, refetch: refetchOffices } = useQuery({
    queryKey: ['admin-offices'],
    queryFn: () => adminApi.getOffices(),
  });

  const handleUpdateUser = async (userId: string, updates: Partial<Profile>) => {
    try {
      await adminApi.updateUser(userId, updates);
      await refetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ');
    }
  };

  const handleSaveOffice = async (payload: Partial<Office> & Pick<Office, 'name' | 'code' | 'slug'>) => {
    try {
      await adminApi.saveOffice(payload);
      await refetchOffices();
      await refetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'РћС€РёР±РєР° РѕС„РёСЃР°');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">РђРґРјРёРЅРёСЃС‚СЂРёСЂРѕРІР°РЅРёРµ</h1>
        <p className="text-gray-600">РђРєС‚РёРІРЅС‹Р№ РѕС„РёСЃ: {office.name}</p>
      </div>

      <Card padding="none">
        <div className="border-b">
          <div className="flex flex-wrap">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              РџРѕР»СЊР·РѕРІР°С‚РµР»Рё
            </button>
            <button
              onClick={() => setActiveTab('offices')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'offices'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              РћС„РёСЃС‹
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'config'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              РќР°СЃС‚СЂРѕР№РєРё
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div>
              <h2 className="text-xl font-bold mb-4">РЈРїСЂР°РІР»РµРЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРјРё</h2>
              {!users || !offices ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Р РѕР»СЊ</th>
                        <th className="text-left p-2">РћС„РёСЃ</th>
                        <th className="text-left p-2">Р”РµС„РѕР»С‚РЅС‹Р№ РѕС„РёСЃ</th>
                        <th className="text-left p-2">РћРєРЅРѕ</th>
                        <th className="text-left p-2">Р”РµР№СЃС‚РІРёСЏ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          offices={offices}
                          onUpdate={(updates) => handleUpdateUser(user.id, updates)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'offices' && (
            <OfficeSettingsPanel offices={offices || []} onSaveOffice={handleSaveOffice} />
          )}

          {activeTab === 'config' && (
            <div>
              <p className="text-gray-600 mb-4">
                РќР°СЃС‚СЂРѕР№РєРё РѕС‚РєСЂС‹РІР°СЋС‚СЃСЏ РІРЅСѓС‚СЂРё РєРѕРЅС‚РµРєСЃС‚Р° РєРѕРЅРєСЂРµС‚РЅРѕРіРѕ РѕС„РёСЃР°.
              </p>
              <Button variant="primary" onClick={() => (window.location.href = `/${office.slug}/settings`)}>
                РџРµСЂРµР№С‚Рё РІ РЅР°СЃС‚СЂРѕР№РєРё РѕС„РёСЃР°
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function UserRow({
  user,
  offices,
  onUpdate,
}: {
  user: Profile;
  offices: Office[];
  onUpdate: (updates: Partial<Profile>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<UserRole>(user.role);
  const [assignedOfficeId, setAssignedOfficeId] = useState<string>(user.office_ids?.[0] || '');
  const [defaultOfficeId, setDefaultOfficeId] = useState<string>(user.default_office_id || '');
  const currentWindowNum = extractWindowNumber(user.window_label);
  const [windowNumber, setWindowNumber] = useState<number | ''>(currentWindowNum || '');

  const handleSave = () => {
    const officeIds = role === 'admin' ? [] : assignedOfficeId ? [assignedOfficeId] : [];
    const resolvedDefaultOfficeId =
      role === 'admin' ? (defaultOfficeId || null) : assignedOfficeId || null;

    onUpdate({
      role,
      operator_queue_type: null,
      window_label: role === 'operator_queue' && windowNumber ? String(windowNumber) : null,
      office_ids: officeIds,
      default_office_id: resolvedDefaultOfficeId,
    });
    setEditing(false);
  };

  return (
    <tr className="border-b">
      <td className="p-2 font-mono text-xs">{user.id.slice(0, 8)}...</td>
      <td className="p-2">
        {editing ? (
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="px-2 py-1 border rounded"
          >
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
          role === 'admin' ? (
            <span className="text-gray-500">Р’СЃРµ РѕС„РёСЃС‹</span>
          ) : (
            <select
              value={assignedOfficeId}
              onChange={(event) => setAssignedOfficeId(event.target.value)}
              className="px-2 py-1 border rounded"
            >
              <option value="">Р’С‹Р±РµСЂРёС‚Рµ РѕС„РёСЃ</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          )
        ) : role === 'admin' ? (
          'Р’СЃРµ РѕС„РёСЃС‹'
        ) : (
          offices.find((office) => office.id === user.office_ids?.[0])?.name || '-'
        )}
      </td>
      <td className="p-2">
        {editing ? (
          <select
            value={defaultOfficeId}
            onChange={(event) => setDefaultOfficeId(event.target.value)}
            className="px-2 py-1 border rounded"
          >
            <option value="">-</option>
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </select>
        ) : (
          offices.find((office) => office.id === user.default_office_id)?.name || '-'
        )}
      </td>
      <td className="p-2">
        {editing ? (
          role === 'operator_queue' ? (
            <select
              value={windowNumber}
              onChange={(event) => setWindowNumber(event.target.value === '' ? '' : parseInt(event.target.value, 10))}
              className="px-2 py-1 border rounded w-32"
            >
              <option value="">-</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <option key={num} value={num}>
                  РћРєРЅРѕ {num}
                </option>
              ))}
            </select>
          ) : (
            '-'
          )
        ) : user.window_label ? (
          extractWindowNumber(user.window_label) ? `РћРєРЅРѕ ${extractWindowNumber(user.window_label)}` : user.window_label
        ) : (
          '-'
        )}
      </td>
      <td className="p-2">
        {editing ? (
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" variant="primary">
              РЎРѕС…СЂР°РЅРёС‚СЊ
            </Button>
            <Button onClick={() => setEditing(false)} size="sm" variant="secondary">
              РћС‚РјРµРЅР°
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)} size="sm" variant="primary">
            Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ
          </Button>
        )}
      </td>
    </tr>
  );
}

function OfficeSettingsPanel({
  offices,
  onSaveOffice,
}: {
  offices: Office[];
  onSaveOffice: (payload: Partial<Office> & Pick<Office, 'name' | 'code' | 'slug'>) => void;
}) {
  const [newOffice, setNewOffice] = useState({
    name: '',
    code: '',
    slug: '',
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">РћС„РёСЃС‹</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={newOffice.name}
            onChange={(event) => setNewOffice({ ...newOffice, name: event.target.value })}
            placeholder="РќР°Р·РІР°РЅРёРµ"
            className="px-3 py-2 border rounded"
          />
          <input
            value={newOffice.code}
            onChange={(event) => setNewOffice({ ...newOffice, code: event.target.value })}
            placeholder="code"
            className="px-3 py-2 border rounded"
          />
          <input
            value={newOffice.slug}
            onChange={(event) => setNewOffice({ ...newOffice, slug: event.target.value })}
            placeholder="slug"
            className="px-3 py-2 border rounded"
          />
          <Button
            variant="primary"
            onClick={() => {
              onSaveOffice(newOffice);
              setNewOffice({ name: '', code: '', slug: '' });
            }}
            disabled={!newOffice.name || !newOffice.code || !newOffice.slug}
          >
            РЎРѕР·РґР°С‚СЊ РѕС„РёСЃ
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">РќР°Р·РІР°РЅРёРµ</th>
              <th className="text-left p-2">Code</th>
              <th className="text-left p-2">Slug</th>
              <th className="text-left p-2">РЎС‚Р°С‚СѓСЃ</th>
              <th className="text-left p-2">Р”РµР№СЃС‚РІРёСЏ</th>
            </tr>
          </thead>
          <tbody>
            {offices.map((office) => (
              <OfficeRow key={office.id} office={office} onSaveOffice={onSaveOffice} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OfficeRow({
  office,
  onSaveOffice,
}: {
  office: Office;
  onSaveOffice: (payload: Partial<Office> & Pick<Office, 'name' | 'code' | 'slug'>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(office.name);
  const [code, setCode] = useState(office.code);
  const [slug, setSlug] = useState(office.slug);
  const [isActive, setIsActive] = useState(office.is_active);

  return (
    <tr className="border-b">
      <td className="p-2">
        {editing ? (
          <input value={name} onChange={(event) => setName(event.target.value)} className="px-2 py-1 border rounded w-full" />
        ) : (
          office.name
        )}
      </td>
      <td className="p-2">
        {editing ? (
          <input value={code} onChange={(event) => setCode(event.target.value)} className="px-2 py-1 border rounded w-full" />
        ) : (
          office.code
        )}
      </td>
      <td className="p-2">
        {editing ? (
          <input value={slug} onChange={(event) => setSlug(event.target.value)} className="px-2 py-1 border rounded w-full" />
        ) : (
          office.slug
        )}
      </td>
      <td className="p-2">
        {editing ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>{isActive ? 'active' : 'inactive'}</span>
          </label>
        ) : office.is_active ? (
          'active'
        ) : (
          'inactive'
        )}
      </td>
      <td className="p-2">
        {editing ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onSaveOffice({
                  id: office.id,
                  name,
                  code,
                  slug,
                  is_active: isActive,
                });
                setEditing(false);
              }}
            >
              РЎРѕС…СЂР°РЅРёС‚СЊ
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
              РћС‚РјРµРЅР°
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="primary" onClick={() => setEditing(true)}>
            Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ
          </Button>
        )}
      </td>
    </tr>
  );
}

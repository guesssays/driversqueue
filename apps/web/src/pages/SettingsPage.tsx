import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Save } from 'lucide-react';
import type { SystemConfig } from '../types';
import { useOffice } from '../contexts/OfficeContext';
import { adminApi } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function SettingsPage() {
  const { office } = useOffice();
  const { data: config, refetch, isLoading } = useQuery({
    queryKey: ['admin-config', office.id],
    queryFn: () => adminApi.getConfig(office.id),
  });

  const [formData, setFormData] = useState<Partial<SystemConfig>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        logo_url: config.logo_url,
        qr_enabled: config.qr_enabled,
        retention_days: config.retention_days,
        timezone: config.timezone,
        screens_lang: config.screens_lang,
      });
    }
  }, [config]);

  const handleUpdate = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      await adminApi.updateConfig(office.id, formData);
      await refetch();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const currentFormData = { ...config, ...formData };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">РќР°СЃС‚СЂРѕР№РєРё СЃРёСЃС‚РµРјС‹</h1>
        <p className="text-gray-600">РћС„РёСЃ: {office.name}</p>
      </div>

      <Card>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Р»РѕРіРѕС‚РёРїР°
            </label>
            <input
              type="url"
              value={currentFormData.logo_url || ''}
              onChange={(event) => setFormData({ ...formData, logo_url: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={currentFormData.qr_enabled ?? true}
                onChange={(event) => setFormData({ ...formData, qr_enabled: event.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Р’РєР»СЋС‡РёС‚СЊ QR-РєРѕРґС‹ РЅР° Р±РёР»РµС‚Р°С…
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Р”РЅРµР№ С…СЂР°РЅРµРЅРёСЏ РґР°РЅРЅС‹С…
            </label>
            <input
              type="number"
              value={currentFormData.retention_days || 90}
              onChange={(event) =>
                setFormData({ ...formData, retention_days: parseInt(event.target.value, 10) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Р§Р°СЃРѕРІРѕР№ РїРѕСЏСЃ
            </label>
            <input
              type="text"
              value={currentFormData.timezone || 'Asia/Tashkent'}
              onChange={(event) => setFormData({ ...formData, timezone: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Asia/Tashkent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              РЇР·С‹Рє С‚Р°Р±Р»Рѕ
            </label>
            <select
              value={currentFormData.screens_lang || 'uzLat'}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  screens_lang: event.target.value as SystemConfig['screens_lang'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="uzLat">O'zbek (Lotin)</option>
              <option value="uzCyr">РЋР·Р±РµРє (РљРёСЂРёР»Р»)</option>
              <option value="ru">Р СѓСЃСЃРєРёР№</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              РЇР·С‹Рє РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ С‚Р°Р±Р»Рѕ Рё РїРµС‡Р°С‚РЅС‹С… С‚Р°Р»РѕРЅРѕРІ
            </p>
          </div>

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>РќР°СЃС‚СЂРѕР№РєРё СѓСЃРїРµС€РЅРѕ СЃРѕС…СЂР°РЅРµРЅС‹</span>
            </div>
          )}

          <Button
            onClick={handleUpdate}
            disabled={loading}
            variant="primary"
            isLoading={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            РЎРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ
          </Button>
        </div>
      </Card>
    </div>
  );
}

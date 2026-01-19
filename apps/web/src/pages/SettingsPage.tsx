import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { SystemConfig } from '../types';
import { Save, CheckCircle } from 'lucide-react';

export function SettingsPage() {
  const { data: config, refetch, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => adminApi.getConfig(),
  });

  const [formData, setFormData] = useState<Partial<SystemConfig>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize form data when config loads
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleUpdate = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      await adminApi.updateConfig(formData);
      await refetch();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Настройки системы</h1>
        <p className="text-gray-600">Управление конфигурацией системы</p>
      </div>

      <Card>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL логотипа
            </label>
            <input
              type="url"
              value={currentFormData.logo_url || ''}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={currentFormData.qr_enabled ?? true}
                onChange={(e) => setFormData({ ...formData, qr_enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Включить QR-коды на билетах
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дней хранения данных
            </label>
            <input
              type="number"
              value={currentFormData.retention_days || 90}
              onChange={(e) =>
                setFormData({ ...formData, retention_days: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Часовой пояс
            </label>
            <input
              type="text"
              value={currentFormData.timezone || 'Asia/Tashkent'}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Asia/Tashkent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Язык табло
            </label>
            <select
              value={currentFormData.screens_lang || 'uzLat'}
              onChange={(e) => setFormData({ ...formData, screens_lang: e.target.value as 'ru' | 'uzLat' | 'uzCyr' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="uzLat">O'zbek (Lotin)</option>
              <option value="uzCyr">Ўзбек (Кирилл)</option>
              <option value="ru">Русский</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Язык отображения табло и печатных талонов
            </p>
          </div>

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>Настройки успешно сохранены</span>
            </div>
          )}

          <Button
            onClick={handleUpdate}
            disabled={loading}
            variant="primary"
            isLoading={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Сохранить изменения
          </Button>
        </div>
      </Card>
    </div>
  );
}

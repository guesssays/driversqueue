import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../lib/api';
import { DateTime } from 'luxon';
import type { ReportFilters, QueueType } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Download } from 'lucide-react';

export function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    from: DateTime.now().setZone('Asia/Tashkent').minus({ days: 7 }).toISODate() || '',
    to: DateTime.now().setZone('Asia/Tashkent').toISODate() || '',
    queueType: undefined,
    operator: undefined,
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', filters],
    queryFn: () => reportApi.getReport(filters),
    enabled: !!filters.from && !!filters.to,
  });

  const handleExport = async () => {
    try {
      await reportApi.getExcel(filters);
    } catch (err: any) {
      alert(err.message || 'Ошибка экспорта');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Отчеты</h1>
        <p className="text-gray-600">Аналитика и статистика по билетам</p>
      </div>

      <Card>
          <h2 className="text-xl font-bold mb-4">Фильтры</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">От</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">До</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Тип очереди</label>
              <select
                value={filters.queueType || ''}
                onChange={(e) => setFilters({ ...filters, queueType: e.target.value as QueueType || undefined })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Все</option>
                <option value="REG">Регистрация</option>
                <option value="TECH">Технические вопросы</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleExport}
                variant="primary"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Экспорт в Excel
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <h2 className="text-xl font-bold mb-4">Сводка</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <div className="text-sm text-gray-600">Всего билетов</div>
                  <div className="text-3xl font-bold">{report.totalTickets}</div>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <div className="text-sm text-gray-600">Регистрация</div>
                  <div className="text-3xl font-bold">{report.byQueueType.REG}</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded">
                  <div className="text-sm text-gray-600">Технические вопросы</div>
                  <div className="text-3xl font-bold">{report.byQueueType.TECH}</div>
                </div>
              </div>
            </div>

            {/* By Operator */}
            {report.byOperator.length > 0 && (
              <Card>
                <h2 className="text-xl font-bold mb-4">По операторам</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Оператор</th>
                        <th className="text-right p-2">Билетов</th>
                        <th className="text-right p-2">Среднее время (сек)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byOperator.map((op) => (
                        <tr key={op.operator_id} className="border-b">
                          <td className="p-2">{op.operator_name}</td>
                          <td className="text-right p-2">{op.count}</td>
                          <td className="text-right p-2">
                            {op.avgServiceTime !== null ? op.avgServiceTime : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tickets List */}
            <Card>
              <h2 className="text-xl font-bold mb-4">Билеты ({report.tickets.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Номер</th>
                      <th className="text-left p-2">Тип</th>
                      <th className="text-left p-2">Статус</th>
                      <th className="text-left p-2">Создан</th>
                      <th className="text-left p-2">Окно</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.tickets.slice(0, 100).map((ticket) => (
                      <tr key={ticket.id} className="border-b">
                        <td className="p-2">{ticket.ticket_number}</td>
                        <td className="p-2">{ticket.queue_type === 'REG' ? 'Регистрация' : 'Технические вопросы'}</td>
                        <td className="p-2">{getStatusLabel(ticket.status)}</td>
                        <td className="p-2">
                          {DateTime.fromISO(ticket.created_at).setZone('Asia/Tashkent').toFormat('dd.MM.yyyy HH:mm')}
                        </td>
                        <td className="p-2">{ticket.window_label || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : null}
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    WAITING: 'Ожидание',
    CALLED: 'Вызван',
    SERVING: 'Обслуживается',
    DONE: 'Завершено',
    NO_SHOW: 'Не явился',
    CANCELLED: 'Отменен',
  };
  return labels[status] || status;
}

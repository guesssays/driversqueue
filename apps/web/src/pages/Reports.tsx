import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { DateTime } from 'luxon';
import type { ReportFilters, QueueType } from '../types';

export default function ReportsPage() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Отчеты</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Выход
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Экспорт в Excel
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : report ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
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
              <div className="bg-white rounded-lg shadow-md p-6">
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
            <div className="bg-white rounded-lg shadow-md p-6">
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
            </div>
          </div>
        ) : null}
      </div>
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

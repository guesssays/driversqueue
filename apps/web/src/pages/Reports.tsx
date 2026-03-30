import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Download } from 'lucide-react';
import type { QueueType, ReportFilters } from '../types';
import { useOffice } from '../contexts/OfficeContext';
import { reportApi } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function ReportsPage() {
  const { office } = useOffice();
  const [filters, setFilters] = useState<ReportFilters>({
    officeId: office.id,
    from: DateTime.now().setZone('Asia/Tashkent').minus({ days: 7 }).toISODate() || '',
    to: DateTime.now().setZone('Asia/Tashkent').toISODate() || '',
    queueType: undefined,
    operator: undefined,
  });

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      officeId: office.id,
    }));
  }, [office.id]);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', office.id, filters],
    queryFn: () => reportApi.getReport(filters),
    enabled: !!filters.officeId && !!filters.from && !!filters.to,
  });

  const handleExport = async () => {
    try {
      await reportApi.getExcel(filters);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'РћС€РёР±РєР° СЌРєСЃРїРѕСЂС‚Р°');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">РћС‚С‡РµС‚С‹</h1>
        <p className="text-gray-600">РђРЅР°Р»РёС‚РёРєР° РїРѕ офису {office.name}</p>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-4">Р¤РёР»СЊС‚СЂС‹</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">РћС‚</label>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Р”Рѕ</label>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">РўРёРї РѕС‡РµСЂРµРґРё</label>
            <select
              value={filters.queueType || ''}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  queueType: (event.target.value as QueueType) || undefined,
                })
              }
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Р’СЃРµ</option>
              <option value="REG">Р РµРіРёСЃС‚СЂР°С†РёСЏ</option>
              <option value="TECH">РўРµС…РЅРёС‡РµСЃРєРёРµ РІРѕРїСЂРѕСЃС‹</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleExport}
              variant="primary"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Р­РєСЃРїРѕСЂС‚ РІ Excel
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : report ? (
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold mb-4">РЎРІРѕРґРєР°</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded">
                <div className="text-sm text-gray-600">Р’СЃРµРіРѕ Р±РёР»РµС‚РѕРІ</div>
                <div className="text-3xl font-bold">{report.totalTickets}</div>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <div className="text-sm text-gray-600">Р РµРіРёСЃС‚СЂР°С†РёСЏ</div>
                <div className="text-3xl font-bold">{report.byQueueType.REG}</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded">
                <div className="text-sm text-gray-600">РўРµС…РЅРёС‡РµСЃРєРёРµ РІРѕРїСЂРѕСЃС‹</div>
                <div className="text-3xl font-bold">{report.byQueueType.TECH}</div>
              </div>
            </div>
          </Card>

          {report.byOperator.length > 0 && (
            <Card>
              <h2 className="text-xl font-bold mb-4">РџРѕ РѕРїРµСЂР°С‚РѕСЂР°Рј</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">РћРїРµСЂР°С‚РѕСЂ</th>
                      <th className="text-right p-2">Р‘РёР»РµС‚РѕРІ</th>
                      <th className="text-right p-2">РЎСЂРµРґРЅРµРµ РІСЂРµРјСЏ (СЃРµРє)</th>
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
            </Card>
          )}

          <Card>
            <h2 className="text-xl font-bold mb-4">Р‘РёР»РµС‚С‹ ({report.tickets.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">РќРѕРјРµСЂ</th>
                    <th className="text-left p-2">РўРёРї</th>
                    <th className="text-left p-2">РЎС‚Р°С‚СѓСЃ</th>
                    <th className="text-left p-2">РЎРѕР·РґР°РЅ</th>
                    <th className="text-left p-2">РћРєРЅРѕ</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tickets.slice(0, 100).map((ticket) => (
                    <tr key={ticket.id} className="border-b">
                      <td className="p-2">{ticket.ticket_number}</td>
                      <td className="p-2">
                        {ticket.queue_type === 'REG' ? 'Р РµРіРёСЃС‚СЂР°С†РёСЏ' : 'РўРµС…РЅРёС‡РµСЃРєРёРµ РІРѕРїСЂРѕСЃС‹'}
                      </td>
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
    WAITING: 'РћР¶РёРґР°РЅРёРµ',
    CALLED: 'Р’С‹Р·РІР°РЅ',
    SERVING: 'РћР±СЃР»СѓР¶РёРІР°РµС‚СЃСЏ',
    DONE: 'Р—Р°РІРµСЂС€РµРЅРѕ',
    NO_SHOW: 'РќРµ СЏРІРёР»СЃСЏ',
    CANCELLED: 'РћС‚РјРµРЅРµРЅ',
  };
  return labels[status] || status;
}

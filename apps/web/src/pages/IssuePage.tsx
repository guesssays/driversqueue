import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Printer, Ticket } from 'lucide-react';
import type { QueueType } from '../types';
import { useOffice } from '../contexts/OfficeContext';
import { queueApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function IssuePage() {
  const { office } = useOffice();
  const [selectedQueue, setSelectedQueue] = useState<QueueType>('REG');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastTicket, setLastTicket] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleIssue = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await queueApi.issue({
        officeId: office.id,
        queueType: selectedQueue,
      });

      if (!result.ticket?.id) {
        throw new Error('РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ ID Р±РёР»РµС‚Р°');
      }

      setLastTicket(result.ticket.ticket_number);
      window.open(`${window.location.origin}${result.printUrl}`, '_blank');
      queryClient.invalidateQueries({ queryKey: ['screen-state', office.id] });

      setTimeout(() => {
        setLoading(false);
        setLastTicket(null);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'РћС€РёР±РєР° РїСЂРё РІС‹РґР°С‡Рµ Р±РёР»РµС‚Р°');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Р’С‹РґР°С‡Р° Р±РёР»РµС‚РѕРІ</h1>
        <p className="text-gray-600">РћС„РёСЃ: {office.name}</p>
      </div>

      <Card>
        <div className="space-y-6">
          <div>
            <label className="block text-lg font-medium mb-4 text-gray-700">
              Р’С‹Р±РµСЂРёС‚Рµ С‚РёРї РѕС‡РµСЂРµРґРё:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedQueue('REG')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedQueue === 'REG'
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <Ticket className="h-12 w-12 mx-auto mb-2" />
                  <div className="text-xl font-semibold mb-1">Р РµРіРёСЃС‚СЂР°С†РёСЏ</div>
                  <Badge variant="info">R-XXX</Badge>
                </div>
              </button>
              <button
                onClick={() => setSelectedQueue('TECH')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedQueue === 'TECH'
                    ? 'bg-green-50 border-green-600 text-green-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <Ticket className="h-12 w-12 mx-auto mb-2" />
                  <div className="text-xl font-semibold mb-1">РўРµС…РЅРёС‡РµСЃРєРёРµ РІРѕРїСЂРѕСЃС‹</div>
                  <Badge variant="success">T-XXX</Badge>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {lastTicket && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium">
                Р‘РёР»РµС‚ {lastTicket} СѓСЃРїРµС€РЅРѕ РІС‹РґР°РЅ!
              </p>
            </div>
          )}

          <Button
            onClick={handleIssue}
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={loading}
          >
            <Printer className="h-5 w-5 mr-2" />
            Р’С‹РґР°С‚СЊ Р±РёР»РµС‚ {selectedQueue === 'REG' ? 'R' : 'T'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

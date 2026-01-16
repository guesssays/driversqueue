import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queueApi } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { QueueType } from '../types';
import { Ticket, Printer } from 'lucide-react';

export function IssuePage() {
  const [selectedQueue, setSelectedQueue] = useState<QueueType>('REG');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastTicket, setLastTicket] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleIssue = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await queueApi.issue(selectedQueue);
      setLastTicket(result.ticket.ticket_number);
      
      // Open print page in new window
      const printUrl = `${window.location.origin}${result.printUrl}`;
      window.open(printUrl, '_blank');
      
      // Refresh screen state
      queryClient.invalidateQueries({ queryKey: ['screen-state'] });
      
      // Clear error after success
      setTimeout(() => {
        setLoading(false);
        setLastTicket(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Ошибка при выдаче билета');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Выдача билетов</h1>
        <p className="text-gray-600">Выберите тип очереди и выдайте билет</p>
      </div>

      <Card>
        <div className="space-y-6">
          <div>
            <label className="block text-lg font-medium mb-4 text-gray-700">
              Выберите тип очереди:
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
                  <div className="text-xl font-semibold mb-1">Регистрация</div>
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
                  <div className="text-xl font-semibold mb-1">Технические вопросы</div>
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
                Билет {lastTicket} успешно выдан!
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
            Выдать билет {selectedQueue === 'REG' ? 'R' : 'T'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

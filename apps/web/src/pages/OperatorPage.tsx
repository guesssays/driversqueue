import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { CheckCircle, Phone, Repeat, XCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { QueueTicket, QueueType } from '../types';
import { useOffice } from '../contexts/OfficeContext';
import { useProfile } from '../hooks/useProfile';
import { queueApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function OperatorPage() {
  const { office } = useOffice();
  const { profile } = useProfile();
  const { queueType: queueTypeParam } = useParams<{ queueType: 'reg' | 'tech' }>();

  const queueType: QueueType = queueTypeParam === 'tech' ? 'TECH' : 'REG';

  const { data: screenState, refetch, isLoading } = useQuery({
    queryKey: ['screen-state', office.id, queueType],
    queryFn: () => queueApi.getScreenState({ officeId: office.id }),
    refetchInterval: 2000,
  });

  const currentQueue = queueType === 'REG' ? screenState?.reg : screenState?.tech;
  const currentTicket = currentQueue?.current;
  const waitingTickets = currentQueue?.waiting || [];

  const handleCallNext = async () => {
    try {
      await queueApi.callNext({ officeId: office.id, queueType });
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'РћС€РёР±РєР° РїСЂРё РІС‹Р·РѕРІРµ');
    }
  };

  const handleRepeat = async (ticketId: string) => {
    try {
      await queueApi.repeat({ officeId: office.id, ticketId });
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'РћС€РёР±РєР°');
    }
  };

  const handleFinish = async (ticketId: string) => {
    try {
      await queueApi.finish({ officeId: office.id, ticketId });
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'РћС€РёР±РєР°');
    }
  };

  const handleNoShow = async (ticketId: string) => {
    try {
      await queueApi.noShow({ officeId: office.id, ticketId });
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'РћС€РёР±РєР°');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">РћРїРµСЂР°С‚РѕСЂ</h1>
        <p className="text-gray-600 mb-2">РћС„РёСЃ: {office.name}</p>
        {profile?.window_label && (
          <p className="text-gray-600 mb-4">РћРєРЅРѕ: {profile.window_label}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold mb-4">РўРµРєСѓС‰РёР№ РєР»РёРµРЅС‚</h2>
          {currentTicket ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-bold text-blue-600 mb-2">
                  {currentTicket.ticket_number}
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge variant="info">{currentTicket.window_label || 'РћРєРЅРѕ РЅРµ СѓРєР°Р·Р°РЅРѕ'}</Badge>
                </div>
                {currentTicket.called_at && (
                  <p className="text-sm text-gray-600">
                    Р’С‹Р·РІР°РЅ: {DateTime.fromISO(currentTicket.called_at)
                      .setZone('Asia/Tashkent')
                      .toFormat('HH:mm:ss')}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleRepeat(currentTicket.id)}
                  className="w-full"
                >
                  <Repeat className="h-4 w-4 mr-2" />
                  РџРѕРІС‚РѕСЂРёС‚СЊ
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleFinish(currentTicket.id)}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Р—Р°РІРµСЂС€РёС‚СЊ
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleNoShow(currentTicket.id)}
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  РќРµ СЏРІРёР»СЃСЏ
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">РќРµС‚ Р°РєС‚РёРІРЅС‹С… РєР»РёРµРЅС‚РѕРІ</p>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">
            РћР¶РёРґР°СЋС‰РёРµ <Badge variant="default">{waitingTickets.length}</Badge>
          </h2>
          {waitingTickets.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {waitingTickets.slice(0, 20).map((ticket: QueueTicket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-semibold">{ticket.ticket_number}</span>
                    <span className="text-sm text-gray-600">
                      {DateTime.fromISO(ticket.created_at)
                        .setZone('Asia/Tashkent')
                        .toFormat('HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>РќРµС‚ РѕР¶РёРґР°СЋС‰РёС…</p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <Button
          onClick={handleCallNext}
          disabled={waitingTickets.length === 0}
          variant="primary"
          size="lg"
          className="w-full"
        >
          <Phone className="h-5 w-5 mr-2" />
          Р’С‹Р·РІР°С‚СЊ СЃР»РµРґСѓСЋС‰РµРіРѕ
        </Button>
      </Card>
    </div>
  );
}

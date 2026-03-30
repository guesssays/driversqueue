import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Clock, Ticket, Users } from 'lucide-react';
import { useOffice } from '../contexts/OfficeContext';
import { queueApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function Dashboard() {
  const { office } = useOffice();
  const { data: screenState, isLoading } = useQuery({
    queryKey: ['screen-state', office.id],
    queryFn: () => queueApi.getScreenState({ officeId: office.id }),
    refetchInterval: 3000,
  });

  const regWaiting = screenState?.reg?.waiting?.length || 0;
  const techWaiting = screenState?.tech?.waiting?.length || 0;
  const regCurrent = screenState?.reg?.current;
  const techCurrent = screenState?.tech?.current;

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">РџР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ</h1>
        <p className="text-gray-600">РћР±Р·РѕСЂ СЃРѕСЃС‚РѕСЏРЅРёСЏ РѕС‡РµСЂРµРґРµР№ РґР»СЏ офиса {office.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">РћР¶РёРґР°СЋС‚ (Р РµРіРёСЃС‚СЂР°С†РёСЏ)</p>
              <p className="text-3xl font-bold text-gray-900">{regWaiting}</p>
            </div>
            <Users className="h-10 w-10 text-blue-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">РћР¶РёРґР°СЋС‚ (РўРµС…. РІРѕРїСЂРѕСЃС‹)</p>
              <p className="text-3xl font-bold text-gray-900">{techWaiting}</p>
            </div>
            <Ticket className="h-10 w-10 text-green-500" />
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm text-gray-600 mb-1">РўРµРєСѓС‰РёР№ (Р РµРіРёСЃС‚СЂР°С†РёСЏ)</p>
            {regCurrent ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">{regCurrent.ticket_number}</span>
                <Badge variant="info">{regCurrent.window_label || 'РћРєРЅРѕ'}</Badge>
              </div>
            ) : (
              <p className="text-lg text-gray-400">РќРµС‚</p>
            )}
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm text-gray-600 mb-1">РўРµРєСѓС‰РёР№ (РўРµС…. РІРѕРїСЂРѕСЃС‹)</p>
            {techCurrent ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">{techCurrent.ticket_number}</span>
                <Badge variant="info">{techCurrent.window_label || 'РћРєРЅРѕ'}</Badge>
              </div>
            ) : (
              <p className="text-lg text-gray-400">РќРµС‚</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4">РџРѕСЃР»РµРґРЅРёРµ РІС‹Р·РѕРІС‹</h2>
        <div className="space-y-2">
          {screenState?.lastCalls?.slice(0, 10).map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg">{ticket.ticket_number}</span>
                <Badge variant={ticket.queue_type === 'REG' ? 'info' : 'success'}>
                  {ticket.queue_type === 'REG' ? 'Р РµРіРёСЃС‚СЂР°С†РёСЏ' : 'РўРµС…. РІРѕРїСЂРѕСЃС‹'}
                </Badge>
                {ticket.window_label && (
                  <span className="text-sm text-gray-600">{ticket.window_label}</span>
                )}
              </div>
              {ticket.called_at && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {DateTime.fromISO(ticket.called_at).setZone('Asia/Tashkent').toFormat('HH:mm:ss')}
                </div>
              )}
            </div>
          ))}
          {(!screenState?.lastCalls || screenState.lastCalls.length === 0) && (
            <p className="text-center text-gray-500 py-8">РќРµС‚ РІС‹Р·РѕРІРѕРІ</p>
          )}
        </div>
      </Card>
    </div>
  );
}

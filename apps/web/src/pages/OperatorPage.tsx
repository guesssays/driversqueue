import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { queueApi } from '../lib/api';
import { useProfile } from '../hooks/useProfile';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { DateTime } from 'luxon';
import type { QueueType, QueueTicket } from '../types';
import { Repeat, CheckCircle, XCircle, Phone } from 'lucide-react';

export function OperatorPage() {
  const { queueType: queueTypeParam } = useParams<{ queueType: 'reg' | 'tech' }>();
  const { profile } = useProfile();
  
  const queueType: QueueType = queueTypeParam === 'tech' ? 'TECH' : 'REG';
  const queueLabel = queueType === 'REG' ? 'Регистрация' : 'Технические вопросы';

  const { data: screenState, refetch, isLoading } = useQuery({
    queryKey: ['screen-state', queueType],
    queryFn: () => queueApi.getScreenState(),
    refetchInterval: 2000,
  });

  const currentQueue = queueType === 'REG' ? screenState?.reg : screenState?.tech;
  const currentTicket = currentQueue?.current;
  const waitingTickets = currentQueue?.waiting || [];

  const handleCallNext = async () => {
    try {
      await queueApi.callNext(queueType);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Ошибка при вызове');
    }
  };

  const handleRepeat = async (ticketId: string) => {
    try {
      await queueApi.repeat(ticketId);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Ошибка');
    }
  };

  const handleFinish = async (ticketId: string) => {
    try {
      await queueApi.finish(ticketId);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Ошибка');
    }
  };

  const handleNoShow = async (ticketId: string) => {
    try {
      await queueApi.noShow(ticketId);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Ошибка');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Оператор: {queueLabel}</h1>
        {profile?.window_label && (
          <p className="text-gray-600">Окно: {profile.window_label}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Ticket */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Текущий клиент</h2>
          {currentTicket ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-bold text-blue-600 mb-2">
                  {currentTicket.ticket_number}
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge variant="info">{currentTicket.window_label || 'Окно не указано'}</Badge>
                </div>
                {currentTicket.called_at && (
                  <p className="text-sm text-gray-600">
                    Вызван: {DateTime.fromISO(currentTicket.called_at)
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
                  Повторить
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleFinish(currentTicket.id)}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Завершить
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleNoShow(currentTicket.id)}
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Не явился
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Нет активных клиентов</p>
            </div>
          )}
        </Card>

        {/* Waiting Queue */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">
            Ожидающие <Badge variant="default">{waitingTickets.length}</Badge>
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
              <p>Нет ожидающих</p>
            </div>
          )}
        </Card>
      </div>

      {/* Call Next Button */}
      <Card>
        <Button
          onClick={handleCallNext}
          disabled={waitingTickets.length === 0}
          variant="primary"
          size="lg"
          className="w-full"
        >
          <Phone className="h-5 w-5 mr-2" />
          Вызвать следующего
        </Button>
      </Card>
    </div>
  );
}

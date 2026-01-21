import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queueApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import type { Profile, QueueType, QueueTicket } from '../types';
import { DateTime } from 'luxon';

interface OperatorPageProps {
  profile: Profile | null;
}

export default function OperatorPage({ profile }: OperatorPageProps) {
  // Get last used queue type from localStorage, default to REG
  const getInitialQueueType = (): QueueType => {
    if (typeof window === 'undefined') return 'REG';
    const stored = localStorage.getItem('operator_last_queue_type');
    return (stored === 'TECH' || stored === 'REG') ? stored : 'REG';
  };
  
  const [queueType, setQueueType] = useState<QueueType>(getInitialQueueType());
  const navigate = useNavigate();

  // Save queue type to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('operator_last_queue_type', queueType);
    }
  }, [queueType]);

  const { data: screenState, refetch } = useQuery({
    queryKey: ['screen-state', queueType],
    queryFn: () => queueApi.getScreenState(),
    refetchInterval: 2000,
  });

  const currentQueue = queueType === 'REG' ? screenState?.reg : screenState?.tech;
  const currentTicket = currentQueue?.current;
  const waitingTickets = currentQueue?.waiting || [];

  const handleCallNext = async () => {
    if (!queueType) return;
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
      alert(err.message || 'Ошибка при повторном вызове');
    }
  };

  const handleFinish = async (ticketId: string) => {
    try {
      await queueApi.finish(ticketId);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Ошибка при завершении');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Оператор</h1>
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Выход
            </button>
          </div>
        </div>
        
        {profile?.window_label && (
          <p className="text-gray-600 mb-4">Окно: {profile.window_label}</p>
        )}
        
        {/* Tab switcher for REG/TECH - all operators can use both */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setQueueType('REG')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              queueType === 'REG'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Регистрация
          </button>
          <button
            onClick={() => setQueueType('TECH')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              queueType === 'TECH'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Технические вопросы
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Ticket */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Текущий клиент</h2>
            {currentTicket ? (
              <div className="space-y-4">
                <div className="text-4xl font-bold text-blue-600">{currentTicket.ticket_number}</div>
                <div className="text-lg">Окно: {currentTicket.window_label || 'Не указано'}</div>
                <div className="text-sm text-gray-600">
                  Вызван: {currentTicket.called_at ? DateTime.fromISO(currentTicket.called_at).setZone('Asia/Tashkent').toFormat('HH:mm:ss') : '-'}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleRepeat(currentTicket.id)}
                    className="flex-1 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Повторить вызов
                  </button>
                  <button
                    onClick={() => handleFinish(currentTicket.id)}
                    className="flex-1 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Завершить
                  </button>
                  <button
                    onClick={() => handleNoShow(currentTicket.id)}
                    className="flex-1 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Не явился
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Нет активных клиентов
              </div>
            )}
          </div>

          {/* Waiting Queue */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Ожидающие ({waitingTickets.length})</h2>
            {waitingTickets.length > 0 ? (
              <div className="space-y-2">
                {waitingTickets.slice(0, 10).map((ticket: QueueTicket) => (
                  <div
                    key={ticket.id}
                    className="p-3 bg-gray-50 rounded border flex justify-between items-center"
                  >
                    <span className="text-xl font-semibold">{ticket.ticket_number}</span>
                    <span className="text-sm text-gray-600">
                      {DateTime.fromISO(ticket.created_at).setZone('Asia/Tashkent').toFormat('HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">Нет ожидающих</div>
            )}
          </div>
        </div>

        {/* Call Next Button */}
        <div className="mt-6">
          <button
            onClick={handleCallNext}
            disabled={waitingTickets.length === 0}
            className="w-full py-6 bg-blue-600 text-white text-2xl font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вызвать следующего
          </button>
        </div>
      </div>
    </div>
  );
}

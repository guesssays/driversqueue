import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queueApi } from '../lib/api';
import { DateTime } from 'luxon';
import type { QueueTicket } from '../types';

export default function ScreenInternalPage() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastCalledId, setLastCalledId] = useState<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
  }, []);

  const { data: screenState } = useQuery({
    queryKey: ['screen-state'],
    queryFn: () => queueApi.getScreenState(),
    refetchInterval: 1500,
  });

  // Voice announcement
  useEffect(() => {
    if (!screenState || !voiceEnabled || !synthRef.current) return;

    const regCurrent = screenState.reg?.current;
    const techCurrent = screenState.tech?.current;

    const announce = (ticket: QueueTicket) => {
      if (ticket.id === lastCalledId) return; // Already announced
      
      setLastCalledId(ticket.id);
      const windowLabel = ticket.window_label || 'окну';
      const message = `Клиент ${ticket.ticket_number}, подойдите к ${windowLabel}`;
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.9;
      synthRef.current?.speak(utterance);
    };

    if (regCurrent && regCurrent.called_at) {
      announce(regCurrent);
    }
    if (techCurrent && techCurrent.called_at) {
      announce(techCurrent);
    }
  }, [screenState, voiceEnabled, lastCalledId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold">Электронная очередь</h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="w-5 h-5"
              />
              <span>Голосовые объявления</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Registration Queue */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 border-2 border-white/20">
            <h2 className="text-3xl font-bold mb-6 text-center">Регистрация</h2>
            {screenState?.reg?.current ? (
              <div className="text-center">
                <div className="text-7xl font-bold mb-4 text-yellow-300 animate-pulse">
                  {screenState.reg.current.ticket_number}
                </div>
                <div className="text-2xl mb-2">
                  Окно: {screenState.reg.current.window_label || 'Не указано'}
                </div>
                <div className="text-lg text-gray-200">
                  {screenState.reg.current.called_at
                    ? DateTime.fromISO(screenState.reg.current.called_at)
                        .setZone('Asia/Tashkent')
                        .toFormat('HH:mm:ss')
                    : ''}
                </div>
              </div>
            ) : (
              <div className="text-center text-4xl text-gray-300 py-12">Ожидание...</div>
            )}
          </div>

          {/* Technical Queue */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 border-2 border-white/20">
            <h2 className="text-3xl font-bold mb-6 text-center">Технические вопросы</h2>
            {screenState?.tech?.current ? (
              <div className="text-center">
                <div className="text-7xl font-bold mb-4 text-yellow-300 animate-pulse">
                  {screenState.tech.current.ticket_number}
                </div>
                <div className="text-2xl mb-2">
                  Окно: {screenState.tech.current.window_label || 'Не указано'}
                </div>
                <div className="text-lg text-gray-200">
                  {screenState.tech.current.called_at
                    ? DateTime.fromISO(screenState.tech.current.called_at)
                        .setZone('Asia/Tashkent')
                        .toFormat('HH:mm:ss')
                    : ''}
                </div>
              </div>
            ) : (
              <div className="text-center text-4xl text-gray-300 py-12">Ожидание...</div>
            )}
          </div>
        </div>

        {/* Last Calls */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Последние вызовы</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {screenState?.lastCalls?.slice(0, 8).map((ticket: QueueTicket) => (
              <div
                key={ticket.id}
                className={`p-4 rounded text-center ${
                  ticket.status === 'SERVING' || ticket.status === 'CALLED'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-white/5'
                }`}
              >
                <div className="text-2xl font-bold">{ticket.ticket_number}</div>
                <div className="text-sm">{ticket.window_label || ''}</div>
                <div className="text-xs mt-1">
                  {ticket.called_at
                    ? DateTime.fromISO(ticket.called_at).setZone('Asia/Tashkent').toFormat('HH:mm')
                    : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

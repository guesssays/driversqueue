import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queueApi } from '../lib/api';
import { DateTime } from 'luxon';
import type { QueueTicket } from '../types';
import { Volume2, VolumeX, Maximize, Minimize, Monitor, Tv } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { t, resolveScreensLang, type Language } from '../lib/i18n';
import { getWindowNumber } from '../lib/window-utils';
import {
  initAudioUnlock,
  setSoundEnabled,
  isSoundEnabled,
  speakCall,
  checkThrottle,
} from '../lib/offline-tts-player';

export function ScreensPage() {
  const [lang, setLang] = useState<Language>('uzLat');
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());
  const [lastEventKey, setLastEventKey] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenMode, setScreenMode] = useState<'internal' | 'external'>('internal');
  const containerRef = useRef<HTMLDivElement>(null);
  const langIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Resolve and update language from config (with auto-refresh every 10 seconds)
  useEffect(() => {
    const updateLang = async () => {
      const resolvedLang = await resolveScreensLang();
      setLang(resolvedLang);
    };

    // Initial load
    updateLang();

    // Auto-refresh every 10 seconds to pick up admin changes
    langIntervalRef.current = setInterval(updateLang, 10000);

    return () => {
      if (langIntervalRef.current) {
        clearInterval(langIntervalRef.current);
      }
    };
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const { data: screenState } = useQuery({
    queryKey: ['screen-state'],
    queryFn: () => queueApi.getScreenState(),
    refetchInterval: 2000,
  });

  // Offline TTS announcement - only for new calls and repeats
  useEffect(() => {
    if (!screenState || !soundEnabled) return;

    const regCurrent = screenState.reg?.current;
    const techCurrent = screenState.tech?.current;

    const announce = async (ticket: QueueTicket) => {
      // Only announce CALLED/SERVING tickets with window_label
      if (!['CALLED', 'SERVING'].includes(ticket.status) || !ticket.window_label) return;
      
      // Создаём уникальный ключ события: ticket.id + called_at + repeat_at
      // Это позволяет отслеживать как новые вызовы, так и повторы отдельно
      const eventKey = `${ticket.id}:${ticket.called_at ?? ''}:${ticket.repeat_at ?? ''}`;
      
      // Пропускаем если это тот же eventKey (уже озвучено)
      if (eventKey === lastEventKey) return;
      
      // Проверяем throttle для анти-спама (не озвучивать один ticket.id чаще чем раз в 2 секунды)
      const throttleKey = `${ticket.id}:${ticket.repeat_at ?? ticket.called_at ?? ''}`;
      if (!checkThrottle(throttleKey)) return;
      
      // Проверяем возраст события (не старше 10 секунд)
      const eventTime = ticket.repeat_at 
        ? DateTime.fromISO(ticket.repeat_at).toMillis()
        : ticket.called_at 
        ? DateTime.fromISO(ticket.called_at).toMillis()
        : null;
      
      if (eventTime) {
        const now = DateTime.now().toMillis();
        const ageSeconds = (now - eventTime) / 1000;
        
        // Только озвучиваем если событие произошло в последние 10 секунд
        if (ageSeconds > 60) return;
      }
      
      setLastEventKey(eventKey);
      
      // Play announcement (добавится в очередь автоматически)
      await speakCall(ticket.ticket_number, ticket.window_label, lang);
    };

    if (regCurrent) {
      announce(regCurrent);
    }
    if (techCurrent) {
      announce(techCurrent);
    }
  }, [screenState, soundEnabled, lastEventKey, lang]);

  // Get active calls (CALLED/SERVING)
  const activeCalls: Array<{ ticket: QueueTicket; queueType: 'REG' | 'TECH' }> = [];
  if (screenState?.reg?.current && ['CALLED', 'SERVING'].includes(screenState.reg.current.status)) {
    activeCalls.push({ ticket: screenState.reg.current, queueType: 'REG' });
  }
  if (screenState?.tech?.current && ['CALLED', 'SERVING'].includes(screenState.tech.current.status)) {
    activeCalls.push({ ticket: screenState.tech.current, queueType: 'TECH' });
  }

  // Get waiting tickets
  const waitingReg = screenState?.reg?.waiting || [];
  const waitingTech = screenState?.tech?.waiting || [];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 text-white p-4 md:p-8"
    >
      <div className="max-w-[1920px] mx-auto">
        {/* Header with controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-5xl md:text-6xl font-bold">{t('title', lang)}</h1>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Screen mode toggle */}
            <div className="flex gap-2 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setScreenMode('internal')}
                title={t('internalScreen', lang)}
                aria-label={t('internalScreen', lang)}
                className={`p-2 rounded transition ${
                  screenMode === 'internal' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <Monitor className="h-5 w-5" />
              </button>
              <button
                onClick={() => setScreenMode('external')}
                title={t('externalScreen', lang)}
                aria-label={t('externalScreen', lang)}
                className={`p-2 rounded transition ${
                  screenMode === 'external' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <Tv className="h-5 w-5" />
              </button>
            </div>
            
<Button
  variant="ghost"
  onClick={async () => {
    // ВСЕГДА пытаемся разлочить аудио (Chrome autoplay fix)
    await initAudioUnlock();

    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setSoundEnabledState(newState);
  }}
  title={soundEnabled ? t('soundOn', lang) : t('soundOff', lang)}
  aria-label={soundEnabled ? t('soundOn', lang) : t('soundOff', lang)}
  className="bg-white/10 hover:bg-white/20 text-white border-white/20 p-2"
>
  {soundEnabled ? (
    <Volume2 className="h-5 w-5" />
  ) : (
    <VolumeX className="h-5 w-5" />
  )}
</Button>

            
            <Button
              variant="ghost"
              onClick={toggleFullscreen}
              title={isFullscreen ? t('exitFullscreen', lang) : t('fullscreen', lang)}
              aria-label={isFullscreen ? t('exitFullscreen', lang) : t('fullscreen', lang)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 p-2"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Currently Calling Section - Large display */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 md:p-8 mb-8 border-2 border-white/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            {t('currentlyCalling', lang)}
          </h2>
          
          {activeCalls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCalls.map(({ ticket }) => {
                const windowNum = getWindowNumber(ticket.window_label);
                const isNewCall = ticket.called_at && 
                  DateTime.fromISO(ticket.called_at).diffNow('seconds').seconds > -5;
                
                return (
                  <div
                    key={ticket.id}
                    className={`bg-yellow-400 text-black rounded-xl p-6 md:p-8 text-center ${
                      isNewCall ? 'animate-pulse ring-4 ring-yellow-300' : ''
                    }`}
                  >
                    <div className="text-6xl md:text-8xl font-bold mb-4">
                      {ticket.ticket_number}
                    </div>
                    {/* Only show window if ticket is CALLED/SERVING and has window_label */}
                    {ticket.status === 'CALLED' || ticket.status === 'SERVING' ? (
                      windowNum ? (
                        <div className="text-3xl md:text-5xl font-bold mb-2">
                          → {t('window', lang)} {windowNum}
                        </div>
                      ) : null
                    ) : null}
                    {ticket.called_at && (
                      <div className="text-lg md:text-xl text-gray-700 mt-2">
                        {DateTime.fromISO(ticket.called_at)
                          .setZone('Asia/Tashkent')
                          .toFormat('HH:mm:ss')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-4xl md:text-5xl text-gray-300 py-12">
              {t('noActive', lang)}
            </div>
          )}
        </div>

        {/* Waiting Queue Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
          {/* Registration Queue */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border-2 border-white/20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              {t('reg', lang)} ({t('waiting', lang)})
            </h2>
            {waitingReg.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2 text-center">
                  {waitingReg.slice(0, 10).map((ticket: QueueTicket) => (
                    <div
                      key={ticket.id}
                      className="bg-white/10 rounded-lg p-3 md:p-4 text-2xl md:text-3xl font-bold"
                    >
                      {ticket.ticket_number}
                    </div>
                  ))}
                </div>
                {waitingReg.length > 10 && (
                  <div className="text-center text-lg text-gray-300 mt-2">
                    +{waitingReg.length - 10} {t('waitingFor', lang)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-2xl md:text-3xl text-gray-300 py-8">
                {t('noWaiting', lang)}
              </div>
            )}
          </div>

          {/* Technical Queue */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border-2 border-white/20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              {t('tech', lang)} ({t('waiting', lang)})
            </h2>
            {waitingTech.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2 text-center">
                  {waitingTech.slice(0, 10).map((ticket: QueueTicket) => (
                    <div
                      key={ticket.id}
                      className="bg-white/10 rounded-lg p-3 md:p-4 text-2xl md:text-3xl font-bold"
                    >
                      {ticket.ticket_number}
                    </div>
                  ))}
                </div>
                {waitingTech.length > 10 && (
                  <div className="text-center text-lg text-gray-300 mt-2">
                    +{waitingTech.length - 10} {t('waitingFor', lang)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-2xl md:text-3xl text-gray-300 py-8">
                {t('noWaiting', lang)}
              </div>
            )}
          </div>
        </div>

        {/* Legend and Instruction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Legend */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border-2 border-white/20">
            <h3 className="text-xl md:text-2xl font-bold mb-3">{t('legend', lang)}</h3>
            <div className="space-y-2 text-lg">
              <div><span className="font-bold text-2xl">R</span> - {t('legendReg', lang)}</div>
              <div><span className="font-bold text-2xl">T</span> - {t('legendTech', lang)}</div>
            </div>
          </div>

          {/* Instruction */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border-2 border-white/20">
            <h3 className="text-xl md:text-2xl font-bold mb-3">{t('note', lang)}</h3>
            <p className="text-lg md:text-xl">{t('instruction', lang)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

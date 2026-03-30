import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Maximize, Minimize, Monitor, Tv, Volume2, VolumeX } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { QueueTicket } from '../types';
import { publicConfigApi, queueApi } from '../lib/api';
import { getLangFromURL, t, type Language } from '../lib/i18n';
import { speakCall, checkThrottle, initAudioUnlock, isSoundEnabled, setSoundEnabled } from '../lib/offline-tts-player';
import { getWindowNumber } from '../lib/window-utils';
import { Button } from '../components/ui/Button';

export function ScreensPage() {
  const { officeSlug, mode } = useParams<{ officeSlug: string; mode?: 'internal' | 'external' }>();
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [lastEventKey, setLastEventKey] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenMode, setScreenMode] = useState<'internal' | 'external'>(mode === 'external' ? 'external' : 'internal');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setScreenMode(mode === 'external' ? 'external' : 'internal');
  }, [mode]);

  useEffect(() => {
    setSoundEnabledState(isSoundEnabled(officeSlug));
  }, [officeSlug]);

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

  const { data: config } = useQuery({
    queryKey: ['public-config', officeSlug],
    queryFn: () => publicConfigApi.getConfig({ officeSlug }),
    enabled: !!officeSlug,
    refetchInterval: 10000,
  });

  const { data: screenState } = useQuery({
    queryKey: ['screen-state-public', officeSlug],
    queryFn: () => queueApi.getScreenState({ officeSlug }),
    enabled: !!officeSlug,
    refetchInterval: 2000,
  });

  const lang = getLangFromURL() || config?.screens_lang || 'uzLat';

  useEffect(() => {
    if (!screenState || !soundEnabled) {
      return;
    }

    const activeTickets = [screenState.reg?.current, screenState.tech?.current].filter(
      (ticket): ticket is QueueTicket => Boolean(ticket),
    );

    const announce = async (ticket: QueueTicket) => {
      if (!['CALLED', 'SERVING'].includes(ticket.status) || !ticket.window_label) {
        return;
      }

      const eventKey = `${ticket.id}:${ticket.called_at ?? ''}:${ticket.repeat_at ?? ''}`;
      if (eventKey === lastEventKey) {
        return;
      }

      const throttleKey = `${ticket.id}:${ticket.repeat_at ?? ticket.called_at ?? ''}`;
      if (!checkThrottle(throttleKey)) {
        return;
      }

      const eventTime = ticket.repeat_at
        ? DateTime.fromISO(ticket.repeat_at).toMillis()
        : ticket.called_at
          ? DateTime.fromISO(ticket.called_at).toMillis()
          : null;

      if (eventTime) {
        const ageSeconds = (DateTime.now().toMillis() - eventTime) / 1000;
        if (ageSeconds > 60) {
          return;
        }
      }

      setLastEventKey(eventKey);
      await speakCall(ticket.ticket_number, ticket.window_label, lang as Language, !!ticket.repeat_at);
    };

    activeTickets.forEach((ticket) => {
      void announce(ticket);
    });
  }, [lang, lastEventKey, screenState, soundEnabled]);

  if (!officeSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Office slug is required</p>
      </div>
    );
  }

  const activeCalls: Array<{ ticket: QueueTicket; queueType: 'REG' | 'TECH' }> = [];
  if (screenState?.reg?.current && ['CALLED', 'SERVING'].includes(screenState.reg.current.status)) {
    activeCalls.push({ ticket: screenState.reg.current, queueType: 'REG' });
  }
  if (screenState?.tech?.current && ['CALLED', 'SERVING'].includes(screenState.tech.current.status)) {
    activeCalls.push({ ticket: screenState.tech.current, queueType: 'TECH' });
  }

  const waitingReg = screenState?.reg?.waiting || [];
  const waitingTech = screenState?.tech?.waiting || [];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 text-white p-4 md:p-8"
    >
      <div className="max-w-[1920px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold">{t('title', lang)}</h1>
            <p className="text-lg text-blue-100 mt-2">{config?.office?.name || officeSlug}</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
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
                await initAudioUnlock();
                const newState = !soundEnabled;
                setSoundEnabled(newState, officeSlug);
                setSoundEnabledState(newState);
              }}
              title={soundEnabled ? t('soundOn', lang) : t('soundOff', lang)}
              aria-label={soundEnabled ? t('soundOn', lang) : t('soundOff', lang)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 p-2"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              onClick={toggleFullscreen}
              title={isFullscreen ? t('exitFullscreen', lang) : t('fullscreen', lang)}
              aria-label={isFullscreen ? t('exitFullscreen', lang) : t('fullscreen', lang)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 p-2"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-xl p-6 md:p-8 mb-8 border-2 border-white/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            {t('currentlyCalling', lang)}
          </h2>

          {activeCalls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCalls.map(({ ticket }) => {
                const windowNum = getWindowNumber(ticket.window_label);
                const isNewCall =
                  ticket.called_at &&
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
                    {(ticket.status === 'CALLED' || ticket.status === 'SERVING') && windowNum ? (
                      <div className="text-3xl md:text-5xl font-bold mb-2">
                        → {t('window', lang)} {windowNum}
                      </div>
                    ) : null}
                    {ticket.called_at && (
                      <div className="text-lg md:text-xl text-gray-700 mt-2">
                        {DateTime.fromISO(ticket.called_at)
                          .setZone(config?.timezone || 'Asia/Tashkent')
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border-2 border-white/20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              {t('reg', lang)} ({t('waiting', lang)})
            </h2>
            {waitingReg.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2 text-center">
                  {waitingReg.slice(0, 10).map((ticket) => (
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

          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border-2 border-white/20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              {t('tech', lang)} ({t('waiting', lang)})
            </h2>
            {waitingTech.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2 text-center">
                  {waitingTech.slice(0, 10).map((ticket) => (
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

        {screenMode === 'internal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border-2 border-white/20">
              <h3 className="text-xl md:text-2xl font-bold mb-3">{t('legend', lang)}</h3>
              <div className="space-y-2 text-lg">
                <div><span className="font-bold text-2xl">R</span> - {t('legendReg', lang)}</div>
                <div><span className="font-bold text-2xl">T</span> - {t('legendTech', lang)}</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border-2 border-white/20">
              <h3 className="text-xl md:text-2xl font-bold mb-3">{t('note', lang)}</h3>
              <p className="text-lg md:text-xl">{t('instruction', lang)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

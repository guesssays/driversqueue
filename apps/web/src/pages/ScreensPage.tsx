import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queueApi } from '../lib/api';
import { DateTime } from 'luxon';
import type { QueueTicket } from '../types';
import { Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { t, type Language } from '../lib/i18n';
import { getWindowNumber, formatWindowNumber } from '../lib/window-utils';

const LANG: Language = 'uz'; // Default to Uzbek

// Check URL parameter for voice enable
function getVoiceEnabledFromURL(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('voice') === '1';
}

export function ScreensPage() {
  // Voice disabled by default, enabled via ?voice=1 URL parameter
  const [voiceEnabled, setVoiceEnabled] = useState(getVoiceEnabledFromURL());
  const [lastCalledId, setLastCalledId] = useState<string | null>(null);
  const [lastCalledTime, setLastCalledTime] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenMode, setScreenMode] = useState<'internal' | 'external'>('internal');
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide cursor for TV mode
  useEffect(() => {
    const hideCursor = () => {
      if (document.body) {
        document.body.style.cursor = 'none';
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      cursorTimeoutRef.current = setTimeout(() => {
        if (document.body) {
          document.body.style.cursor = 'auto';
        }
      }, 3000);
    };

    const handleMouseMove = () => {
      if (document.body) {
        document.body.style.cursor = 'auto';
      }
      hideCursor();
    };

    window.addEventListener('mousemove', handleMouseMove);
    hideCursor();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
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

  // Voice announcement in Uzbek
  // Only announces new calls (by ID and time) to prevent spam during polling
  useEffect(() => {
    if (!screenState || !voiceEnabled || !synthRef.current) return;

    const regCurrent = screenState.reg?.current;
    const techCurrent = screenState.tech?.current;

    const announce = (ticket: QueueTicket) => {
      // Skip if already announced (same ID)
      if (ticket.id === lastCalledId) return;
      
      // Skip if called_at is too old (more than 10 seconds ago) - likely not a new call
      if (ticket.called_at) {
        const calledTime = DateTime.fromISO(ticket.called_at).toMillis();
        const now = DateTime.now().toMillis();
        const ageSeconds = (now - calledTime) / 1000;
        
        // Only announce if called within last 10 seconds (new call)
        if (ageSeconds > 10) return;
        
        // Also check if we already announced something very recently (within 2 seconds)
        // to prevent duplicate announcements during rapid polling
        if (lastCalledTime > 0 && (now - lastCalledTime) < 2000) return;
      }
      
      setLastCalledId(ticket.id);
      setLastCalledTime(DateTime.now().toMillis());
      
      const windowNum = getWindowNumber(ticket.window_label);
      const windowText = windowNum ? `Oyna ${windowNum}` : 'oynaga';
      const message = `${ticket.ticket_number}, ${windowText}ga boring`;
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'uz-UZ';
      utterance.rate = 0.9;
      synthRef.current?.speak(utterance);
    };

    if (regCurrent && regCurrent.called_at) {
      announce(regCurrent);
    }
    if (techCurrent && techCurrent.called_at) {
      announce(techCurrent);
    }
  }, [screenState, voiceEnabled, lastCalledId, lastCalledTime]);

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
      style={{ cursor: 'none' }}
    >
      <div className="max-w-[1920px] mx-auto">
        {/* Header with controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-5xl md:text-6xl font-bold">{t('electronicQueue', LANG)}</h1>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Screen mode toggle */}
            <div className="flex gap-2 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setScreenMode('internal')}
                className={`px-4 py-2 rounded transition ${
                  screenMode === 'internal' ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                }`}
              >
                {t('internalScreen', LANG)}
              </button>
              <button
                onClick={() => setScreenMode('external')}
                className={`px-4 py-2 rounded transition ${
                  screenMode === 'external' ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                }`}
              >
                {t('externalScreen', LANG)}
              </button>
            </div>
            
            <Button
              variant="ghost"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              {voiceEnabled ? (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  {t('voiceOn', LANG)}
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  {t('voiceOff', LANG)}
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              onClick={toggleFullscreen}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              {isFullscreen ? (
                <>
                  <Minimize className="h-4 w-4 mr-2" />
                  {t('exitFullscreen', LANG)}
                </>
              ) : (
                <>
                  <Maximize className="h-4 w-4 mr-2" />
                  {t('fullscreen', LANG)}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Currently Calling Section - Large display */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 md:p-8 mb-8 border-2 border-white/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            {t('currentlyCalling', LANG)}
          </h2>
          
          {activeCalls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCalls.map(({ ticket, queueType }) => {
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
                    <div className="text-3xl md:text-5xl font-bold mb-2">
                      → {formatWindowNumber(windowNum, LANG)}
                    </div>
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
              {t('noActive', LANG)}
            </div>
          )}
        </div>

        {/* Waiting Queue Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
          {/* Registration Queue */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border-2 border-white/20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              {t('registration', LANG)} ({t('waiting', LANG)})
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
                    +{waitingReg.length - 10} {t('waitingFor', LANG)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-2xl md:text-3xl text-gray-300 py-8">
                {t('noWaiting', LANG)}
              </div>
            )}
          </div>

          {/* Technical Queue */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border-2 border-white/20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              {t('technicalSupport', LANG)} ({t('waiting', LANG)})
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
                    +{waitingTech.length - 10} {t('waitingFor', LANG)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-2xl md:text-3xl text-gray-300 py-8">
                {t('noWaiting', LANG)}
              </div>
            )}
          </div>
        </div>

        {/* Legend and Instruction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Legend */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border-2 border-white/20">
            <h3 className="text-xl md:text-2xl font-bold mb-3">{t('legend', LANG)}</h3>
            <div className="space-y-2 text-lg">
              <div><span className="font-bold text-2xl">R</span> - {t('legendReg', LANG)}</div>
              <div><span className="font-bold text-2xl">T</span> - {t('legendTech', LANG)}</div>
            </div>
          </div>

          {/* Instruction */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border-2 border-white/20">
            <h3 className="text-xl md:text-2xl font-bold mb-3">{t('note', LANG)}</h3>
            <p className="text-lg md:text-xl">{t('instruction', LANG)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

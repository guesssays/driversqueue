import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DateTime } from 'luxon';
import type { QueueTicket } from '../types';
import { t, resolveScreensLang, type Language } from '../lib/i18n';
import { useSystemConfig } from '../hooks/useSystemConfig';

export default function PrintPage() {
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const { data: config, isLoading: configLoading } = useSystemConfig();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [lang, setLang] = useState<Language>('uzLat');

  // Load ticket data
  useEffect(() => {
    if (!ticketId) {
      setError('Talon ID ko\'rsatilmagan');
      setLoading(false);
      return;
    }

    const loadTicket = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('queue_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();

        if (fetchError || !data) {
          setError('Taloni yuklashda xatolik yuz berdi');
          setLoading(false);
          return;
        }

        setTicket(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Taloni yuklashda xatolik yuz berdi');
        setLoading(false);
      }
    };

    loadTicket();
  }, [ticketId]);

  // Resolve language
  useEffect(() => {
    const loadLang = async () => {
      const resolvedLang = await resolveScreensLang();
      setLang(resolvedLang);
    };
    loadLang();
  }, []);

  useEffect(() => {
    if (ticket && config?.qr_enabled) {
      // Use QR code API service (or implement client-side QR library)
      const qrText = encodeURIComponent(`${window.location.origin}/queue/print/${ticket.id}`);
      // Using a free QR code API - you can replace with a client-side library if preferred
      setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrText}`);
    }
  }, [ticket, config]);

  // Auto-print only after ticket data is loaded and rendered
  useEffect(() => {
    // Only print if ticket is loaded, config is loaded, and we haven't printed yet
    if (ticket && config && !hasPrinted && !loading && !configLoading) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        window.print();
        setHasPrinted(true);
        
        // Optionally close window after print (may be blocked by browser)
        // Uncomment if needed:
        // setTimeout(() => {
        //   window.close();
        // }, 1000);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [ticket, config, hasPrinted, loading, configLoading]);

  // Loading state
  if (loading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Talon tayyorlanmoqda...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 text-xl mb-4">⚠️ {error || 'Talon topilmadi'}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const queueLabel = ticket.queue_type === 'REG' ? t('reg', lang) : t('tech', lang);
  const createdAt = DateTime.fromISO(ticket.created_at).setZone('Asia/Tashkent');

  return (
    <div className="print-container" style={{ width: '58mm', margin: '0 auto', padding: '10mm', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          body { margin: 0; }
          .print-container { width: 58mm; }
          .no-print { display: none; }
        }
        @page { size: 58mm auto; margin: 0; }
      `}</style>
      
      <div className="text-center">
        {config?.logo_url && (
          <img src={config.logo_url} alt="Logo" style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }} />
        )}
        
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
          {queueLabel}
        </h1>
        
        <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '20px 0' }}>
          {ticket.ticket_number}
        </div>
        
        <div style={{ fontSize: '14px', marginBottom: '10px' }}>
          {createdAt.toFormat('dd.MM.yyyy HH:mm')}
        </div>
        
        {qrDataUrl && (
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <img src={qrDataUrl} alt="QR Code" style={{ width: '120px', height: '120px' }} />
          </div>
        )}
        
        {/* No window shown - neutral message only */}
        <div style={{ fontSize: '12px', marginTop: '15px', color: '#666' }}>
          {t('waitForCall', lang)}
        </div>
      </div>
      
      <div className="no-print" style={{ marginTop: '20px', textAlign: 'center' }}>
        <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded">
          Печать
        </button>
      </div>
    </div>
  );
}

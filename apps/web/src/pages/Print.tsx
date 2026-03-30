import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DateTime } from 'luxon';
import type { QueueTicket, ScreensLanguage, SystemConfig } from '../types';
import { useOffice } from '../contexts/OfficeContext';
import { queueApi } from '../lib/api';
import { t } from '../lib/i18n';

export default function PrintPage() {
  const { office } = useOffice();
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPrinted, setHasPrinted] = useState(false);

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

        const response = await queueApi.getPrintableTicket({
          officeId: office.id,
          ticketId,
        });

        setTicket(response.ticket);
        setConfig(response.config);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Taloni yuklashda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    };

    void loadTicket();
  }, [office.id, ticketId]);

  useEffect(() => {
    if (ticket && config && !hasPrinted && !loading) {
      const timer = setTimeout(() => {
        window.print();
        setHasPrinted(true);
      }, 300);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [ticket, config, hasPrinted, loading]);

  useEffect(() => {
    if (ticket && config?.qr_enabled) {
      const qrText = encodeURIComponent(`${window.location.origin}/${office.slug}/print?ticketId=${ticket.id}`);
      setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrText}`);
      return;
    }

    setQrDataUrl('');
  }, [config?.qr_enabled, office.slug, ticket]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Talon tayyorlanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 text-xl mb-4">вљ пёЏ {error || 'Talon topilmadi'}</div>
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

  const lang = (config.screens_lang || 'uzLat') as ScreensLanguage;
  const queueLabel = ticket.queue_type === 'REG' ? t('reg', lang) : t('tech', lang);
  const createdAt = DateTime.fromISO(ticket.created_at).setZone(config.timezone || 'Asia/Tashkent');

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
        {config.logo_url && (
          <img src={config.logo_url} alt="Logo" style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }} />
        )}

        <div style={{ fontSize: '14px', marginBottom: '8px' }}>{office.name}</div>

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

        <div style={{ fontSize: '12px', marginTop: '15px', color: '#666' }}>
          {t('waitForCall', lang)}
        </div>
      </div>

      <div className="no-print" style={{ marginTop: '20px', textAlign: 'center' }}>
        <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded">
          РџРµС‡Р°С‚СЊ
        </button>
      </div>
    </div>
  );
}

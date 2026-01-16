import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DateTime } from 'luxon';
import type { QueueTicket, SystemConfig } from '../types';

export default function PrintPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!ticketId) return;

    const loadTicket = async () => {
      const { data, error } = await supabase
        .from('queue_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (!error && data) {
        setTicket(data);
      }
    };

    loadTicket();
  }, [ticketId]);

  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from('system_config')
        .select('key, value');

      if (data) {
        const cfg: any = {};
        data.forEach(item => {
          cfg[item.key] = item.value;
        });
        setConfig({
          logo_url: cfg.logo_url || '',
          qr_enabled: cfg.qr_enabled ?? true,
          retention_days: cfg.retention_days || 90,
          timezone: cfg.timezone || 'Asia/Tashkent',
        });
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    if (ticket && config?.qr_enabled) {
      // Use QR code API service (or implement client-side QR library)
      const qrText = encodeURIComponent(`${window.location.origin}/queue/print/${ticket.id}`);
      // Using a free QR code API - you can replace with a client-side library if preferred
      setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrText}`);
    }
  }, [ticket, config]);

  useEffect(() => {
    // Auto-print when page loads
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!ticket) {
    return <div className="p-8">Загрузка билета...</div>;
  }

  const queueLabel = ticket.queue_type === 'REG' ? 'Регистрация' : 'Технические вопросы';
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
        
        <div style={{ fontSize: '12px', marginTop: '15px', color: '#666' }}>
          Ожидайте вызова на экране
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

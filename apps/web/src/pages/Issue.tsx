import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queueApi } from '../lib/api';
import type { QueueType } from '../types';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function IssuePage() {
  const [selectedQueue, setSelectedQueue] = useState<QueueType>('REG');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleIssue = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await queueApi.issue(selectedQueue);
      
      // Open print page in new window
      const printUrl = `${window.location.origin}${result.printUrl}`;
      window.open(printUrl, '_blank');
      
      // Refresh screen state
      queryClient.invalidateQueries({ queryKey: ['screen-state'] });
      
      // Show success message briefly
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Ошибка при выдаче билета');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Выдача билетов</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Выход
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <label className="block text-lg font-medium mb-4">Выберите тип очереди:</label>
            <div className="flex gap-4">
              <button
                onClick={() => setSelectedQueue('REG')}
                className={`flex-1 py-4 px-6 rounded-lg text-xl font-semibold ${
                  selectedQueue === 'REG'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Регистрация (R)
              </button>
              <button
                onClick={() => setSelectedQueue('TECH')}
                className={`flex-1 py-4 px-6 rounded-lg text-xl font-semibold ${
                  selectedQueue === 'TECH'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Технические вопросы (T)
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
          )}

          <button
            onClick={handleIssue}
            disabled={loading}
            className="w-full py-6 bg-green-600 text-white text-2xl font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Выдача билета...' : `Выдать билет ${selectedQueue === 'REG' ? 'R' : 'T'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

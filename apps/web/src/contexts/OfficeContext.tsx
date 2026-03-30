import { createContext, useContext, type ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import type { Office } from '../types';
import { replaceOfficeSlug } from '../lib/office-routing';
import { useAccessibleOffices } from '../hooks/useAccessibleOffices';
import { Card } from '../components/ui/Card';

interface OfficeContextValue {
  office: Office;
  offices: Office[];
  defaultOffice: Office | null;
}

const OfficeContext = createContext<OfficeContextValue | undefined>(undefined);

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Загрузка офиса...</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="max-w-md w-full text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Офис недоступен</h2>
        <p className="text-gray-600">{message}</p>
      </Card>
    </div>
  );
}

export function OfficeProvider({ children }: { children: ReactNode }) {
  const { officeSlug } = useParams<{ officeSlug: string }>();
  const location = useLocation();
  const { offices, defaultOffice, isLoading, error } = useAccessibleOffices();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : 'Не удалось загрузить офисы'} />;
  }

  if (!officeSlug) {
    return <ErrorState message="Office slug is missing in the route." />;
  }

  const office = offices.find((item) => item.slug === officeSlug);

  if (!office && defaultOffice) {
    return (
      <Navigate
        to={replaceOfficeSlug(location.pathname, defaultOffice.slug)}
        replace
      />
    );
  }

  if (!office) {
    return <ErrorState message="У пользователя нет доступа к указанному офису." />;
  }

  return (
    <OfficeContext.Provider
      value={{
        office,
        offices,
        defaultOffice,
      }}
    >
      {children}
    </OfficeContext.Provider>
  );
}

export function useOffice() {
  const context = useContext(OfficeContext);
  if (!context) {
    throw new Error('useOffice must be used within an OfficeProvider');
  }

  return context;
}

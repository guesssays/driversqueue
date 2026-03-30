import { useQuery } from '@tanstack/react-query';
import { officeApi } from '../lib/api';

export function useAccessibleOffices(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: ['my-offices'],
    queryFn: () => officeApi.getAccessibleOffices(),
    enabled: options?.enabled ?? true,
  });

  const offices = query.data?.offices || [];
  const defaultOffice =
    offices.find((office) => office.id === query.data?.defaultOfficeId) || offices[0] || null;

  return {
    ...query,
    offices,
    defaultOffice,
    defaultOfficeId: query.data?.defaultOfficeId || null,
  };
}

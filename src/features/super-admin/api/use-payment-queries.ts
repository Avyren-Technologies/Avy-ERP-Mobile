import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { paymentApi } from '@/lib/api/payment';
import type { RecordPaymentPayload } from '@/lib/api/payment';

// --- Query keys ---

export const paymentKeys = {
  all: ['payments'] as const,
  list: (params: any) => [...paymentKeys.all, 'list', params] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
};

// --- Queries ---

/** Paginated payment list */
export function usePaymentList(params?: {
  page?: number;
  limit?: number;
  companyId?: string;
  invoiceId?: string;
  dateFrom?: string;
  dateTo?: string;
  method?: string;
}) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => paymentApi.listPayments(params),
  });
}

/** Single payment detail */
export function usePaymentDetail(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: () => paymentApi.getPaymentById(id),
    enabled: !!id,
  });
}

// --- Mutations ---

/** Record a new payment */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordPaymentPayload) => paymentApi.recordPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
  });
}

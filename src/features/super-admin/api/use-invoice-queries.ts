import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invoiceApi } from '@/lib/api/invoice';
import type { GenerateInvoicePayload, MarkAsPaidPayload } from '@/lib/api/invoice';

// --- Query keys ---

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (params: any) => [...invoiceKeys.all, 'list', params] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
};

// --- Queries ---

/** Paginated invoice list */
export function useInvoiceList(params?: {
  page?: number;
  limit?: number;
  status?: string;
  invoiceType?: string;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => invoiceApi.listInvoices(params),
  });
}

/** Single invoice detail with line items, payments, company */
export function useInvoiceDetail(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => invoiceApi.getInvoiceById(id),
    enabled: !!id,
  });
}

// --- Mutations ---

/** Generate a new invoice */
export function useGenerateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateInvoicePayload) => invoiceApi.generateInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });
}

/** Mark an invoice as paid */
export function useMarkAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MarkAsPaidPayload }) =>
      invoiceApi.markAsPaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });
}

/** Void an invoice */
export function useVoidInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoiceApi.voidInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });
}

/** Send invoice via email */
export function useSendInvoiceEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoiceApi.sendEmail(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
}

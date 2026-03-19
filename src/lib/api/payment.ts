import { client } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/auth';

// --- Types ---

export type PaymentMethod =
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'CASH'
  | 'RAZORPAY'
  | 'UPI'
  | 'OTHER';

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  tenantName?: string;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  paidAt: string;
  notes?: string;
  createdAt: string;
}

export interface RecordPaymentPayload {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  paidAt: string;
  notes?: string;
}

export interface PaginatedPayments {
  success: boolean;
  data: PaymentRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// --- API Service ---

/**
 * Payment API service.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 * We cast accordingly so TypeScript matches the runtime behaviour.
 */
export const paymentApi = {
  /** List payments with optional pagination / filters */
  listPayments: (params?: {
    page?: number;
    limit?: number;
    companyId?: string;
    invoiceId?: string;
    dateFrom?: string;
    dateTo?: string;
    method?: string;
  }) =>
    client.get('/platform/billing/payments', { params }) as Promise<PaginatedPayments>,

  /** Get single payment by ID */
  getPaymentById: (id: string) =>
    client.get(`/platform/billing/payments/${id}`) as Promise<ApiResponse<PaymentRecord>>,

  /** Record a new payment */
  recordPayment: (data: RecordPaymentPayload) =>
    client.post('/platform/billing/payments/record', data) as Promise<ApiResponse<PaymentRecord>>,
};

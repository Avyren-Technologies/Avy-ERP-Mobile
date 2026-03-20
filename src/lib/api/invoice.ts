import { client } from '@/lib/api/client';
import type { PaymentMethod } from '@/lib/api/payment';

export type { PaymentMethod };

// --- Types ---

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type InvoiceType = 'SUBSCRIPTION' | 'ONE_TIME_LICENSE' | 'AMC' | 'PRORATED_ADJUSTMENT';

export interface InvoiceLineItem {
  id: string;
  description: string;
  locationName?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  paidAt: string;
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  company?: {
    id: string;
    displayName: string;
  };
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  dueDate?: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  lineItems?: InvoiceLineItem[];
  payments?: InvoicePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface MarkAsPaidPayload {
  method: PaymentMethod;
  transactionReference?: string;
  paidAt: string;
  notes?: string;
}

export interface GenerateInvoicePayload {
  companyId: string;
  locationId?: string;
  invoiceType: InvoiceType;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
}

export interface PaginatedInvoices {
  success: boolean;
  data: Invoice[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// --- API Service ---

export const invoiceApi = {
  listInvoices: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    invoiceType?: string;
    companyId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) =>
    client.get('/platform/billing/invoices', { params }) as Promise<PaginatedInvoices>,

  getInvoiceById: (id: string) =>
    client.get(`/platform/billing/invoices/${id}`) as Promise<{ success: boolean; data: Invoice }>,

  generateInvoice: (data: GenerateInvoicePayload) =>
    client.post('/platform/billing/invoices/generate', data) as Promise<{ success: boolean; data: Invoice }>,

  markAsPaid: (id: string, data: MarkAsPaidPayload) =>
    client.patch(`/platform/billing/invoices/${id}/mark-paid`, data) as Promise<{ success: boolean; data: Invoice }>,

  voidInvoice: (id: string) =>
    client.patch(`/platform/billing/invoices/${id}/void`) as Promise<{ success: boolean; data: Invoice }>,

  sendEmail: (id: string) =>
    client.post(`/platform/billing/invoices/${id}/send-email`) as Promise<{ success: boolean }>,

  downloadPdf: (id: string) =>
    client.get(`/platform/billing/invoices/${id}/pdf`, { responseType: 'blob' }) as Promise<Blob>,
};

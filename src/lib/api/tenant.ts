import { client } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/auth';

// Re-export for convenience
export type { ApiResponse };

// --- Types ---

export interface CompanyListItem {
  id: string;
  name: string;
  displayName: string;
  legalName: string;
  industry: string;
  businessType: string;
  wizardStatus: string;
  companyCode: string;
  emailDomain: string;
  endpointType: string;
  multiLocationMode: boolean;
  createdAt: string;
  _count?: { locations: number; contacts: number };
  tenant?: { id: string; status: string };
}

export interface CompanyDetail {
  id: string;
  name: string;
  displayName: string;
  legalName: string;
  industry: string;
  businessType: string;
  wizardStatus: string;
  companyCode: string;
  emailDomain: string;
  endpointType: string;
  multiLocationMode: boolean;
  createdAt: string;
  updatedAt: string;
  locations: any[];
  contacts: any[];
  shifts: any[];
  noSeries: any[];
  iotReasons: any[];
  tenant: { id: string; status: string; subscriptions: any[] };
  users: any[];
}

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function normalizeOnboardPayload(payload: any) {
  if (!payload || typeof payload !== 'object') return payload;

  if (Array.isArray(payload.noSeries)) {
    const normalizedPayload = {
      ...payload,
      noSeries: payload.noSeries.map((ns: any) => ({
        ...ns,
        numberCount: typeof ns?.numberCount === 'string'
          ? Number.parseInt(ns.numberCount, 10)
          : ns?.numberCount,
        startNumber: typeof ns?.startNumber === 'string'
          ? Number.parseInt(ns.startNumber, 10)
          : ns?.startNumber,
      })),
    };

    return normalizedPayload;
  }

  return payload;
}

// --- API Service ---

/**
 * Tenant / Company API service.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 * We cast accordingly so TypeScript matches the runtime behaviour.
 */
export const tenantApi = {
  /** Onboard a new tenant (full wizard submit) */
  onboard: (payload: any) =>
    client.post('/platform/tenants/onboard', normalizeOnboardPayload(payload)) as Promise<ApiResponse<any>>,

  /** List companies with optional pagination / filters */
  listCompanies: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) =>
    client.get('/platform/companies', { params }) as Promise<PaginatedResult<CompanyListItem>>,

  /** Get full company detail by ID */
  getCompanyDetail: (companyId: string) =>
    client.get(`/platform/companies/${companyId}`) as Promise<ApiResponse<CompanyDetail>>,

  /** Update a single section of a company */
  updateSection: (companyId: string, sectionKey: string, data: any) =>
    client.patch(
      `/platform/companies/${companyId}/sections/${sectionKey}`,
      data,
    ) as Promise<ApiResponse<any>>,

  /** Change company status (Draft, Pilot, Active, Inactive) */
  updateStatus: (companyId: string, status: string) =>
    client.put(`/platform/companies/${companyId}/status`, { status }) as Promise<ApiResponse<any>>,

  /** Delete a company */
  deleteCompany: (companyId: string) =>
    client.delete(`/platform/companies/${companyId}`) as Promise<ApiResponse<any>>,
};

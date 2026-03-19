import { client } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/auth';

// --- Types ---

export type BillingType = 'MONTHLY' | 'ANNUAL' | 'ONE_TIME_AMC';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
export type AmcStatus = 'ACTIVE' | 'OVERDUE' | 'LAPSED' | 'NOT_APPLICABLE';

export interface LocationCostBreakdown {
  locationId: string;
  locationName: string;
  facilityType: string;
  billingType: BillingType;
  userTier: string;
  modulesCount: number;
  moduleIds: string[];
  endpointType: 'default' | 'custom';
  monthlyCost?: number;
  annualCost?: number;
  oneTimeCost?: number;
  amcCost?: number;
  amcStatus?: AmcStatus;
  amcDueDate?: string;
  nextRenewalDate?: string;
  trialEndDate?: string;
  customUserLimit?: number;
  customTierPrice?: number;
}

export interface SubscriptionDetail {
  companyId: string;
  tenantName: string;
  status: SubscriptionStatus;
  defaultBillingType: BillingType;
  startDate: string;
  locations: LocationCostBreakdown[];
}

export interface CostPreviewResponse {
  currentCost: number;
  newCost: number;
  difference: number;
  billingType: BillingType;
}

export interface ChangeBillingTypePayload {
  billingType: BillingType;
  locationId?: string;
  oneTimeOverride?: number;
  amcOverride?: number;
}

export interface ChangeTierPayload {
  locationId?: string;
  newTier: string;
  customUserLimit?: number;
  customTierPrice?: number;
}

export interface ExtendTrialPayload {
  newEndDate: string;
  locationId?: string;
}

// --- API Service ---

/**
 * Subscription API service.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 * We cast accordingly so TypeScript matches the runtime behaviour.
 */
export const subscriptionApi = {
  /** Get subscription detail with per-location cost breakdown */
  getDetail: (companyId: string) =>
    client.get(`/platform/billing/subscriptions/${companyId}`) as Promise<ApiResponse<SubscriptionDetail>>,

  /** Get cost preview for billing type change */
  getCostPreview: (companyId: string, params: { billingType?: BillingType; locationId?: string }) =>
    client.get(`/platform/billing/subscriptions/${companyId}/cost-preview`, { params }) as Promise<ApiResponse<CostPreviewResponse>>,

  /** Change billing type for subscription or specific location */
  changeBillingType: (companyId: string, data: ChangeBillingTypePayload) =>
    client.patch(`/platform/billing/subscriptions/${companyId}/billing-type`, data) as Promise<ApiResponse<any>>,

  /** Change user tier for subscription or specific location */
  changeTier: (companyId: string, data: ChangeTierPayload) =>
    client.patch(`/platform/billing/subscriptions/${companyId}/tier`, data) as Promise<ApiResponse<any>>,

  /** Extend trial period */
  extendTrial: (companyId: string, data: ExtendTrialPayload) =>
    client.patch(`/platform/billing/subscriptions/${companyId}/trial`, data) as Promise<ApiResponse<any>>,

  /** Cancel subscription (sets 30-day export window) */
  cancel: (companyId: string) =>
    client.post(`/platform/billing/subscriptions/${companyId}/cancel`) as Promise<ApiResponse<any>>,

  /** Reactivate a suspended/cancelled/expired subscription */
  reactivate: (companyId: string) =>
    client.post(`/platform/billing/subscriptions/${companyId}/reactivate`) as Promise<ApiResponse<any>>,
};

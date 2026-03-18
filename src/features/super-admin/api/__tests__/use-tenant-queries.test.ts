/**
 * Tests for: src/features/super-admin/api/use-tenant-queries.ts
 *
 * Strategy:
 * - Mock `@/lib/api/tenant` so that all tenantApi methods are jest functions.
 * - Each hook is tested via `renderHook` wrapped in a fresh QueryClientProvider
 *   created per test to ensure no shared cache state between tests.
 * - Query hooks are tested for: correct API method delegation, correct query key
 *   structure, and enabled/disabled behaviour.
 * - Mutation hooks are tested for: correct API method delegation, cache
 *   invalidation on success (via spy on queryClient.invalidateQueries),
 *   and error propagation.
 * - `notifyManager.setNotifyFunction` wraps React Query notifications in `act()`
 *   so that state updates are flushed synchronously in the test environment.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks — hoisted before all imports
// ---------------------------------------------------------------------------

jest.mock('@/lib/api/tenant', () => ({
  tenantApi: {
    onboard: jest.fn(),
    listCompanies: jest.fn(),
    getCompanyDetail: jest.fn(),
    updateSection: jest.fn(),
    updateStatus: jest.fn(),
    deleteCompany: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------
import { tenantApi } from '@/lib/api/tenant';
import {
  tenantKeys,
  useTenantList,
  useTenantDetail,
  useOnboardTenant,
  useUpdateCompanySection,
  useUpdateCompanyStatus,
  useDeleteCompany,
} from '@/features/super-admin/api/use-tenant-queries';

// Typed mock references
const mockOnboard = jest.mocked(tenantApi.onboard);
const mockListCompanies = jest.mocked(tenantApi.listCompanies);
const mockGetCompanyDetail = jest.mocked(tenantApi.getCompanyDetail);
const mockUpdateSection = jest.mocked(tenantApi.updateSection);
const mockUpdateStatus = jest.mocked(tenantApi.updateStatus);
const mockDeleteCompany = jest.mocked(tenantApi.deleteCompany);

// ---------------------------------------------------------------------------
// Sync React Query notifications with act() for test stability
// ---------------------------------------------------------------------------

beforeAll(() => {
  notifyManager.setNotifyFunction((callback) => {
    act(() => {
      callback();
    });
  });
});

afterAll(() => {
  notifyManager.setNotifyFunction((callback) => {
    callback();
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Creates a fresh QueryClient per test with retries disabled so failed
 * queries/mutations reject immediately without retry backoff delays.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

/**
 * Returns a React wrapper that provides a fresh QueryClient.
 * Must be called once per test to avoid cross-test cache pollution.
 */
function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const COMPANY_ID = 'company-abc-123';
const SECTION_KEY = 'identity';

const MOCK_PAGINATED_RESPONSE = {
  success: true,
  data: [
    {
      id: COMPANY_ID,
      name: 'Acme Corp',
      displayName: 'Acme Corp',
      legalName: 'Acme Corporation Pvt Ltd',
      industry: 'Manufacturing',
      businessType: 'Private',
      wizardStatus: 'Active',
      companyCode: 'ACME',
      emailDomain: 'acme.com',
      endpointType: 'SINGLE',
      multiLocationMode: false,
      createdAt: '2026-03-18T10:00:00.000Z',
      _count: { locations: 1, contacts: 0 },
      tenant: { id: 't-1', status: 'Active' },
    },
  ],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const MOCK_DETAIL_RESPONSE = {
  success: true,
  data: {
    id: COMPANY_ID,
    name: 'Acme Corp',
    displayName: 'Acme Corp',
    legalName: 'Acme Corporation Pvt Ltd',
    industry: 'Manufacturing',
    businessType: 'Private',
    wizardStatus: 'Active',
    companyCode: 'ACME',
    emailDomain: 'acme.com',
    endpointType: 'SINGLE',
    multiLocationMode: false,
    createdAt: '2026-03-18T10:00:00.000Z',
    updatedAt: '2026-03-18T10:00:00.000Z',
    locations: [],
    contacts: [],
    shifts: [],
    noSeries: [],
    iotReasons: [],
    tenant: { id: 't-1', status: 'Active', subscriptions: [] },
    users: [],
  },
};

const MOCK_SUCCESS_RESPONSE = { success: true, data: null };
const MOCK_ONBOARD_PAYLOAD = { step1: { companyName: 'New Corp' } };

// ---------------------------------------------------------------------------
// tenantKeys (query key factory)
// ---------------------------------------------------------------------------

describe('tenantKeys', () => {
  it('all is ["tenants"]', () => {
    expect(tenantKeys.all).toEqual(['tenants']);
  });

  it('lists() returns ["tenants", "list"]', () => {
    expect(tenantKeys.lists()).toEqual(['tenants', 'list']);
  });

  it('list(params) returns ["tenants", "list", params]', () => {
    const params = { page: 1, search: 'corp' };
    expect(tenantKeys.list(params)).toEqual(['tenants', 'list', params]);
  });

  it('list(undefined) returns ["tenants", "list", undefined]', () => {
    expect(tenantKeys.list(undefined)).toEqual(['tenants', 'list', undefined]);
  });

  it('details() returns ["tenants", "detail"]', () => {
    expect(tenantKeys.details()).toEqual(['tenants', 'detail']);
  });

  it('detail(id) returns ["tenants", "detail", id]', () => {
    expect(tenantKeys.detail(COMPANY_ID)).toEqual(['tenants', 'detail', COMPANY_ID]);
  });
});

// ---------------------------------------------------------------------------
// useTenantList
// ---------------------------------------------------------------------------

describe('useTenantList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls tenantApi.listCompanies with no params when hook is called with no args', async () => {
    mockListCompanies.mockResolvedValueOnce(MOCK_PAGINATED_RESPONSE);
    const wrapper = createWrapper(queryClient);
    renderHook(() => useTenantList(), { wrapper });

    await waitFor(() => expect(mockListCompanies).toHaveBeenCalledTimes(1));
    expect(mockListCompanies).toHaveBeenCalledWith(undefined);
  });

  it('calls tenantApi.listCompanies with provided params', async () => {
    mockListCompanies.mockResolvedValueOnce(MOCK_PAGINATED_RESPONSE);
    const params = { page: 2, limit: 10, search: 'acme', status: 'Active' };
    const wrapper = createWrapper(queryClient);
    renderHook(() => useTenantList(params), { wrapper });

    await waitFor(() => expect(mockListCompanies).toHaveBeenCalledTimes(1));
    expect(mockListCompanies).toHaveBeenCalledWith(params);
  });

  it('uses tenantKeys.list(params) as the query key', async () => {
    mockListCompanies.mockResolvedValueOnce(MOCK_PAGINATED_RESPONSE);
    const params = { page: 1 };
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useTenantList(params), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The cached key must match tenantKeys.list(params)
    const cache = queryClient.getQueryCache().findAll({
      queryKey: tenantKeys.list(params),
    });
    expect(cache).toHaveLength(1);
  });

  it('exposes data returned by tenantApi.listCompanies', async () => {
    mockListCompanies.mockResolvedValueOnce(MOCK_PAGINATED_RESPONSE);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useTenantList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_PAGINATED_RESPONSE);
  });

  it('enters error state when tenantApi.listCompanies rejects', async () => {
    mockListCompanies.mockRejectedValueOnce(new Error('Server Error'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useTenantList(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('Server Error'));
  });
});

// ---------------------------------------------------------------------------
// useTenantDetail
// ---------------------------------------------------------------------------

describe('useTenantDetail', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls tenantApi.getCompanyDetail with the provided company ID', async () => {
    mockGetCompanyDetail.mockResolvedValueOnce(MOCK_DETAIL_RESPONSE);
    const wrapper = createWrapper(queryClient);
    renderHook(() => useTenantDetail(COMPANY_ID), { wrapper });

    await waitFor(() => expect(mockGetCompanyDetail).toHaveBeenCalledTimes(1));
    expect(mockGetCompanyDetail).toHaveBeenCalledWith(COMPANY_ID);
  });

  it('uses tenantKeys.detail(companyId) as the query key', async () => {
    mockGetCompanyDetail.mockResolvedValueOnce(MOCK_DETAIL_RESPONSE);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useTenantDetail(COMPANY_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = queryClient.getQueryCache().findAll({
      queryKey: tenantKeys.detail(COMPANY_ID),
    });
    expect(cache).toHaveLength(1);
  });

  it('does NOT fetch when companyId is an empty string (enabled: false)', async () => {
    const wrapper = createWrapper(queryClient);
    renderHook(() => useTenantDetail(''), { wrapper });

    // Give React Query a tick to potentially trigger the fetch
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockGetCompanyDetail).not.toHaveBeenCalled();
  });

  it('exposes data returned by tenantApi.getCompanyDetail', async () => {
    mockGetCompanyDetail.mockResolvedValueOnce(MOCK_DETAIL_RESPONSE);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useTenantDetail(COMPANY_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_DETAIL_RESPONSE);
  });

  it('enters error state when tenantApi.getCompanyDetail rejects', async () => {
    mockGetCompanyDetail.mockRejectedValueOnce(new Error('Not Found'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useTenantDetail(COMPANY_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('Not Found'));
  });
});

// ---------------------------------------------------------------------------
// useOnboardTenant
// ---------------------------------------------------------------------------

describe('useOnboardTenant', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls tenantApi.onboard with the full wizard payload', async () => {
    mockOnboard.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useOnboardTenant(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MOCK_ONBOARD_PAYLOAD);
    });

    expect(mockOnboard).toHaveBeenCalledTimes(1);
    expect(mockOnboard).toHaveBeenCalledWith(MOCK_ONBOARD_PAYLOAD);
  });

  it('invalidates tenantKeys.all on success', async () => {
    mockOnboard.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useOnboardTenant(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MOCK_ONBOARD_PAYLOAD);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tenantKeys.all });
  });

  it('does not invalidate when tenantApi.onboard rejects', async () => {
    mockOnboard.mockRejectedValueOnce(new Error('Validation failed'));
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useOnboardTenant(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync(MOCK_ONBOARD_PAYLOAD);
      } catch {
        // expected
      }
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('returns the API response from mutateAsync', async () => {
    const expected = { success: true, data: { tenantId: 't-new-1' } };
    mockOnboard.mockResolvedValueOnce(expected);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useOnboardTenant(), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.mutateAsync(MOCK_ONBOARD_PAYLOAD);
    });

    expect(returnValue).toEqual(expected);
  });

  it('enters error state when tenantApi.onboard rejects', async () => {
    mockOnboard.mockRejectedValueOnce(new Error('Onboard failed'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useOnboardTenant(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync(MOCK_ONBOARD_PAYLOAD);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('Onboard failed'));
  });
});

// ---------------------------------------------------------------------------
// useUpdateCompanySection
// ---------------------------------------------------------------------------

describe('useUpdateCompanySection', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  const SECTION_DATA = { companyName: 'Updated Corp' };
  const MUTATION_VARS = { companyId: COMPANY_ID, sectionKey: SECTION_KEY, data: SECTION_DATA };

  it('calls tenantApi.updateSection with companyId, sectionKey, and data', async () => {
    mockUpdateSection.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateCompanySection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MUTATION_VARS);
    });

    expect(mockUpdateSection).toHaveBeenCalledTimes(1);
    expect(mockUpdateSection).toHaveBeenCalledWith(COMPANY_ID, SECTION_KEY, SECTION_DATA);
  });

  it('invalidates the company detail key on success', async () => {
    mockUpdateSection.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateCompanySection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MUTATION_VARS);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: tenantKeys.detail(COMPANY_ID),
    });
  });

  it('invalidates the tenant lists key on success', async () => {
    mockUpdateSection.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateCompanySection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MUTATION_VARS);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tenantKeys.lists() });
  });

  it('invalidates exactly two query keys on success', async () => {
    mockUpdateSection.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateCompanySection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MUTATION_VARS);
    });

    // detail + lists = 2 invalidation calls
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it('enters error state when tenantApi.updateSection rejects', async () => {
    mockUpdateSection.mockRejectedValueOnce(new Error('Conflict'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateCompanySection(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync(MUTATION_VARS);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useUpdateCompanyStatus
// ---------------------------------------------------------------------------

describe('useUpdateCompanyStatus', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls tenantApi.updateStatus with companyId and status', async () => {
    mockUpdateStatus.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateCompanyStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ companyId: COMPANY_ID, status: 'Active' });
    });

    expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
    expect(mockUpdateStatus).toHaveBeenCalledWith(COMPANY_ID, 'Active');
  });

  it('invalidates the company detail key on success', async () => {
    mockUpdateStatus.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateCompanyStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ companyId: COMPANY_ID, status: 'Inactive' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: tenantKeys.detail(COMPANY_ID),
    });
  });

  it('invalidates the tenant lists key on success', async () => {
    mockUpdateStatus.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateCompanyStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ companyId: COMPANY_ID, status: 'Pilot' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tenantKeys.lists() });
  });

  it('invalidates exactly two query keys on success', async () => {
    mockUpdateStatus.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateCompanyStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ companyId: COMPANY_ID, status: 'Active' });
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it('works correctly for all valid status values', async () => {
    const statuses = ['Draft', 'Pilot', 'Active', 'Inactive'];

    for (const status of statuses) {
      jest.clearAllMocks();
      queryClient = makeQueryClient();
      mockUpdateStatus.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(() => useUpdateCompanyStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ companyId: COMPANY_ID, status });
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith(COMPANY_ID, status);
    }
  });

  it('enters error state when tenantApi.updateStatus rejects', async () => {
    mockUpdateStatus.mockRejectedValueOnce(new Error('Forbidden'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateCompanyStatus(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ companyId: COMPANY_ID, status: 'Active' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useDeleteCompany
// ---------------------------------------------------------------------------

describe('useDeleteCompany', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls tenantApi.deleteCompany with the provided company ID', async () => {
    mockDeleteCompany.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(COMPANY_ID);
    });

    expect(mockDeleteCompany).toHaveBeenCalledTimes(1);
    expect(mockDeleteCompany).toHaveBeenCalledWith(COMPANY_ID);
  });

  it('invalidates tenantKeys.all on success', async () => {
    mockDeleteCompany.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(COMPANY_ID);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tenantKeys.all });
  });

  it('invalidates exactly one query key on success (tenants.all covers everything)', async () => {
    mockDeleteCompany.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(COMPANY_ID);
    });

    // Delete invalidates the root key which cascades — only 1 call needed
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it('does not invalidate when tenantApi.deleteCompany rejects', async () => {
    mockDeleteCompany.mockRejectedValueOnce(new Error('Has active subscriptions'));
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync(COMPANY_ID);
      } catch {
        // expected
      }
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('returns the API response from mutateAsync', async () => {
    const expected = { success: true, data: null };
    mockDeleteCompany.mockResolvedValueOnce(expected);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.mutateAsync(COMPANY_ID);
    });

    expect(returnValue).toEqual(expected);
  });

  it('enters error state when tenantApi.deleteCompany rejects', async () => {
    mockDeleteCompany.mockRejectedValueOnce(new Error('Delete failed'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync(COMPANY_ID);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('Delete failed'));
  });
});

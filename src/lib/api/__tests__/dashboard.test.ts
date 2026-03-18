/**
 * Tests for: src/lib/api/dashboard.ts
 *
 * Strategy:
 * - Mock `@/lib/api/client` so that `client.get` is a jest function.
 * - Mock `@/lib/api/auth` to satisfy the type re-export without pulling in
 *   auth module dependencies (axios, MMKV, etc.).
 * - All jest.mock factories are self-contained.
 * - Each method is tested for: correct endpoint, correct params, correct
 *   response pass-through, and error propagation.
 * - dashboardApi only uses GET; all tests verify no other HTTP method is used.
 */

// ---------------------------------------------------------------------------
// Mocks — hoisted before all imports
// ---------------------------------------------------------------------------

jest.mock('@/lib/api/client', () => ({
  client: {
    get: jest.fn(),
  },
}));

// auth.ts is imported only for its ApiResponse type re-export; mock to keep
// the test hermetic from the auth module's own dependencies.
jest.mock('@/lib/api/auth', () => ({}));

// ---------------------------------------------------------------------------
// Imports — after mocks so they receive mocked modules
// ---------------------------------------------------------------------------
import { client } from '@/lib/api/client';
import { dashboardApi } from '@/lib/api/dashboard';

// Typed mock reference
const mockGet = jest.mocked(client.get);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const MOCK_STATS_RESPONSE = {
  success: true,
  data: {
    totalCompanies: 42,
    activeCompanies: 38,
    totalRevenue: 1_200_000,
    pendingInvoices: 7,
  },
};

const MOCK_ACTIVITY_RESPONSE = {
  success: true,
  data: [
    { id: 'act-1', type: 'COMPANY_CREATED', description: 'Acme Corp onboarded', createdAt: '2024-06-01T10:00:00.000Z' },
    { id: 'act-2', type: 'STATUS_CHANGED', description: 'Corp B activated', createdAt: '2024-06-01T09:00:00.000Z' },
  ],
};

const MOCK_REVENUE_METRICS_RESPONSE = {
  success: true,
  data: {
    mrr: 90_000,
    arr: 1_080_000,
    growth: 12.5,
  },
};

const MOCK_BILLING_SUMMARY_RESPONSE = {
  success: true,
  data: {
    totalInvoiced: 450_000,
    totalCollected: 420_000,
    overdue: 30_000,
  },
};

const MOCK_INVOICES_RESPONSE = {
  success: true,
  data: [
    { id: 'inv-1', amount: 5000, status: 'Paid', dueDate: '2024-05-31' },
    { id: 'inv-2', amount: 3000, status: 'Overdue', dueDate: '2024-04-30' },
  ],
};

const MOCK_REVENUE_CHART_RESPONSE = {
  success: true,
  data: [
    { month: '2024-01', revenue: 80_000 },
    { month: '2024-02', revenue: 85_000 },
    { month: '2024-03', revenue: 90_000 },
  ],
};

const MOCK_COMPANY_ADMIN_STATS_RESPONSE = {
  success: true,
  data: {
    totalUsers: 150,
    activeUsers: 142,
    totalLocations: 5,
  },
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('dashboardApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  describe('getSuperAdminStats', () => {
    it('calls GET /platform/dashboard/stats', async () => {
      mockGet.mockResolvedValueOnce(MOCK_STATS_RESPONSE);

      await dashboardApi.getSuperAdminStats();

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/platform/dashboard/stats');
    });

    it('calls with no additional arguments (no params object)', async () => {
      mockGet.mockResolvedValueOnce(MOCK_STATS_RESPONSE);

      await dashboardApi.getSuperAdminStats();

      expect(mockGet.mock.calls[0]).toHaveLength(1);
    });

    it('returns the response from the client', async () => {
      mockGet.mockResolvedValueOnce(MOCK_STATS_RESPONSE);

      const result = await dashboardApi.getSuperAdminStats();

      expect(result).toEqual(MOCK_STATS_RESPONSE);
    });

    it('rejects when the client rejects', async () => {
      mockGet.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(dashboardApi.getSuperAdminStats()).rejects.toThrow('Unauthorized');
    });
  });

  // =========================================================================
  describe('getRecentActivity', () => {
    it('calls GET /platform/dashboard/activity with a limit param when provided', async () => {
      mockGet.mockResolvedValueOnce(MOCK_ACTIVITY_RESPONSE);

      await dashboardApi.getRecentActivity(20);

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/platform/dashboard/activity', { params: { limit: 20 } });
    });

    it('calls GET /platform/dashboard/activity with limit=undefined when no argument provided', async () => {
      mockGet.mockResolvedValueOnce(MOCK_ACTIVITY_RESPONSE);

      await dashboardApi.getRecentActivity();

      expect(mockGet).toHaveBeenCalledWith('/platform/dashboard/activity', {
        params: { limit: undefined },
      });
    });

    it('passes limit=10 (the hook default) correctly', async () => {
      mockGet.mockResolvedValueOnce(MOCK_ACTIVITY_RESPONSE);

      await dashboardApi.getRecentActivity(10);

      expect(mockGet).toHaveBeenCalledWith('/platform/dashboard/activity', {
        params: { limit: 10 },
      });
    });

    it('returns the response from the client', async () => {
      mockGet.mockResolvedValueOnce(MOCK_ACTIVITY_RESPONSE);

      const result = await dashboardApi.getRecentActivity(5);

      expect(result).toEqual(MOCK_ACTIVITY_RESPONSE);
    });

    it('rejects when the client rejects', async () => {
      mockGet.mockRejectedValueOnce(new Error('Server Error'));

      await expect(dashboardApi.getRecentActivity(10)).rejects.toThrow('Server Error');
    });
  });

  // =========================================================================
  describe('getRevenueMetrics', () => {
    it('calls GET /platform/dashboard/revenue', async () => {
      mockGet.mockResolvedValueOnce(MOCK_REVENUE_METRICS_RESPONSE);

      await dashboardApi.getRevenueMetrics();

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/platform/dashboard/revenue');
    });

    it('calls with no additional arguments', async () => {
      mockGet.mockResolvedValueOnce(MOCK_REVENUE_METRICS_RESPONSE);

      await dashboardApi.getRevenueMetrics();

      expect(mockGet.mock.calls[0]).toHaveLength(1);
    });

    it('returns the response from the client', async () => {
      mockGet.mockResolvedValueOnce(MOCK_REVENUE_METRICS_RESPONSE);

      const result = await dashboardApi.getRevenueMetrics();

      expect(result).toEqual(MOCK_REVENUE_METRICS_RESPONSE);
    });

    it('rejects when the client rejects', async () => {
      mockGet.mockRejectedValueOnce(new Error('Forbidden'));

      await expect(dashboardApi.getRevenueMetrics()).rejects.toThrow('Forbidden');
    });
  });

  // =========================================================================
  describe('getBillingSummary', () => {
    it('calls GET /platform/billing/summary', async () => {
      mockGet.mockResolvedValueOnce(MOCK_BILLING_SUMMARY_RESPONSE);

      await dashboardApi.getBillingSummary();

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/platform/billing/summary');
    });

    it('calls with no additional arguments', async () => {
      mockGet.mockResolvedValueOnce(MOCK_BILLING_SUMMARY_RESPONSE);

      await dashboardApi.getBillingSummary();

      expect(mockGet.mock.calls[0]).toHaveLength(1);
    });

    it('returns the response from the client', async () => {
      mockGet.mockResolvedValueOnce(MOCK_BILLING_SUMMARY_RESPONSE);

      const result = await dashboardApi.getBillingSummary();

      expect(result).toEqual(MOCK_BILLING_SUMMARY_RESPONSE);
    });

    it('rejects when the client rejects', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network Error'));

      await expect(dashboardApi.getBillingSummary()).rejects.toThrow('Network Error');
    });
  });

  // =========================================================================
  describe('getInvoices', () => {
    it('calls GET /platform/billing/invoices with no params when called with no arguments', async () => {
      mockGet.mockResolvedValueOnce(MOCK_INVOICES_RESPONSE);

      await dashboardApi.getInvoices();

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/platform/billing/invoices', { params: undefined });
    });

    it('passes all query params through', async () => {
      mockGet.mockResolvedValueOnce(MOCK_INVOICES_RESPONSE);
      const params = { page: 2, limit: 15, status: 'Overdue' };

      await dashboardApi.getInvoices(params);

      expect(mockGet).toHaveBeenCalledWith('/platform/billing/invoices', { params });
    });

    it('passes partial params (page only)', async () => {
      mockGet.mockResolvedValueOnce(MOCK_INVOICES_RESPONSE);

      await dashboardApi.getInvoices({ page: 3 });

      expect(mockGet).toHaveBeenCalledWith('/platform/billing/invoices', {
        params: { page: 3 },
      });
    });

    it('passes partial params (status only)', async () => {
      mockGet.mockResolvedValueOnce(MOCK_INVOICES_RESPONSE);

      await dashboardApi.getInvoices({ status: 'Paid' });

      expect(mockGet).toHaveBeenCalledWith('/platform/billing/invoices', {
        params: { status: 'Paid' },
      });
    });

    it('returns the response from the client', async () => {
      mockGet.mockResolvedValueOnce(MOCK_INVOICES_RESPONSE);

      const result = await dashboardApi.getInvoices({ page: 1, limit: 10 });

      expect(result).toEqual(MOCK_INVOICES_RESPONSE);
    });

    it('rejects when the client rejects', async () => {
      mockGet.mockRejectedValueOnce(new Error('Timeout'));

      await expect(dashboardApi.getInvoices()).rejects.toThrow('Timeout');
    });
  });

  // =========================================================================
  describe('getRevenueChart', () => {
    it('calls GET /platform/billing/revenue-chart', async () => {
      mockGet.mockResolvedValueOnce(MOCK_REVENUE_CHART_RESPONSE);

      await dashboardApi.getRevenueChart();

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/platform/billing/revenue-chart');
    });

    it('calls with no additional arguments', async () => {
      mockGet.mockResolvedValueOnce(MOCK_REVENUE_CHART_RESPONSE);

      await dashboardApi.getRevenueChart();

      expect(mockGet.mock.calls[0]).toHaveLength(1);
    });

    it('returns the response from the client', async () => {
      mockGet.mockResolvedValueOnce(MOCK_REVENUE_CHART_RESPONSE);

      const result = await dashboardApi.getRevenueChart();

      expect(result).toEqual(MOCK_REVENUE_CHART_RESPONSE);
    });

    it('rejects when the client rejects', async () => {
      mockGet.mockRejectedValueOnce(new Error('Service Unavailable'));

      await expect(dashboardApi.getRevenueChart()).rejects.toThrow('Service Unavailable');
    });
  });

  // =========================================================================
  describe('getCompanyAdminStats', () => {
    it('calls GET /dashboard/company-stats (company-admin route, not /platform/)', async () => {
      mockGet.mockResolvedValueOnce(MOCK_COMPANY_ADMIN_STATS_RESPONSE);

      await dashboardApi.getCompanyAdminStats();

      expect(mockGet).toHaveBeenCalledTimes(1);
      // This endpoint is under /dashboard/, NOT /platform/dashboard/ — intentional
      // design for company-scoped routes.
      expect(mockGet).toHaveBeenCalledWith('/dashboard/company-stats');
    });

    it('calls with no additional arguments', async () => {
      mockGet.mockResolvedValueOnce(MOCK_COMPANY_ADMIN_STATS_RESPONSE);

      await dashboardApi.getCompanyAdminStats();

      expect(mockGet.mock.calls[0]).toHaveLength(1);
    });

    it('returns the response from the client', async () => {
      mockGet.mockResolvedValueOnce(MOCK_COMPANY_ADMIN_STATS_RESPONSE);

      const result = await dashboardApi.getCompanyAdminStats();

      expect(result).toEqual(MOCK_COMPANY_ADMIN_STATS_RESPONSE);
    });

    it('rejects when the client rejects', async () => {
      mockGet.mockRejectedValueOnce(new Error('Not Found'));

      await expect(dashboardApi.getCompanyAdminStats()).rejects.toThrow('Not Found');
    });
  });

  // =========================================================================
  // Cross-method isolation — ensure methods don't bleed into each other
  // =========================================================================
  describe('method isolation', () => {
    it('each method calls GET exactly once and no other HTTP verbs', async () => {
      // All dashboard methods should only use GET
      const methods = [
        () => dashboardApi.getSuperAdminStats(),
        () => dashboardApi.getRecentActivity(5),
        () => dashboardApi.getRevenueMetrics(),
        () => dashboardApi.getBillingSummary(),
        () => dashboardApi.getInvoices(),
        () => dashboardApi.getRevenueChart(),
        () => dashboardApi.getCompanyAdminStats(),
      ];

      for (const method of methods) {
        mockGet.mockResolvedValueOnce({ success: true, data: null });
        await method();
      }

      // Every call in this test was a GET
      expect(mockGet).toHaveBeenCalledTimes(methods.length);
    });
  });
});

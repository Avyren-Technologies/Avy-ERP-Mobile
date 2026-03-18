/**
 * Tests for: src/lib/api/tenant.ts
 *
 * Strategy:
 * - Mock `@/lib/api/client` so that `client.post`, `client.get`, `client.patch`,
 *   `client.put`, and `client.delete` are jest functions.
 * - Mock `@/lib/api/auth` to satisfy the type re-export (no runtime calls needed).
 * - All jest.mock factories are self-contained and reference only variables
 *   prefixed with 'mock' to satisfy Jest's hoisting rules.
 * - Each method is tested for: correct endpoint, correct params/body, correct
 *   response pass-through, and error propagation.
 */

// ---------------------------------------------------------------------------
// Mocks — hoisted before all imports
// ---------------------------------------------------------------------------

jest.mock('@/lib/api/client', () => ({
  client: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// auth.ts is imported only for its ApiResponse type re-export; mock to keep
// the test hermetic from the auth module's own dependencies.
jest.mock('@/lib/api/auth', () => ({}));

// ---------------------------------------------------------------------------
// Imports — after mocks so they receive mocked modules
// ---------------------------------------------------------------------------
import { client } from '@/lib/api/client';
import { tenantApi } from '@/lib/api/tenant';

// Typed mock references
const mockPost = jest.mocked(client.post);
const mockGet = jest.mocked(client.get);
const mockPatch = jest.mocked(client.patch);
const mockPut = jest.mocked(client.put);
const mockDelete = jest.mocked(client.delete);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const COMPANY_ID = 'company-abc-123';
const SECTION_KEY = 'identity';

const MOCK_COMPANY_LIST_ITEM = {
  id: COMPANY_ID,
  name: 'Acme Corp',
  displayName: 'Acme',
  legalName: 'Acme Corporation Pvt Ltd',
  industry: 'Manufacturing',
  businessType: 'Private',
  wizardStatus: 'Active',
  companyCode: 'ACM001',
  emailDomain: 'acme.com',
  endpointType: 'default',
  multiLocationMode: true,
  createdAt: '2024-01-15T10:00:00.000Z',
};

const MOCK_COMPANY_DETAIL = {
  ...MOCK_COMPANY_LIST_ITEM,
  updatedAt: '2024-06-01T12:00:00.000Z',
  locations: [],
  contacts: [],
  shifts: [],
  noSeries: [],
  iotReasons: [],
  tenant: { id: 't-1', status: 'Active', subscriptions: [] },
  users: [],
};

const MOCK_PAGINATED_RESPONSE = {
  success: true,
  data: [MOCK_COMPANY_LIST_ITEM],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const MOCK_DETAIL_RESPONSE = {
  success: true,
  data: MOCK_COMPANY_DETAIL,
};

const MOCK_SUCCESS_RESPONSE = { success: true, data: null };

const MOCK_ONBOARD_PAYLOAD = {
  step1: { companyName: 'New Corp', legalName: 'New Corp Pvt Ltd' },
  step2: { pan: 'ABCDE1234F', gstin: '27ABCDE1234F1Z5' },
};

const MOCK_SECTION_DATA = {
  companyName: 'Updated Corp',
  legalName: 'Updated Corp Pvt Ltd',
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('tenantApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  describe('onboard', () => {
    it('calls POST /platform/tenants/onboard with the full wizard payload', async () => {
      mockPost.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

      await tenantApi.onboard(MOCK_ONBOARD_PAYLOAD);

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('/platform/tenants/onboard', MOCK_ONBOARD_PAYLOAD);
    });

    it('does not call any other HTTP method', async () => {
      mockPost.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

      await tenantApi.onboard(MOCK_ONBOARD_PAYLOAD);

      expect(mockGet).not.toHaveBeenCalled();
      expect(mockPatch).not.toHaveBeenCalled();
      expect(mockPut).not.toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('returns the response from the client', async () => {
      const expected = { success: true, data: { tenantId: 't-new-1' } };
      mockPost.mockResolvedValueOnce(expected);

      const result = await tenantApi.onboard(MOCK_ONBOARD_PAYLOAD);

      expect(result).toEqual(expected);
    });

    it('rejects when the client rejects', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network Error'));

      await expect(tenantApi.onboard(MOCK_ONBOARD_PAYLOAD)).rejects.toThrow('Network Error');
    });

    it('accepts an empty payload object', async () => {
      mockPost.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

      await tenantApi.onboard({});

      expect(mockPost).toHaveBeenCalledWith('/platform/tenants/onboard', {});
    });
  });

  // =========================================================================
  describe('listCompanies', () => {
    it('calls GET /platform/companies with no params when called with no arguments', async () => {
      mockGet.mockResolvedValueOnce(MOCK_PAGINATED_RESPONSE);

      await tenantApi.listCompanies();

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/platform/companies', { params: undefined });
    });

    it('passes all query params through', async () => {
      mockGet.mockResolvedValueOnce(MOCK_PAGINATED_RESPONSE);
      const params = { page: 2, limit: 10, search: 'acme', status: 'Active' };

      await tenantApi.listCompanies(params);

      expect(mockGet).toHaveBeenCalledWith('/platform/companies', { params });
    });

    it('passes partial params (page only)', async () => {
      mockGet.mockResolvedValueOnce(MOCK_PAGINATED_RESPONSE);

      await tenantApi.listCompanies({ page: 3 });

      expect(mockGet).toHaveBeenCalledWith('/platform/companies', { params: { page: 3 } });
    });

    it('passes partial params (search and status only)', async () => {
      mockGet.mockResolvedValueOnce(MOCK_PAGINATED_RESPONSE);

      await tenantApi.listCompanies({ search: 'corp', status: 'Draft' });

      expect(mockGet).toHaveBeenCalledWith('/platform/companies', {
        params: { search: 'corp', status: 'Draft' },
      });
    });

    it('returns the paginated response from the client', async () => {
      mockGet.mockResolvedValueOnce(MOCK_PAGINATED_RESPONSE);

      const result = await tenantApi.listCompanies();

      expect(result).toEqual(MOCK_PAGINATED_RESPONSE);
    });

    it('rejects when the client rejects', async () => {
      mockGet.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(tenantApi.listCompanies()).rejects.toThrow('Unauthorized');
    });
  });

  // =========================================================================
  describe('getCompanyDetail', () => {
    it('calls GET /platform/companies/:id with the correct company ID', async () => {
      mockGet.mockResolvedValueOnce(MOCK_DETAIL_RESPONSE);

      await tenantApi.getCompanyDetail(COMPANY_ID);

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith(`/platform/companies/${COMPANY_ID}`);
    });

    it('builds the correct URL for different IDs', async () => {
      mockGet.mockResolvedValueOnce(MOCK_DETAIL_RESPONSE);
      const otherId = 'xyz-789';

      await tenantApi.getCompanyDetail(otherId);

      expect(mockGet).toHaveBeenCalledWith(`/platform/companies/${otherId}`);
    });

    it('does not include a params object in the call', async () => {
      mockGet.mockResolvedValueOnce(MOCK_DETAIL_RESPONSE);

      await tenantApi.getCompanyDetail(COMPANY_ID);

      // The call should have only one argument (the URL), no second options arg.
      expect(mockGet.mock.calls[0]).toHaveLength(1);
    });

    it('returns the detail response from the client', async () => {
      mockGet.mockResolvedValueOnce(MOCK_DETAIL_RESPONSE);

      const result = await tenantApi.getCompanyDetail(COMPANY_ID);

      expect(result).toEqual(MOCK_DETAIL_RESPONSE);
    });

    it('rejects when the client rejects', async () => {
      mockGet.mockRejectedValueOnce(new Error('Not Found'));

      await expect(tenantApi.getCompanyDetail(COMPANY_ID)).rejects.toThrow('Not Found');
    });
  });

  // =========================================================================
  describe('updateSection', () => {
    it('calls PATCH /platform/companies/:id/sections/:sectionKey with correct URL and data', async () => {
      mockPatch.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

      await tenantApi.updateSection(COMPANY_ID, SECTION_KEY, MOCK_SECTION_DATA);

      expect(mockPatch).toHaveBeenCalledTimes(1);
      expect(mockPatch).toHaveBeenCalledWith(
        `/platform/companies/${COMPANY_ID}/sections/${SECTION_KEY}`,
        MOCK_SECTION_DATA,
      );
    });

    it('constructs the correct URL for different section keys', async () => {
      mockPatch.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

      await tenantApi.updateSection(COMPANY_ID, 'fiscal', { fiscalYearStart: '04' });

      expect(mockPatch).toHaveBeenCalledWith(
        `/platform/companies/${COMPANY_ID}/sections/fiscal`,
        { fiscalYearStart: '04' },
      );
    });

    it('does not call POST, GET, PUT, or DELETE', async () => {
      mockPatch.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

      await tenantApi.updateSection(COMPANY_ID, SECTION_KEY, MOCK_SECTION_DATA);

      expect(mockPost).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockPut).not.toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('returns the response from the client', async () => {
      const expected = { success: true, data: { updated: true } };
      mockPatch.mockResolvedValueOnce(expected);

      const result = await tenantApi.updateSection(COMPANY_ID, SECTION_KEY, MOCK_SECTION_DATA);

      expect(result).toEqual(expected);
    });

    it('rejects when the client rejects', async () => {
      mockPatch.mockRejectedValueOnce(new Error('Conflict'));

      await expect(
        tenantApi.updateSection(COMPANY_ID, SECTION_KEY, MOCK_SECTION_DATA),
      ).rejects.toThrow('Conflict');
    });
  });

  // =========================================================================
  describe('updateStatus', () => {
    it('calls PUT /platform/companies/:id/status with status in the request body', async () => {
      mockPut.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

      await tenantApi.updateStatus(COMPANY_ID, 'Active');

      expect(mockPut).toHaveBeenCalledTimes(1);
      expect(mockPut).toHaveBeenCalledWith(
        `/platform/companies/${COMPANY_ID}/status`,
        { status: 'Active' },
      );
    });

    it('sends the correct status value for each valid status', async () => {
      const statuses = ['Draft', 'Pilot', 'Active', 'Inactive'];

      for (const status of statuses) {
        mockPut.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

        await tenantApi.updateStatus(COMPANY_ID, status);

        expect(mockPut).toHaveBeenLastCalledWith(
          `/platform/companies/${COMPANY_ID}/status`,
          { status },
        );
      }
    });

    it('does not call POST, GET, PATCH, or DELETE', async () => {
      mockPut.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

      await tenantApi.updateStatus(COMPANY_ID, 'Active');

      expect(mockPost).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockPatch).not.toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('returns the response from the client', async () => {
      const expected = { success: true, data: { companyId: COMPANY_ID, status: 'Active' } };
      mockPut.mockResolvedValueOnce(expected);

      const result = await tenantApi.updateStatus(COMPANY_ID, 'Active');

      expect(result).toEqual(expected);
    });

    it('rejects when the client rejects', async () => {
      mockPut.mockRejectedValueOnce(new Error('Forbidden'));

      await expect(tenantApi.updateStatus(COMPANY_ID, 'Active')).rejects.toThrow('Forbidden');
    });
  });

  // =========================================================================
  describe('deleteCompany', () => {
    it('calls DELETE /platform/companies/:id with the correct company ID', async () => {
      mockDelete.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

      await tenantApi.deleteCompany(COMPANY_ID);

      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockDelete).toHaveBeenCalledWith(`/platform/companies/${COMPANY_ID}`);
    });

    it('builds the correct URL for different IDs', async () => {
      mockDelete.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);
      const otherId = 'delete-me-456';

      await tenantApi.deleteCompany(otherId);

      expect(mockDelete).toHaveBeenCalledWith(`/platform/companies/${otherId}`);
    });

    it('does not call POST, GET, PATCH, or PUT', async () => {
      mockDelete.mockResolvedValueOnce(MOCK_SUCCESS_RESPONSE);

      await tenantApi.deleteCompany(COMPANY_ID);

      expect(mockPost).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockPatch).not.toHaveBeenCalled();
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('returns the response from the client', async () => {
      const expected = { success: true, data: null };
      mockDelete.mockResolvedValueOnce(expected);

      const result = await tenantApi.deleteCompany(COMPANY_ID);

      expect(result).toEqual(expected);
    });

    it('rejects when the client rejects', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Company has active subscriptions'));

      await expect(tenantApi.deleteCompany(COMPANY_ID)).rejects.toThrow(
        'Company has active subscriptions',
      );
    });
  });
});

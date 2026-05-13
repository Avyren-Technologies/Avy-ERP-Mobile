import { client } from './client';

export interface PlatformUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER';
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  companyId: string | null;
  employeeId: string | null;
  mfaEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  company: { id: string; name: string } | null;
  companyName: string | null;
  tenantRoleId: string | null;
  tenantRoleName: string | null;
}

export interface PlatformUserStats {
  total: number;
  active: number;
  inactive: number;
  superAdmins: number;
  companyAdmins: number;
  regularUsers: number;
  companies: number;
}

export interface CompanyOption {
  id: string;
  name: string;
}

export interface PlatformUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  role?: string;
  isActive?: boolean;
}

export interface CreatePlatformUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyId: string;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER';
}

export interface UpdatePlatformUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  companyId?: string;
  role?: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER';
}

export const platformUsersApi = {
  listUsers: (params: PlatformUserListParams = {}) =>
    client.get('/platform/users', { params }),

  getUserById: (id: string) =>
    client.get(`/platform/users/${id}`),

  createUser: (data: CreatePlatformUserPayload) =>
    client.post('/platform/users', data),

  updateUser: (id: string, data: UpdatePlatformUserPayload) =>
    client.patch(`/platform/users/${id}`, data),

  resetPassword: (id: string, password: string) =>
    client.patch(`/platform/users/${id}/password`, { password }),

  updateStatus: (id: string, isActive: boolean) =>
    client.patch(`/platform/users/${id}/status`, { isActive }),

  deleteUser: (id: string) =>
    client.delete(`/platform/users/${id}`),

  getStats: () =>
    client.get('/platform/users/stats'),

  listCompanies: () =>
    client.get('/platform/users/companies'),
};

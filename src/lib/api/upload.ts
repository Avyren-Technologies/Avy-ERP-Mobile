import { client } from '@/lib/api/client';

export type FileCategory =
  | 'company-logo'
  | 'employee-photo'
  | 'employee-document'
  | 'education-certificate'
  | 'prev-employment-doc'
  | 'expense-receipt'
  | 'attendance-photo'
  | 'hr-letter'
  | 'recruitment-doc'
  | 'candidate-document'
  | 'training-material'
  | 'training-certificate'
  | 'payslip'
  | 'salary-revision'
  | 'offboarding-doc'
  | 'transfer-letter'
  | 'policy-document'
  | 'billing-invoice'
  | 'induction-content';

interface RequestUploadPayload {
  category: FileCategory;
  entityId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  companyId?: string;
}

interface UploadResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

interface DownloadUrlResponse {
  downloadUrl: string;
  expiresIn: number;
}

export const uploadApi = {
  requestUpload: (payload: RequestUploadPayload) =>
    client.post('/upload/request', payload),

  requestUploadPlatform: (payload: RequestUploadPayload) =>
    client.post('/platform/upload/request', payload),

  getDownloadUrl: (key: string) =>
    client.post('/upload/download-url', { key }),

  getDownloadUrlPlatform: (key: string) =>
    client.post('/platform/upload/download-url', { key }),
};

export const uploadKeys = {
  all: ['upload'] as const,
  downloadUrl: (key: string) => [...uploadKeys.all, 'download-url', key] as const,
};

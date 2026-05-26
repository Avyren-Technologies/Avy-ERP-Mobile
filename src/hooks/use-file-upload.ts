import { useState, useCallback } from 'react';
import { File as ExpoFile } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadApi, type FileCategory } from '@/lib/api/upload';
import { showErrorMessage } from '@/components/ui/utils';

interface FileInfo {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface UseFileUploadOptions {
  category: FileCategory;
  entityId: string;
  maxSize?: number;
  allowedTypes?: string[];
  platform?: boolean;
  companyId?: string;
  onSuccess?: (key: string) => void;
  onError?: (error: string) => void;
}

interface UseFileUploadReturn {
  upload: (file: FileInfo) => Promise<string | null>;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

const DEFAULT_IMAGE_MAX = 5 * 1024 * 1024;
const DEFAULT_DOC_MAX = 10 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** Mirror backend FILE_CATEGORY_CONFIG maxSizeEnvKey for categories we use on mobile. */
const CATEGORY_MAX_BYTES: Partial<Record<FileCategory, number>> = {
  'expense-receipt': DEFAULT_DOC_MAX,
  'leave-document': DEFAULT_DOC_MAX,
  'employee-document': DEFAULT_DOC_MAX,
  'attendance-photo': DEFAULT_IMAGE_MAX,
  'employee-photo': DEFAULT_IMAGE_MAX,
};

function resolveMaxUploadBytes(
  category: FileCategory,
  contentType: string,
  override?: number,
): number {
  if (override != null) return override;
  const fromCategory = CATEGORY_MAX_BYTES[category];
  if (fromCategory != null) return fromCategory;
  return IMAGE_TYPES.includes(contentType) ? DEFAULT_IMAGE_MAX : DEFAULT_DOC_MAX;
}

function normalizeUploadContentType(type: string): string {
  if (!type || type === 'image') return 'image/jpeg';
  if (type === 'image/heic' || type === 'image/heif') return 'image/jpeg';
  return type;
}

async function resolveUploadFileSize(uri: string, reportedSize: number): Promise<number> {
  if (reportedSize > 0) return reportedSize;

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > 0) {
      return info.size;
    }
  } catch {
    // fall through
  }

  try {
    const file = new ExpoFile(uri);
    if (file.exists && file.size > 0) return file.size;
  } catch {
    // fall through
  }

  return 0;
}

export function useFileUpload(options: UseFileUploadOptions): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: FileInfo): Promise<string | null> => {
      setError(null);
      setIsUploading(true);

      try {
        const contentType = normalizeUploadContentType(file.type);
        const fileSize = await resolveUploadFileSize(file.uri, file.size);

        if (fileSize <= 0) {
          const errMsg = 'Could not read file size. Please try again.';
          setError(errMsg);
          options.onError?.(errMsg);
          showErrorMessage(errMsg);
          return null;
        }

        const maxSize = resolveMaxUploadBytes(options.category, contentType, options.maxSize);

        if (fileSize > maxSize) {
          const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
          const errMsg = `File size exceeds ${maxMB} MB limit`;
          setError(errMsg);
          options.onError?.(errMsg);
          showErrorMessage(errMsg);
          return null;
        }

        if (options.allowedTypes && !options.allowedTypes.includes(contentType)) {
          const errMsg = `File type "${contentType}" is not allowed`;
          setError(errMsg);
          options.onError?.(errMsg);
          showErrorMessage(errMsg);
          return null;
        }

        const requestFn = options.platform
          ? uploadApi.requestUploadPlatform
          : uploadApi.requestUpload;

        const response = await requestFn({
          category: options.category,
          entityId: options.entityId,
          fileName: file.name,
          fileSize,
          contentType,
          companyId: options.companyId,
        });

        // Mobile interceptor strips axios wrapper, so response IS the API envelope
        const { uploadUrl, key } = (response as { data: { uploadUrl: string; key: string } }).data;

        const uploadResult = await FileSystem.uploadAsync(uploadUrl, file.uri, {
          httpMethod: 'PUT',
          headers: { 'Content-Type': contentType },
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error(`Upload failed with status ${uploadResult.status}`);
        }

        options.onSuccess?.(key);
        return key;
      } catch (err: unknown) {
        const errMsg =
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ??
          (err as { message?: string })?.message ??
          'Upload failed';
        setError(errMsg);
        options.onError?.(errMsg);
        showErrorMessage(errMsg);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [
      options.category,
      options.entityId,
      options.maxSize,
      options.allowedTypes,
      options.platform,
      options.companyId,
      options.onSuccess,
      options.onError,
    ],
  );

  return { upload, isUploading, error, reset };
}

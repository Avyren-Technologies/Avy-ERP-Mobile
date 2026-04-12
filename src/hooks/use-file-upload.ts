import { useState, useCallback } from 'react';
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
        const isImage = IMAGE_TYPES.includes(file.type);
        const maxSize = options.maxSize ?? (isImage ? DEFAULT_IMAGE_MAX : DEFAULT_DOC_MAX);

        if (file.size > maxSize) {
          const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
          const errMsg = `File size exceeds ${maxMB} MB limit`;
          setError(errMsg);
          options.onError?.(errMsg);
          return null;
        }

        if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
          const errMsg = `File type "${file.type}" is not allowed`;
          setError(errMsg);
          options.onError?.(errMsg);
          return null;
        }

        const requestFn = options.platform
          ? uploadApi.requestUploadPlatform
          : uploadApi.requestUpload;

        const response = await requestFn({
          category: options.category,
          entityId: options.entityId,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          companyId: options.companyId,
        });

        // Mobile interceptor strips axios wrapper, so response IS the API envelope
        const { uploadUrl, key } = (response as any).data;

        const uploadResult = await FileSystem.uploadAsync(uploadUrl, file.uri, {
          httpMethod: 'PUT',
          headers: { 'Content-Type': file.type },
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error(`Upload failed with status ${uploadResult.status}`);
        }

        options.onSuccess?.(key);
        return key;
      } catch (err: any) {
        const errMsg = err?.response?.data?.message || err?.message || 'Upload failed';
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

import { useQuery } from '@tanstack/react-query';
import { uploadApi, uploadKeys } from '@/lib/api/upload';

interface UseFileUrlOptions {
  key: string | null | undefined;
  enabled?: boolean;
  platform?: boolean;
}

/**
 * Fetches a pre-signed download URL for a stored R2 key.
 * All file references are R2 object keys — no base64 support.
 * Caches the pre-signed URL for 50 minutes (expires in 60).
 */
export function useFileUrl(options: UseFileUrlOptions) {
  const { key, enabled = true, platform = false } = options;

  const query = useQuery({
    queryKey: uploadKeys.downloadUrl(key ?? ''),
    queryFn: async () => {
      if (!key) return null;
      const fetchFn = platform
        ? uploadApi.getDownloadUrlPlatform
        : uploadApi.getDownloadUrl;
      const response = await fetchFn(key);
      return (response as any).data.downloadUrl;
    },
    enabled: enabled && !!key,
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
    retry: 1,
  });

  return {
    url: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

import { useState, useCallback } from 'react';
import { File as ExpoFile, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { Buffer } from 'buffer';

import { showSuccess, showErrorMessage } from '@/components/ui/utils';

interface DownloadOptions {
  fileName: string;
  mimeType: string;
  dialogTitle?: string;
}

export function useFileDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async (data: ArrayBuffer, options: DownloadOptions) => {
    setIsDownloading(true);
    try {
      const base64 = Buffer.from(data).toString('base64');
      const file = new ExpoFile(Paths.cache, options.fileName);
      file.create();
      file.write(base64, { encoding: 'base64' });

      await shareAsync(file.uri, {
        mimeType: options.mimeType,
        dialogTitle: options.dialogTitle ?? `Share ${options.fileName}`,
      });

      showSuccess('Report ready');
    } catch {
      showErrorMessage('Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return { download, isDownloading };
}

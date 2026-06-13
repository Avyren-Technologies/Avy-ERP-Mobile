/**
 * QR-code sharing helpers for VMS passes.
 *
 * Backend returns `qrCode` as a base64 data-URL (`data:image/png;base64,...`).
 * To share the image (so WhatsApp / Email / SMS receive the picture, not just
 * the text), we write it to a temp file in the cache directory and hand the URI
 * to `expo-sharing`. If the dataURL is missing or sharing isn't available, we
 * fall back to text-only via React Native `Share`.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

/**
 * Strip the `data:image/png;base64,` prefix from a data-URL.
 * Returns null if the input is not a recognised base64 image data-URL.
 */
function extractBase64(dataUrl: string | null | undefined): string | null {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
  return match ? match[1]! : null;
}

/** Build a filesystem-safe filename from arbitrary text. */
function safeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'pass';
}

/**
 * Share a QR-code image (with caption text) via the native share sheet.
 * Falls back to text-only sharing when the QR data-URL or `expo-sharing`
 * isn't usable.
 */
export async function shareQrCode(options: {
  qrCodeDataUrl: string | null | undefined;
  passNumber: string;
  caption: string;
  title?: string;
}): Promise<void> {
  const { qrCodeDataUrl, passNumber, caption, title } = options;
  const base64 = extractBase64(qrCodeDataUrl);
  const isSharingAvailable = await Sharing.isAvailableAsync().catch(() => false);

  if (!base64 || !isSharingAvailable) {
    // Fallback: text-only share
    try {
      await Share.share({
        message: caption,
        ...(title ? { title } : {}),
      });
    } catch {
      // user cancelled
    }
    return;
  }

  try {
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!dir) throw new Error('No cache directory available');
    const fileUri = `${dir}${safeFilename(passNumber)}.png`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(fileUri, {
      mimeType: 'image/png',
      dialogTitle: title ?? `Share Pass ${passNumber}`,
      UTI: 'public.png',
    });
  } catch {
    // Fall back to text share on any FS / share failure
    try {
      await Share.share({
        message: caption,
        ...(title ? { title } : {}),
      });
    } catch {
      // user cancelled
    }
  }
}

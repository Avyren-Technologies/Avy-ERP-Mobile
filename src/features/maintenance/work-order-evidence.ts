import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Matches backend `expense-receipt` → UPLOAD_MAX_DOCUMENT_SIZE (10 MB).
 */
export const MAX_EVIDENCE_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Camera: strong picker compression (no extra native packages). */
export const WORK_ORDER_EVIDENCE_CAMERA_OPTIONS: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.25,
    exif: false,
    allowsEditing: false,
    preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

/** Gallery: slightly higher quality is usually fine. */
export const WORK_ORDER_EVIDENCE_LIBRARY_OPTIONS: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.85,
    allowsMultipleSelection: false,
    preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

/** Stored in work order `closureEvidence` JSON (backend field name). */
export interface WorkOrderEvidenceItem {
    id: string;
    url: string;
    description?: string;
    fileName?: string;
    contentType?: string;
    uploadedAt: string;
}

export function isRemoteUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

export function normalizeWorkOrderEvidence(wo: {
    closureEvidence?: unknown;
    evidence?: unknown;
} | null | undefined): WorkOrderEvidenceItem[] {
    const raw = wo?.closureEvidence ?? wo?.evidence;
    if (!Array.isArray(raw)) return [];
    return raw.map((item, index) => normalizeEvidenceItem(item as Record<string, unknown>, index));
}

function normalizeEvidenceItem(item: Record<string, unknown>, index: number): WorkOrderEvidenceItem {
    const url = String(item.url ?? item.fileUrl ?? item.key ?? '');
    const fileType = item.fileType != null ? String(item.fileType) : undefined;
    let contentType = item.contentType != null ? String(item.contentType) : undefined;
    if (!contentType && fileType === 'image') {
        contentType = 'image/jpeg';
    }

    return {
        id: String(item.id ?? `evidence-${index}`),
        url,
        description:
            (item.description != null ? String(item.description) : undefined) ??
            (item.caption != null ? String(item.caption) : undefined),
        fileName: item.fileName != null ? String(item.fileName) : undefined,
        contentType,
        uploadedAt: String(
            item.uploadedAt ?? item.capturedAt ?? item.createdAt ?? new Date().toISOString(),
        ),
    };
}

export function createEvidenceItem(params: {
    url: string;
    description?: string;
    fileName?: string;
    contentType?: string;
}): WorkOrderEvidenceItem {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        url: params.url,
        ...(params.description?.trim() ? { description: params.description.trim() } : {}),
        ...(params.fileName ? { fileName: params.fileName } : {}),
        ...(params.contentType ? { contentType: params.contentType } : {}),
        uploadedAt: new Date().toISOString(),
    };
}

export function isImageContentType(contentType?: string | null): boolean {
    if (!contentType) return false;
    if (contentType === 'image') return true;
    return contentType.startsWith('image/');
}

export function isImageEvidenceItem(item: WorkOrderEvidenceItem): boolean {
    if (isImageContentType(item.contentType)) return true;
    const ref = item.url ?? '';
    if (isRemoteUrl(ref) && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(ref)) return true;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(ref);
}

export function getEvidenceDisplayName(item: WorkOrderEvidenceItem): string {
    return item.description?.trim() || item.fileName || 'Evidence file';
}

export function canAddWorkOrderEvidence(status: string): boolean {
    return !['CLOSED', 'CANCELLED', 'REJECTED'].includes(status);
}

function normalizeEvidenceMimeType(mime?: string | null): string {
    if (!mime || mime === 'image') return 'image/jpeg';
    if (mime === 'image/heic' || mime === 'image/heif') return 'image/jpeg';
    return mime;
}

async function getUriByteSize(uri: string): Promise<number> {
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

/** Copy camera temp file to cache so size can be read reliably on Android/iOS. */
async function cacheEvidencePhoto(uri: string): Promise<string> {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return uri;

    const dest = `${cacheDir}wo-evidence-${Date.now()}.jpg`;
    try {
        await FileSystem.copyAsync({ from: uri, to: dest });
        return dest;
    } catch {
        return uri;
    }
}

/** Prepare picker asset for R2 upload. Camera: copy to cache + read size. */
export async function prepareEvidenceImageForUpload(
    asset: ImagePicker.ImagePickerAsset,
): Promise<{ uri: string; name: string; type: string; size: number }> {
    let uri = asset.uri;
    const contentType = normalizeEvidenceMimeType(asset.mimeType);
    let fileName = asset.fileName ?? `evidence-${Date.now()}.jpg`;
    if (!/\.(jpe?g|png|gif|webp)$/i.test(fileName)) {
        fileName = `evidence-${Date.now()}.jpg`;
    }

    let size = asset.fileSize ?? 0;
    if (size <= 0) {
        uri = await cacheEvidencePhoto(uri);
        size = await getUriByteSize(uri);
    }

    const maxMb = (MAX_EVIDENCE_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);

    if (size <= 0) {
        throw new Error('Could not read photo file. Try Choose Photo, or retake with less zoom.');
    }

    if (size > MAX_EVIDENCE_UPLOAD_BYTES) {
        throw new Error(
            `Photo is too large (over ${maxMb} MB). Use Choose Photo, or retake closer to the subject.`,
        );
    }

    return { uri, name: fileName, type: contentType, size };
}

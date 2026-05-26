/** Resolve asset display fields from maintenance API payloads. */
export function resolveMaintenanceAssetNumber(
    asset?: { assetNumber?: string | null; code?: string | null } | null,
): string {
    if (!asset) return '—';
    const num = asset.assetNumber?.trim() || asset.code?.trim();
    return num || '—';
}

export function resolveMaintenanceAssetName(
    asset?: { name?: string | null } | null,
    fallback = '—',
): string {
    if (!asset?.name?.trim()) return fallback;
    return asset.name.trim();
}

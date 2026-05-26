/** Matches backend `WOTypeEnum` / Prisma `WOType`. */
export const MAINTENANCE_WO_TYPE_OPTIONS = [
    { value: 'PM', label: 'PM (Preventive Maintenance)' },
    { value: 'CORRECTIVE', label: 'Corrective' },
    { value: 'BREAKDOWN', label: 'Breakdown' },
    { value: 'INSPECTION', label: 'Inspection' },
    { value: 'OVERHAUL', label: 'Overhaul' },
    { value: 'SHUTDOWN', label: 'Shutdown' },
    { value: 'VENDOR_SERVICE', label: 'Vendor Service' },
    { value: 'CALIBRATION', label: 'Calibration' },
] as const;

/** Matches backend `WOPriorityEnum` / Prisma `WOPriority`. */
export const MAINTENANCE_WO_PRIORITY_OPTIONS = [
    { value: 'EMERGENCY', label: 'Emergency' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' },
] as const;

export const MAINTENANCE_WO_TYPE_LABELS: Record<string, string> = Object.fromEntries(
    MAINTENANCE_WO_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export function formatMaintenanceWoType(woType?: string | null): string {
    if (!woType) return '-';
    return MAINTENANCE_WO_TYPE_LABELS[woType] ?? woType;
}

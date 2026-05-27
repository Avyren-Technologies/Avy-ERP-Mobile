export const STOCK_STATUS_CONFIG: Record<string, { bg: string; text: string; icon: string; border: string; label: string }> = {
  AVAILABLE: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'check-circle', border: 'border-emerald-200', label: 'Available' },
  RESERVED: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'lock', border: 'border-violet-200', label: 'Reserved' },
  QC_HOLD: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'clock', border: 'border-amber-200', label: 'QC Hold' },
  BLOCKED: { bg: 'bg-red-50', text: 'text-red-700', icon: 'x-circle', border: 'border-red-200', label: 'Blocked' },
  QUARANTINE: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'alert-triangle', border: 'border-orange-200', label: 'Quarantine' },
  EXPIRED: { bg: 'bg-red-50', text: 'text-red-800', icon: 'calendar-x', border: 'border-red-300', label: 'Expired' },
  IN_TRANSIT: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'truck', border: 'border-blue-200', label: 'In Transit' },
  PICKED_STAGED: { bg: 'bg-teal-50', text: 'text-teal-700', icon: 'package-check', border: 'border-teal-200', label: 'Picked/Staged' },
  DRAFT_PENDING: { bg: 'bg-gray-50', text: 'text-gray-600', icon: 'file-text', border: 'border-gray-200', label: 'Draft' },
  IN_PRODUCTION_WIP: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'factory', border: 'border-blue-300', label: 'In Production (WIP)' },
  IN_USE_AT_MACHINE: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'cog', border: 'border-violet-200', label: 'In Use at Machine' },
  UNDER_RECONDITIONING: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'wrench', border: 'border-amber-300', label: 'Under Reconditioning' },
  CONDEMNED: { bg: 'bg-gray-100', text: 'text-gray-500', icon: 'trash-2', border: 'border-gray-300', label: 'Condemned' },
};

export const TRANSACTION_STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  DRAFT: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: 'Draft' },
  SUBMITTED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Submitted' },
  PENDING_APPROVAL: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending Approval' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Rejected' },
  POSTED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Posted' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', label: 'Cancelled' },
  REVERSED: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', label: 'Reversed' },
};

export const COUNT_STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  CREATED: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: 'Created' },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'In Progress' },
  VARIANCE_COMPUTED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Variance Computed' },
  PENDING_APPROVAL: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Pending Approval' },
  CLOSED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Closed' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', label: 'Cancelled' },
};

export const TOOL_LIFE_COLORS = {
  HEALTHY: { bg: 'bg-emerald-50', text: 'text-emerald-700', progressColor: '#10b981' },
  WARNING: { bg: 'bg-amber-50', text: 'text-amber-700', progressColor: '#f59e0b' },
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', progressColor: '#ef4444' },
  EXHAUSTED: { bg: 'bg-gray-100', text: 'text-gray-500', progressColor: '#9ca3af' },
};

export const RECONDITIONING_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  INITIATED: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Initiated' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'In Progress' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed' },
  OVERDUE: { bg: 'bg-red-50', text: 'text-red-700', label: 'Overdue' },
};

export const PALLET_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  OPEN: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Open' },
  CLOSED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Closed' },
  IN_TRANSIT: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'In Transit' },
  DISPATCHED: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Dispatched' },
};

export function getToolLifeLevel(pct: number) {
  if (pct <= 0) return TOOL_LIFE_COLORS.EXHAUSTED;
  if (pct < 20) return TOOL_LIFE_COLORS.CRITICAL;
  if (pct < 50) return TOOL_LIFE_COLORS.WARNING;
  return TOOL_LIFE_COLORS.HEALTHY;
}

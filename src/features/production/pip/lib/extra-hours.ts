/**
 * PIP Extra Hours — client-side mirror of the backend pure helpers
 * (avy-erp-backend pip-shift-hours.ts + pip-calculation.ts). Keep logic byte-for-byte
 * identical to backend + web so live preview matches persisted values.
 */

export interface ShiftTimes {
  startTime: string;
  endTime: string;
  isCrossDay: boolean;
}

export interface ShiftBreakLite {
  duration: number;
  isPaid: boolean;
}

function parseTimeToMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Returns net working hours (fractional), or null when the shift has no usable duration. */
export function computeShiftWorkingHours(shift: ShiftTimes, breaks: ShiftBreakLite[]): number | null {
  const startMin = parseTimeToMinutes(shift.startTime);
  const endMin = parseTimeToMinutes(shift.endTime);
  const grossMinutes = shift.isCrossDay ? (1440 - startMin) + endMin : endMin - startMin;
  if (!Number.isFinite(grossMinutes) || grossMinutes <= 0) return null;

  const unpaidMinutes = breaks.reduce((sum, b) => sum + (b.isPaid ? 0 : (b.duration || 0)), 0);
  const netMinutes = grossMinutes - unpaidMinutes;
  if (netMinutes <= 0) return null;

  return Math.round((netMinutes / 60) * 100) / 100;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface ExtraHoursPartEntry {
  partId: string;
  partNumber: string;
  partName: string;
  machineId: string;
  machineCode: string;
  qtyProduced: number;
  shiftTargetQty: number;
  slab1Rate: number;
}

export interface ExtraHoursPartResult extends ExtraHoursPartEntry {
  hourlyRate: number;
  extraHoursTarget: number;
  incentiveQty: number;
  incentiveAmount: number;
  breakdown: string;
}

export interface ExtraHoursResult {
  totalIncentive: number;
  extraHoursWorked: number;
  shiftHours: number;
  parts: ExtraHoursPartResult[];
}

/**
 * Extra Hours incentive — per-part, INDEPENDENT (no eligibility gate, Slab-1 flat).
 */
export function calculateExtraHoursIncentive(
  parts: ExtraHoursPartEntry[],
  extraHoursWorked: number,
  shiftHours: number,
): ExtraHoursResult {
  const results: ExtraHoursPartResult[] = parts.map((p) => {
    const hourlyRate = shiftHours > 0 ? p.shiftTargetQty / shiftHours : 0;
    const extraHoursTarget = Math.ceil(hourlyRate * extraHoursWorked);
    const incentiveQty = Math.max(0, p.qtyProduced - extraHoursTarget);
    const incentiveAmount = round2(incentiveQty * p.slab1Rate);
    const breakdown =
      incentiveQty > 0
        ? `${p.qtyProduced} − ${extraHoursTarget} target = ${incentiveQty} pcs @ ₹${p.slab1Rate} = ₹${incentiveAmount}`
        : `${p.qtyProduced} ≤ ${extraHoursTarget} target — no incentive`;
    return { ...p, hourlyRate: round2(hourlyRate), extraHoursTarget, incentiveQty, incentiveAmount, breakdown };
  });

  return {
    totalIncentive: round2(results.reduce((sum, r) => sum + r.incentiveAmount, 0)),
    extraHoursWorked,
    shiftHours,
    parts: results,
  };
}

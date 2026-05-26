import { DateTime } from 'luxon';

export type EmployeeOption = {
    id: string;
    name: string;
    code: string;
    sublabel: string;
};

export function resolveTechnicianName(
    technicianId: string | null | undefined,
    employees: EmployeeOption[],
): string {
    if (!technicianId) return '-';
    const match = employees.find((e) => e.id === technicianId);
    return match?.name ?? technicianId;
}

export function computePartLineCost(part: {
    totalCost?: unknown;
    quantity?: unknown;
    unitCost?: unknown;
}): number {
    const total = Number(part.totalCost ?? 0);
    if (total > 0) return total;
    return Number(part.quantity ?? 0) * Number(part.unitCost ?? 0);
}

export function computeLabourLineCost(log: {
    totalCost?: unknown;
    hours?: unknown;
    hourlyRate?: unknown;
}): number {
    const total = Number(log.totalCost ?? 0);
    if (total > 0) return total;
    const hours = Number(log.hours ?? 0);
    const rate = Number(log.hourlyRate ?? 0);
    return hours > 0 && rate > 0 ? Math.round(hours * rate * 100) / 100 : 0;
}

export function combineDateTimeToIso(
    dateStr: string,
    timeStr: string,
    timezone: string,
): string | null {
    if (!dateStr.trim() || !timeStr.trim()) return null;
    const dt = DateTime.fromFormat(
        `${dateStr.trim()} ${timeStr.trim()}`,
        'yyyy-MM-dd HH:mm',
        { zone: timezone },
    );
    if (!dt.isValid) return null;
    return dt.toUTC().toISO();
}

/** Date from picker + optional HH:mm; uses defaultTime when time is empty. */
export function combineDateTimeToIsoWithDefault(
    dateStr: string,
    timeStr: string,
    timezone: string,
    defaultTime: string,
): string | null {
    if (!dateStr.trim()) return null;
    const time = timeStr.trim() || defaultTime;
    return combineDateTimeToIso(dateStr, time, timezone);
}

export function nowInCompanyParts(timezone: string): { date: string; time: string } {
    const now = DateTime.now().setZone(timezone);
    return {
        date: now.toFormat('yyyy-MM-dd'),
        time: now.toFormat('HH:mm'),
    };
}

export function validateAddPartForm(partName: string, quantity: string): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!partName.trim()) errors.partName = 'Part name is required';
    const qty = Number(quantity);
    if (!quantity.trim() || Number.isNaN(qty) || qty <= 0) {
        errors.quantity = 'Valid quantity is required';
    }
    return errors;
}

export function validateLogLabourForm(params: {
    technicianId: string;
    startDate: string;
    startTime: string;
    hours: string;
    timezone: string;
    hourlyRate?: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!params.technicianId.trim()) errors.technicianId = 'Technician is required';
    if (!combineDateTimeToIso(params.startDate, params.startTime, params.timezone)) {
        errors.startTime = 'Valid start date and time are required';
    }
    const hours = Number(params.hours);
    if (!params.hours.trim() || Number.isNaN(hours) || hours <= 0) {
        errors.hours = 'Valid hours are required';
    }
    if (params.hourlyRate?.trim()) {
        const rate = Number(params.hourlyRate);
        if (Number.isNaN(rate) || rate < 0) errors.hourlyRate = 'Enter a valid hourly rate';
    }
    return errors;
}

export function buildLogLabourPayload(params: {
    technicianId: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    hours: string;
    hourlyRate: string;
    notes: string;
    timezone: string;
}): Record<string, unknown> | null {
    const startIso = combineDateTimeToIso(params.startDate, params.startTime, params.timezone);
    if (!startIso || !params.technicianId.trim()) return null;

    const payload: Record<string, unknown> = {
        technicianId: params.technicianId,
        startTime: startIso,
        hours: Number(params.hours),
    };

    const endIso = combineDateTimeToIso(params.endDate, params.endTime, params.timezone);
    if (endIso) payload.endTime = endIso;
    if (params.hourlyRate.trim() && !Number.isNaN(Number(params.hourlyRate))) {
        payload.hourlyRate = Number(params.hourlyRate);
    }
    if (params.notes.trim()) payload.notes = params.notes.trim();

    return payload;
}

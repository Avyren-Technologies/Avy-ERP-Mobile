/**
 * Joining date (YYYY-MM-DD) + probation days → probation end date (YYYY-MM-DD).
 * Uses local calendar arithmetic so the result matches what users expect from "joining + N days".
 */
export function addCalendarDaysToIsoDate(joiningYmd: string, days: number): string | null {
    const trimmed = joiningYmd.trim();
    const parts = trimmed.split('-').map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    const [y, m, d] = parts;
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    dt.setDate(dt.getDate() + days);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

export function getProbationDaysFromDesignation(designation: { probationDays?: number | null; probationPeriod?: number | null } | undefined): number | null {
    if (!designation) return null;
    const raw = designation.probationDays ?? designation.probationPeriod;
    if (typeof raw !== 'number' || Number.isNaN(raw) || raw <= 0) return null;
    return raw;
}

export function addCalendarMonthsToIsoDate(joiningYmd: string, months: number): string | null {
    const trimmed = joiningYmd.trim();
    const parts = trimmed.split('-').map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    const [y, m, d] = parts;
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    dt.setMonth(dt.getMonth() + months);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

export function computeProbationEndIsoFromMasters(
    joiningYmd: string,
    designation: { probationDays?: number | null; probationPeriod?: number | null } | undefined,
    grade: { probationMonths?: number | null } | undefined,
): string | null {
    const days = getProbationDaysFromDesignation(designation);
    if (days != null) {
        return addCalendarDaysToIsoDate(joiningYmd, days);
    }
    const months = grade?.probationMonths;
    if (typeof months === 'number' && !Number.isNaN(months) && months > 0) {
        return addCalendarMonthsToIsoDate(joiningYmd, months);
    }
    return null;
}

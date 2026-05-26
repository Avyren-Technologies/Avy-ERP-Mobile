/** UI + API helpers for PM schedules (aligned with backend validators). */

export type PMFormStrategyKey =
    | "PREVENTIVE_CALENDAR"
    | "PREVENTIVE_METER"
    | "CORRECTIVE"
    | "CONDITION_BASED"
    | "PREDICTIVE"
    | "SEASONAL"
    | "STATUTORY"
    | "AMC_MANAGED"
    | "RUN_TO_FAILURE"
    | "SHUTDOWN_OVERHAUL";

export const PM_STRATEGY_OPTIONS: { value: PMFormStrategyKey; label: string }[] = [
    { value: "PREVENTIVE_CALENDAR", label: "Calendar-based" },
    { value: "PREVENTIVE_METER", label: "Meter-based" },
    { value: "CORRECTIVE", label: "Corrective" },
    { value: "CONDITION_BASED", label: "Condition-based" },
    { value: "PREDICTIVE", label: "Predictive" },
    { value: "SEASONAL", label: "Seasonal" },
    { value: "STATUTORY", label: "Statutory / compliance" },
    { value: "AMC_MANAGED", label: "AMC-managed" },
    { value: "RUN_TO_FAILURE", label: "Run-to-failure" },
    { value: "SHUTDOWN_OVERHAUL", label: "Shutdown overhaul" },
];

/** Human-readable strategy label (matches create-form dropdown). */
export function formatPMStrategyLabel(strategyType?: string | null): string {
    if (!strategyType) return "—";
    return PM_STRATEGY_OPTIONS.find((o) => o.value === strategyType)?.label ?? strategyType.replace(/_/g, " ");
}

export const PM_STRATEGY_FILTER_OPTIONS = [
    { value: "", label: "All Strategies" },
    ...PM_STRATEGY_OPTIONS,
];

export const PM_FREQUENCY_OPTIONS = [
    { value: "DAILY", label: "Daily" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "FORTNIGHTLY", label: "Fortnightly" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "QUARTERLY", label: "Quarterly" },
    { value: "HALF_YEARLY", label: "Half-yearly" },
    { value: "ANNUALLY", label: "Annually" },
    { value: "CUSTOM_DAYS", label: "Custom interval (days)" },
];

export const PM_SCHEDULE_TYPE_OPTIONS = [
    { value: "FIXED", label: "Fixed (from planned date)" },
    { value: "FLOATING", label: "Floating (from last completion)" },
];

export function formatPMScheduleTypeLabel(scheduleType?: string | null): string {
    if (!scheduleType) return "—";
    return PM_SCHEDULE_TYPE_OPTIONS.find((o) => o.value === scheduleType)?.label ?? scheduleType;
}

export interface PMRescheduleHistoryEntry {
    oldDueDate?: string | Date | null;
    newDueDate?: string | Date | null;
    oldDate?: string | Date | null;
    newDate?: string | Date | null;
    reasonCode?: string | null;
    reasonNotes?: string | null;
    reason?: string | null;
    rescheduledAt?: string | Date | null;
    createdAt?: string | Date | null;
}

function toIsoDateString(value: string | Date | null | undefined): string | null {
    if (value == null) return null;
    if (typeof value === "string") return value;
    return value.toISOString();
}

export function getPMRescheduleOldDate(entry: PMRescheduleHistoryEntry): string | null {
    return toIsoDateString(entry.oldDueDate ?? entry.oldDate);
}

export function getPMRescheduleNewDate(entry: PMRescheduleHistoryEntry): string | null {
    return toIsoDateString(entry.newDueDate ?? entry.newDate);
}

export function getPMRescheduleTimestamp(entry: PMRescheduleHistoryEntry): string | null {
    return toIsoDateString(entry.rescheduledAt ?? entry.createdAt);
}

export function formatPMRescheduleReason(entry: PMRescheduleHistoryEntry): string | null {
    if (entry.reasonNotes?.trim()) return entry.reasonNotes.trim();
    const code = entry.reasonCode?.replace(/_/g, " ");
    if (code && code.toLowerCase() !== "other") return code;
    if (entry.reason?.trim()) return entry.reason.trim();
    if (code) return code;
    return null;
}

export const PM_METER_TYPE_OPTIONS = [
    { value: "RUNTIME_HOURS", label: "Runtime hours" },
    { value: "CYCLE_COUNT", label: "Cycle count" },
    { value: "MILEAGE", label: "Mileage" },
    { value: "OUTPUT_UNITS", label: "Output units" },
    { value: "ENERGY_KWH", label: "Energy (kWh)" },
    { value: "TEMPERATURE", label: "Temperature" },
    { value: "PRESSURE", label: "Pressure" },
    { value: "VIBRATION", label: "Vibration" },
];

export const PM_AUTO_ASSIGN_RULE_OPTIONS = [
    { value: "", label: "None" },
    { value: "PRIMARY_TECHNICIAN", label: "Primary technician" },
    { value: "ROUND_ROBIN", label: "Round robin" },
    { value: "SKILL_BASED", label: "Skill-based" },
];

export const PM_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: monthLabel(i + 1),
}));

export function monthLabel(month: number): string {
    const names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];
    return names[month - 1] ?? `Month ${month}`;
}

export interface PMScheduleFormState {
    assetId: string;
    name: string;
    strategyKey: PMFormStrategyKey;
    frequency: string;
    customIntervalDays: string;
    scheduleType: string;
    meterType: string;
    meterInterval: string;
    seasonStartMonth: number;
    seasonEndMonth: number;
    statutoryDueDate: string;
    leadDays: string;
    gracePeriodDays: string;
    jobPlanId: string;
    nextDueDate: string;
    autoAssignRule: string;
    autoAssignTo: string;
}

export function defaultPMScheduleFormState(): PMScheduleFormState {
    return {
        assetId: "",
        name: "",
        strategyKey: "PREVENTIVE_CALENDAR",
        frequency: "MONTHLY",
        customIntervalDays: "30",
        scheduleType: "FLOATING",
        meterType: "RUNTIME_HOURS",
        meterInterval: "",
        seasonStartMonth: 1,
        seasonEndMonth: 3,
        statutoryDueDate: "",
        leadDays: "7",
        gracePeriodDays: "0",
        jobPlanId: "",
        nextDueDate: "",
        autoAssignRule: "",
        autoAssignTo: "",
    };
}

const PM_STRATEGY_KEYS = new Set<string>(PM_STRATEGY_OPTIONS.map((o) => o.value));

function toDateInputValue(value?: string | Date | null): string {
    if (value == null || value === "") return "";
    const raw = typeof value === "string" ? value : value.toISOString();
    return raw.slice(0, 10);
}

export function pmScheduleToFormState(pm: Record<string, unknown>): PMScheduleFormState {
    const rawStrategy = String(pm.strategyType ?? "PREVENTIVE_CALENDAR");
    const strategyKey = PM_STRATEGY_KEYS.has(rawStrategy)
        ? (rawStrategy as PMFormStrategyKey)
        : "PREVENTIVE_CALENDAR";

    const autoRule =
        pm.autoAssignRule &&
        ["PRIMARY_TECHNICIAN", "ROUND_ROBIN", "SKILL_BASED"].includes(String(pm.autoAssignRule))
            ? String(pm.autoAssignRule)
            : "";

    return {
        assetId: String(pm.assetId ?? (pm.asset as { id?: string } | undefined)?.id ?? ""),
        name: String(pm.name ?? ""),
        strategyKey,
        frequency: String(pm.frequency ?? "MONTHLY"),
        customIntervalDays: pm.customIntervalDays != null ? String(pm.customIntervalDays) : "30",
        scheduleType: String(pm.scheduleType ?? "FLOATING"),
        meterType: String(pm.meterType ?? "RUNTIME_HOURS"),
        meterInterval: pm.meterInterval != null ? String(pm.meterInterval) : "",
        seasonStartMonth: Number(pm.seasonStartMonth) || 1,
        seasonEndMonth: Number(pm.seasonEndMonth) || 3,
        statutoryDueDate: toDateInputValue(pm.statutoryDueDate as string | Date | null | undefined),
        leadDays: pm.leadDays != null ? String(pm.leadDays) : "7",
        gracePeriodDays: pm.gracePeriodDays != null ? String(pm.gracePeriodDays) : "0",
        jobPlanId: String(pm.jobPlanId ?? (pm.jobPlan as { id?: string } | undefined)?.id ?? ""),
        nextDueDate: toDateInputValue(pm.nextDueDate as string | Date | null | undefined),
        autoAssignRule: autoRule,
        autoAssignTo: String(pm.autoAssignTo ?? ""),
    };
}

export function buildCreatePMSchedulePayload(form: PMScheduleFormState): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        assetId: form.assetId,
        name: form.name.trim(),
        strategyType: form.strategyKey,
        leadDays: Number(form.leadDays) || 7,
        gracePeriodDays: Number(form.gracePeriodDays) || 0,
    };

    if (form.jobPlanId) payload.jobPlanId = form.jobPlanId;
    if (form.nextDueDate) payload.nextDueDate = form.nextDueDate;

    if (form.strategyKey === "PREVENTIVE_CALENDAR") {
        payload.frequency = form.frequency;
        payload.scheduleType = form.scheduleType;
        if (form.frequency === "CUSTOM_DAYS") {
            payload.customIntervalDays = Number(form.customIntervalDays);
        }
    }

    if (form.strategyKey === "PREVENTIVE_METER") {
        payload.meterType = form.meterType;
        payload.meterInterval = Number(form.meterInterval);
    }

    if (form.strategyKey === "SEASONAL") {
        payload.seasonStartMonth = form.seasonStartMonth;
        payload.seasonEndMonth = form.seasonEndMonth;
    }

    if (form.strategyKey === "STATUTORY" && form.statutoryDueDate) {
        payload.statutoryDueDate = form.statutoryDueDate;
    }

    if (form.autoAssignRule) {
        payload.autoAssignRule = form.autoAssignRule;
        if (form.autoAssignTo.trim()) payload.autoAssignTo = form.autoAssignTo.trim();
    }

    return payload;
}

export function buildUpdatePMSchedulePayload(form: PMScheduleFormState): Record<string, unknown> {
    const payload = buildCreatePMSchedulePayload(form);
    delete payload.assetId;
    return payload;
}

/** Format frequency for list/detail (backend uses `frequency` enum + `customIntervalDays`, not frequencyValue). */
export function formatPMFrequencyDisplay(pm: {
    strategyType?: string;
    frequency?: string | null;
    customIntervalDays?: number | null;
    meterInterval?: number | string | null;
    meterType?: string | null;
}): string {
    if (pm.strategyType === 'PREVENTIVE_METER' && pm.meterInterval != null) {
        const unit = pm.meterType ? pm.meterType.replace(/_/g, ' ').toLowerCase() : 'units';
        return `${pm.meterInterval} ${unit}`;
    }
    if (!pm.frequency) return '—';
    if (pm.frequency === 'CUSTOM_DAYS' && pm.customIntervalDays) {
        return `Every ${pm.customIntervalDays} days`;
    }
    const label = PM_FREQUENCY_OPTIONS.find((o) => o.value === pm.frequency)?.label;
    return label ?? pm.frequency;
}

export function validatePMScheduleForm(form: PMScheduleFormState): string | null {
    if (!form.assetId) return 'Asset is required';
    if (!form.name.trim()) return 'Schedule name is required';
    if (form.strategyKey === 'PREVENTIVE_CALENDAR') {
        if (!form.frequency) return 'Frequency is required';
        if (form.frequency === 'CUSTOM_DAYS' && !(Number(form.customIntervalDays) > 0)) {
            return 'Custom interval days is required';
        }
    }
    if (form.strategyKey === "PREVENTIVE_METER" && !(Number(form.meterInterval) > 0)) {
        return "Meter interval is required";
    }
    if (form.strategyKey === "STATUTORY" && !form.statutoryDueDate) {
        return "Statutory due date is required";
    }
    return null;
}

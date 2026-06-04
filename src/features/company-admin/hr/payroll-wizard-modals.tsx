/* eslint-disable better-tailwindcss/no-unknown-classes */
/**
 * Payroll Wizard Modals — mobile bottom-sheet equivalents of web wizard modals.
 *
 * Components:
 *  - EditPeriodSheet      : pick a payroll period to switch the wizard view
 *  - PendingItemsSheet    : full list of pending items requiring attention (Phase B)
 *  - RowIssueSheet        : per-row issue detail (Step 3 eye icon)
 *  - BulkActionsSheet     : Step 1 bulk action menu (Lock / Unlock / Export selected)
 *  - LopExplainerSheet    : Step 1 LOP method explainer
 *  - LockDisclosureSheet  : Step 1 "what gets locked" disclosure
 *  - ExceptionCatalogue   : Step 2 catalogue empty state (inline, not a sheet)
 *  - KpiExpandSheet       : Step 1 KPI value tap-to-expand
 *
 * All sheets use @gorhom/bottom-sheet via the standard ref/present/dismiss pattern.
 */
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetScrollView,
    type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatINR = (v: unknown): string => `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function renderBackdrop(props: BottomSheetBackdropProps) {
    return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />;
}

const HANDLE_STYLE = { backgroundColor: 'transparent' } as const;
const HANDLE_INDICATOR = { backgroundColor: colors.neutral[300], width: 40, height: 4 } as const;

/* ──────────────────────────────────────────────────────────────────────── */
/* Edit Period Sheet                                                        */
/* ──────────────────────────────────────────────────────────────────────── */

export interface PayrollRunOption {
    id: string;
    month: number;
    year: number;
    status: string;
    employeeCount?: number;
}

export interface EditPeriodSheetHandle {
    present: () => void;
    dismiss: () => void;
}

interface EditPeriodSheetProps {
    runs: PayrollRunOption[];
    currentRunId: string;
    onSelect: (runId: string) => void;
}

export const EditPeriodSheet = React.forwardRef<EditPeriodSheetHandle, EditPeriodSheetProps>(
    function EditPeriodSheet({ runs, currentRunId, onSelect }, ref) {
        const sheetRef = React.useRef<BottomSheetModal>(null);
        React.useImperativeHandle(ref, () => ({
            present: () => sheetRef.current?.present(),
            dismiss: () => sheetRef.current?.dismiss(),
        }), []);

        const snapPoints = React.useMemo(() => ['70%', '90%'], []);

        return (
            <BottomSheetModal
                ref={sheetRef}
                snapPoints={snapPoints}
                index={0}
                backdropComponent={renderBackdrop}
                handleStyle={HANDLE_STYLE}
                handleIndicatorStyle={HANDLE_INDICATOR}
                backgroundStyle={{ backgroundColor: colors.white }}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
                    <Text className="font-inter text-[16px] font-bold text-neutral-900">Switch Payroll Period</Text>
                    <Text className="mt-1 mb-4 font-inter text-[12.5px] text-neutral-500">
                        Select a payroll period to load its pre-run activities.
                    </Text>

                    {runs.length === 0 ? (
                        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                            <Text className="font-inter text-[13px] text-neutral-500">No payroll runs available.</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {runs.map(r => {
                                const isActive = r.id === currentRunId;
                                const label = `${MONTHS[r.month] ?? '—'} ${r.year}`;
                                return (
                                    <Pressable
                                        key={r.id}
                                        onPress={() => {
                                            if (!isActive) {
                                                onSelect(r.id);
                                                sheetRef.current?.dismiss();
                                            }
                                        }}
                                        style={[styles.runRow, isActive && styles.runRowActive]}
                                    >
                                        <View style={[styles.runBadge, { backgroundColor: isActive ? colors.primary[100] : colors.neutral[100] }]}>
                                            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '800', color: isActive ? colors.primary[700] : colors.neutral[600] }}>
                                                {MONTHS[r.month]?.slice(0, 3) ?? '—'}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text className="font-inter text-[13px] font-bold text-neutral-900" numberOfLines={1}>{label}</Text>
                                            <Text className="font-inter text-[11px] text-neutral-500" numberOfLines={1}>
                                                {(r.status ?? '').toLowerCase().replace(/_/g, ' ')}
                                                {r.employeeCount != null ? ` · ${r.employeeCount} employees` : ''}
                                            </Text>
                                        </View>
                                        {isActive ? (
                                            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '800', color: colors.primary[600], letterSpacing: 0.8 }}>
                                                ACTIVE
                                            </Text>
                                        ) : (
                                            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.primary[700] }}>
                                                Select ›
                                            </Text>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </BottomSheetScrollView>
            </BottomSheetModal>
        );
    },
);

/* ──────────────────────────────────────────────────────────────────────── */
/* Pending Items Sheet                                                      */
/* ──────────────────────────────────────────────────────────────────────── */

export interface PendingItem {
    id: string;
    title: string;
    description?: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    status: string;
    owner?: string;
    eta?: string;
    actionUrl?: string;
}

export interface PendingItemsSheetHandle {
    present: () => void;
    dismiss: () => void;
}

interface PendingItemsSheetProps {
    items: PendingItem[];
    onItemAction: (item: PendingItem) => void;
}

export const PendingItemsSheet = React.forwardRef<PendingItemsSheetHandle, PendingItemsSheetProps>(
    function PendingItemsSheet({ items, onItemAction }, ref) {
        const sheetRef = React.useRef<BottomSheetModal>(null);
        React.useImperativeHandle(ref, () => ({
            present: () => sheetRef.current?.present(),
            dismiss: () => sheetRef.current?.dismiss(),
        }), []);

        const snapPoints = React.useMemo(() => ['80%', '95%'], []);

        return (
            <BottomSheetModal
                ref={sheetRef}
                snapPoints={snapPoints}
                index={0}
                backdropComponent={renderBackdrop}
                handleStyle={HANDLE_STYLE}
                handleIndicatorStyle={HANDLE_INDICATOR}
                backgroundStyle={{ backgroundColor: colors.white }}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
                    <Text className="font-inter text-[16px] font-bold text-neutral-900">All Pending Items</Text>
                    <Text className="mt-1 mb-4 font-inter text-[12.5px] text-neutral-500">
                        {items.length} item{items.length === 1 ? '' : 's'} require attention.
                    </Text>

                    {items.length === 0 ? (
                        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                            <Text style={{ fontSize: 28, marginBottom: 4 }}>🎉</Text>
                            <Text className="font-inter text-[13px] text-neutral-500">No pending items.</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {items.map(item => {
                                const tint = item.severity === 'HIGH'
                                    ? { bg: colors.danger[50], fg: colors.danger[700] }
                                    : item.severity === 'MEDIUM'
                                        ? { bg: colors.warning[50], fg: colors.warning[700] }
                                        : { bg: colors.neutral[100], fg: colors.neutral[700] };
                                return (
                                    <View key={item.id} style={styles.pendingCard}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={[styles.sevPill, { backgroundColor: tint.bg }]}>
                                                <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '800', color: tint.fg }}>
                                                    {item.severity}
                                                </Text>
                                            </View>
                                            <Text className="font-inter text-[12.5px] font-bold text-neutral-900" style={{ flex: 1 }} numberOfLines={1}>
                                                {item.title}
                                            </Text>
                                        </View>
                                        {item.description ? (
                                            <Text className="mt-1.5 font-inter text-[11.5px] leading-[15px] text-neutral-600">{item.description}</Text>
                                        ) : null}
                                        <View style={styles.pendingMetaRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Status</Text>
                                                <Text className="font-inter text-[11.5px] text-neutral-700" numberOfLines={1}>
                                                    {item.status.toLowerCase().replace(/_/g, ' ')}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Owner</Text>
                                                <Text className="font-inter text-[11.5px] text-neutral-700" numberOfLines={1}>{item.owner ?? '—'}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">ETA</Text>
                                                <Text className="font-inter text-[11.5px] text-neutral-700" numberOfLines={1}>{item.eta ?? '—'}</Text>
                                            </View>
                                        </View>
                                        <Pressable
                                            onPress={() => onItemAction(item)}
                                            style={styles.pendingActionBtn}
                                        >
                                            <Text style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: '700', color: colors.primary[700] }}>
                                                View Details ›
                                            </Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </BottomSheetScrollView>
            </BottomSheetModal>
        );
    },
);

/* ──────────────────────────────────────────────────────────────────────── */
/* Row Issue Sheet (Step 3)                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

export interface RowIssueDetail {
    employeeName: string;
    employeeCode?: string;
    department?: string | null;
    exceptionType?: string;
    severity?: 'HIGH' | 'MEDIUM' | 'LOW';
    note?: string | null;
    suggestedResolution?: string;
    grossEarnings?: number;
    totalDeductions?: number;
    netPay?: number;
}

export interface RowIssueSheetHandle {
    present: (detail: RowIssueDetail) => void;
    dismiss: () => void;
}

export const RowIssueSheet = React.forwardRef<RowIssueSheetHandle>(
    function RowIssueSheet(_props, ref) {
        const sheetRef = React.useRef<BottomSheetModal>(null);
        const [detail, setDetail] = React.useState<RowIssueDetail | null>(null);

        React.useImperativeHandle(ref, () => ({
            present: (d: RowIssueDetail) => { setDetail(d); sheetRef.current?.present(); },
            dismiss: () => sheetRef.current?.dismiss(),
        }), []);

        const snapPoints = React.useMemo(() => ['65%', '90%'], []);
        const sevTint = detail?.severity === 'HIGH'
            ? { bg: colors.danger[50], fg: colors.danger[700] }
            : detail?.severity === 'MEDIUM'
                ? { bg: colors.warning[50], fg: colors.warning[700] }
                : { bg: colors.neutral[100], fg: colors.neutral[700] };

        return (
            <BottomSheetModal
                ref={sheetRef}
                snapPoints={snapPoints}
                index={0}
                backdropComponent={renderBackdrop}
                handleStyle={HANDLE_STYLE}
                handleIndicatorStyle={HANDLE_INDICATOR}
                backgroundStyle={{ backgroundColor: colors.white }}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
                    <Text className="font-inter text-[16px] font-bold text-neutral-900" numberOfLines={1}>
                        Issue Details {detail?.employeeName ? `— ${detail.employeeName}` : ''}
                    </Text>
                    {detail?.employeeCode || detail?.department ? (
                        <Text className="mt-1 mb-4 font-inter text-[12px] text-neutral-500" numberOfLines={1}>
                            {detail?.employeeCode ?? ''}{detail?.employeeCode && detail?.department ? ' · ' : ''}{detail?.department ?? ''}
                        </Text>
                    ) : (
                        <View style={{ height: 12 }} />
                    )}

                    {!detail ? (
                        <Text className="font-inter text-[13px] text-neutral-500">No issue details available.</Text>
                    ) : (
                        <View style={{ gap: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[styles.sevPill, { backgroundColor: sevTint.bg }]}>
                                    <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '800', color: sevTint.fg }}>
                                        {detail.severity ?? 'ISSUE'}
                                    </Text>
                                </View>
                                {detail.exceptionType ? (
                                    <Text className="font-inter text-[12.5px] font-bold text-neutral-800" numberOfLines={1}>
                                        {detail.exceptionType}
                                    </Text>
                                ) : null}
                            </View>

                            {detail.note ? (
                                <View style={styles.noteBlock}>
                                    <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Note</Text>
                                    <Text className="font-inter text-[12.5px] leading-[18px] text-neutral-700">{detail.note}</Text>
                                </View>
                            ) : null}

                            {detail.suggestedResolution ? (
                                <View style={styles.resolutionBlock}>
                                    <Text className="font-inter text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: colors.info[700] }}>
                                        Suggested Resolution
                                    </Text>
                                    <Text className="font-inter text-[12.5px] leading-[18px]" style={{ color: colors.info[900] }}>
                                        {detail.suggestedResolution}
                                    </Text>
                                </View>
                            ) : null}

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <FieldTile label="Gross"      value={detail.grossEarnings} />
                                <FieldTile label="Deductions" value={detail.totalDeductions} negative />
                                <FieldTile label="Net Pay"    value={detail.netPay} highlight />
                            </View>
                        </View>
                    )}
                </BottomSheetScrollView>
            </BottomSheetModal>
        );
    },
);

function FieldTile({ label, value, negative, highlight }: { label: string; value: number | undefined; negative?: boolean; highlight?: boolean }) {
    const n = Number(value ?? 0);
    const tint = highlight ? colors.success[700] : negative ? colors.danger[700] : colors.neutral[900];
    return (
        <View style={styles.fieldTile}>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: tint, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
                {negative ? '-' : ''}{formatINR(n)}
            </Text>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Attendance Row Detail Sheet (Step 1 Eye icon)                            */
/* ──────────────────────────────────────────────────────────────────────── */

export interface AttendanceRowDetail {
    employeeCode?: string;
    firstName?: string;
    lastName?: string;
    department?: string | null;
    status?: 'OK' | 'HAS_ISSUES' | 'NO_DATA';
    workingDays?: number;
    present?: number;
    absent?: number;
    lop?: number;
    otHours?: number;
    /* Backend now returns explanatory bullets for readiness state */
    reasons?: string[];
    suggestions?: Array<string | { text?: string; label?: string; screen?: string }>;
}

export interface AttendanceRowDetailSheetHandle {
    present: (row: AttendanceRowDetail) => void;
    dismiss: () => void;
}

interface AttendanceRowDetailSheetProps {
    onNavigate?: (screen: string) => void;
}

export const AttendanceRowDetailSheet = React.forwardRef<AttendanceRowDetailSheetHandle, AttendanceRowDetailSheetProps>(
    function AttendanceRowDetailSheet({ onNavigate }, ref) {
        const sheetRef = React.useRef<BottomSheetModal>(null);
        const [row, setRow] = React.useState<AttendanceRowDetail | null>(null);

        React.useImperativeHandle(ref, () => ({
            present: (r: AttendanceRowDetail) => { setRow(r); sheetRef.current?.present(); },
            dismiss: () => sheetRef.current?.dismiss(),
        }), []);

        const snapPoints = React.useMemo(() => ['75%', '95%'], []);

        const status: 'OK' | 'HAS_ISSUES' | 'NO_DATA' = row?.status ?? 'OK';
        const statusTint =
            status === 'OK'
                ? { bg: colors.success[50], fg: colors.success[700], label: 'Ready' }
                : status === 'NO_DATA'
                    ? { bg: colors.neutral[100], fg: colors.neutral[700], label: 'No Data' }
                    : { bg: colors.danger[50], fg: colors.danger[700], label: 'Has Issues' };

        const reasons: string[] = Array.isArray(row?.reasons) ? row!.reasons! : [];
        const suggestionsRaw = Array.isArray(row?.suggestions) ? row!.suggestions! : [];

        return (
            <BottomSheetModal
                ref={sheetRef}
                snapPoints={snapPoints}
                index={0}
                backdropComponent={renderBackdrop}
                handleStyle={HANDLE_STYLE}
                handleIndicatorStyle={HANDLE_INDICATOR}
                backgroundStyle={{ backgroundColor: colors.white }}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-neutral-500">Attendance Detail</Text>
                            <Text className="mt-0.5 font-inter text-[16px] font-bold text-neutral-900" numberOfLines={1}>
                                {row?.firstName ?? ''} {row?.lastName ?? ''}
                            </Text>
                            <Text className="mt-0.5 font-inter text-[11.5px] text-neutral-500" numberOfLines={1}>
                                {row?.employeeCode ?? '—'}{row?.department ? ` · ${row.department}` : ''}
                            </Text>
                        </View>
                        <View style={[styles.sevPill, { backgroundColor: statusTint.bg }]}>
                            <Text style={{ fontFamily: 'Inter', fontSize: 10.5, fontWeight: '800', color: statusTint.fg }}>
                                {statusTint.label}
                            </Text>
                        </View>
                    </View>

                    <View style={{ height: 14 }} />

                    {/* Attendance counts */}
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        <SummaryStatTile label="Working" value={Number(row?.workingDays ?? 0)} />
                        <SummaryStatTile label="Present" value={Number(row?.present ?? 0)} tint="success" />
                        <SummaryStatTile label="Absent"  value={Number(row?.absent ?? 0)}  tint={Number(row?.absent ?? 0) > 0 ? 'danger' : 'neutral'} />
                        <SummaryStatTile label="LOP"     value={Number(row?.lop ?? 0)}     tint={Number(row?.lop ?? 0) > 0 ? 'warning' : 'neutral'} />
                    </View>

                    {/* Reasons */}
                    <View style={{ height: 12 }} />
                    {reasons.length > 0 ? (
                        <View style={styles.reasonsBlock}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <Text style={{ color: colors.danger[600], fontSize: 14 }}>⚠</Text>
                                <Text className="font-inter text-[12.5px] font-bold" style={{ color: colors.danger[800] }}>Issue Reason</Text>
                            </View>
                            {reasons.map((r, i) => (
                                <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                                    <Text style={{ fontFamily: 'Inter', color: colors.danger[700], fontSize: 14, lineHeight: 18 }}>•</Text>
                                    <Text className="font-inter text-[12.5px] leading-[18px]" style={{ flex: 1, color: colors.danger[900] }}>{r}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.passBlock}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ color: colors.success[600], fontSize: 14 }}>✓</Text>
                                <Text className="font-inter text-[12.5px] font-bold" style={{ color: colors.success[800] }}>All attendance checks passed</Text>
                            </View>
                        </View>
                    )}

                    {/* Suggestions */}
                    {suggestionsRaw.length > 0 && (
                        <>
                            <View style={{ height: 10 }} />
                            <View style={styles.suggestionsBlock}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <Text style={{ color: colors.info[600], fontSize: 14 }}>ⓘ</Text>
                                    <Text className="font-inter text-[12.5px] font-bold" style={{ color: colors.info[800] }}>Suggested Action</Text>
                                </View>
                                {suggestionsRaw.map((s, i) => {
                                    const text = typeof s === 'string' ? s : (s?.text ?? s?.label ?? '');
                                    const screen = typeof s === 'string' ? undefined : s?.screen;
                                    return (
                                        <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 2, alignItems: 'flex-start' }}>
                                            <Text style={{ fontFamily: 'Inter', color: colors.info[700], fontSize: 14, lineHeight: 18 }}>•</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text className="font-inter text-[12.5px] leading-[18px]" style={{ color: colors.info[900] }}>{text}</Text>
                                                {screen && onNavigate ? (
                                                    <Pressable
                                                        onPress={() => { sheetRef.current?.dismiss(); setTimeout(() => onNavigate(screen!), 220); }}
                                                        style={{ marginTop: 4, alignSelf: 'flex-start' }}
                                                    >
                                                        <Text className="font-inter text-[11.5px] font-bold" style={{ color: colors.primary[600] }}>Open ›</Text>
                                                    </Pressable>
                                                ) : null}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </BottomSheetScrollView>
            </BottomSheetModal>
        );
    },
);

function SummaryStatTile({ label, value, tint = 'neutral' }: { label: string; value: number; tint?: 'neutral' | 'success' | 'warning' | 'danger' }) {
    const tintColor = {
        neutral: colors.neutral[900],
        success: colors.success[700],
        warning: colors.warning[700],
        danger:  colors.danger[700],
    }[tint];
    return (
        <View style={styles.summaryStatTile}>
            <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '800', color: tintColor, textAlign: 'center' }}>{value}</Text>
            <Text className="mt-0.5 font-inter text-[9.5px] font-bold uppercase tracking-wider text-neutral-500" style={{ textAlign: 'center' }}>{label}</Text>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Bulk Actions Sheet (Step 1)                                              */
/* ──────────────────────────────────────────────────────────────────────── */

export interface BulkActionsSheetHandle {
    present: () => void;
    dismiss: () => void;
}

interface BulkActionsSheetProps {
    selectedCount: number;
    onLock: () => void;
    onUnlock: () => void;
    onExport: () => void;
}

export const BulkActionsSheet = React.forwardRef<BulkActionsSheetHandle, BulkActionsSheetProps>(
    function BulkActionsSheet({ selectedCount, onLock, onUnlock, onExport }, ref) {
        const sheetRef = React.useRef<BottomSheetModal>(null);
        React.useImperativeHandle(ref, () => ({
            present: () => sheetRef.current?.present(),
            dismiss: () => sheetRef.current?.dismiss(),
        }), []);

        const snapPoints = React.useMemo(() => ['38%'], []);

        const run = (fn: () => void) => {
            sheetRef.current?.dismiss();
            setTimeout(fn, 220);
        };

        return (
            <BottomSheetModal
                ref={sheetRef}
                snapPoints={snapPoints}
                index={0}
                backdropComponent={renderBackdrop}
                handleStyle={HANDLE_STYLE}
                handleIndicatorStyle={HANDLE_INDICATOR}
                backgroundStyle={{ backgroundColor: colors.white }}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
                    <Text className="font-inter text-[16px] font-bold text-neutral-900">Bulk Actions</Text>
                    <Text className="mt-1 mb-4 font-inter text-[12.5px] text-neutral-500">
                        {selectedCount} employee{selectedCount === 1 ? '' : 's'} selected.
                    </Text>

                    <View style={{ gap: 8 }}>
                        <Pressable onPress={() => run(onLock)} style={styles.bulkBtn}>
                            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.neutral[800] }}>
                                🔒  Lock Selected
                            </Text>
                        </Pressable>
                        <Pressable onPress={() => run(onUnlock)} style={styles.bulkBtn}>
                            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.neutral[800] }}>
                                🔓  Unlock Selected
                            </Text>
                        </Pressable>
                        <Pressable onPress={() => run(onExport)} style={styles.bulkBtn}>
                            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.neutral[800] }}>
                                ⬇  Export Selected
                            </Text>
                        </Pressable>
                    </View>
                </BottomSheetScrollView>
            </BottomSheetModal>
        );
    },
);

/* ──────────────────────────────────────────────────────────────────────── */
/* Simple info sheet (LOP explainer, Lock disclosure, KPI expand)           */
/* ──────────────────────────────────────────────────────────────────────── */

export interface InfoSheetHandle {
    present: (config: { title: string; body: React.ReactNode; bullets?: string[] }) => void;
    dismiss: () => void;
}

export const InfoSheet = React.forwardRef<InfoSheetHandle>(function InfoSheet(_props, ref) {
    const sheetRef = React.useRef<BottomSheetModal>(null);
    const [config, setConfig] = React.useState<{ title: string; body: React.ReactNode; bullets?: string[] } | null>(null);

    React.useImperativeHandle(ref, () => ({
        present: (c) => { setConfig(c); sheetRef.current?.present(); },
        dismiss: () => sheetRef.current?.dismiss(),
    }), []);

    const snapPoints = React.useMemo(() => ['45%', '85%'], []);

    return (
        <BottomSheetModal
            ref={sheetRef}
            snapPoints={snapPoints}
            index={0}
            backdropComponent={renderBackdrop}
            handleStyle={HANDLE_STYLE}
            handleIndicatorStyle={HANDLE_INDICATOR}
            backgroundStyle={{ backgroundColor: colors.white }}
        >
            <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
                <Text className="font-inter text-[16px] font-bold text-neutral-900">{config?.title}</Text>
                <View style={{ height: 12 }} />
                {typeof config?.body === 'string' ? (
                    <Text className="font-inter text-[13px] leading-[19px] text-neutral-700">{config.body}</Text>
                ) : config?.body}
                {config?.bullets && config.bullets.length > 0 ? (
                    <View style={{ marginTop: 10, gap: 6 }}>
                        {config.bullets.map((b, i) => (
                            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                                <Text style={{ fontFamily: 'Inter', color: colors.primary[500], fontSize: 14, lineHeight: 19 }}>•</Text>
                                <Text className="font-inter text-[12.5px] leading-[19px] text-neutral-700" style={{ flex: 1 }}>{b}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Exception Catalogue (Step 2 empty state)                                 */
/* ──────────────────────────────────────────────────────────────────────── */

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export const EXCEPTION_CATALOGUE: Array<{ type: string; label: string; priority: Priority; trigger: string; impact: string }> = [
    { type: 'NEW_HIRE',         label: 'New hire pro-ration',   priority: 'LOW',    trigger: 'Employee joined in this payroll month',                       impact: 'Pro-rated salary may apply' },
    { type: 'EXIT_IN_MONTH',    label: 'Exit pro-ration / F&F', priority: 'LOW',    trigger: 'Last working date falls in this month',                       impact: 'Full & final may apply' },
    { type: 'SALARY_HOLD',      label: 'Salary on hold',        priority: 'MEDIUM', trigger: 'Unreleased SalaryHold record for this run',                   impact: 'Full salary may be withheld' },
    { type: 'NO_PAN',           label: 'Missing PAN',           priority: 'MEDIUM', trigger: 'Active employee has no PAN on file',                          impact: 'TDS deducted at maximum slab' },
    { type: 'NO_DEPARTMENT',    label: 'Missing department',    priority: 'MEDIUM', trigger: 'Employee has no department mapping',                          impact: 'Cost-centre reporting affected' },
    { type: 'NO_SALARY_RECORD', label: 'No current salary',     priority: 'HIGH',   trigger: 'Active employee has no EmployeeSalary with isCurrent=true',   impact: 'Cannot be computed — must resolve' },
    { type: 'NO_BANK_ACCOUNT',  label: 'Missing bank account',  priority: 'HIGH',   trigger: 'Employee has current salary but no bank account number',      impact: 'Disbursement will fail for this employee' },
];

export function ExceptionCatalogueInline() {
    const priorityTint: Record<Priority, { bg: string; fg: string }> = {
        HIGH:   { bg: colors.danger[50],  fg: colors.danger[700] },
        MEDIUM: { bg: colors.warning[50], fg: colors.warning[700] },
        LOW:    { bg: colors.info[50],    fg: colors.info[700] },
    };
    return (
        <View>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: colors.success[50], alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 26 }}>✅</Text>
                </View>
                <Text className="font-inter text-[15px] font-bold text-neutral-900">No exceptions detected</Text>
                <Text className="mt-1 px-4 font-inter text-[12px] text-neutral-500 text-center">
                    All employees passed validation for this payroll period. You can proceed to Step 3 — Compute Salaries.
                </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Text style={{ fontSize: 14, color: colors.info[500] }}>ⓘ</Text>
                <Text className="font-inter text-[13px] font-bold text-neutral-900">What we checked</Text>
            </View>
            <Text className="mb-3 font-inter text-[11.5px] text-neutral-500">
                The system would have raised an exception if any of these conditions were met for any active employee.
            </Text>

            <View style={{ gap: 8 }}>
                {EXCEPTION_CATALOGUE.map(e => {
                    const t = priorityTint[e.priority];
                    return (
                        <View key={e.type} style={styles.catalogueCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text className="font-inter text-[12.5px] font-bold text-neutral-900" numberOfLines={1}>{e.label}</Text>
                                    <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.neutral[500] }}>{e.type}</Text>
                                </View>
                                <View style={[styles.sevPill, { backgroundColor: t.bg }]}>
                                    <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '800', color: t.fg }}>{e.priority}</Text>
                                </View>
                            </View>
                            <View style={{ marginTop: 6 }}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Trigger</Text>
                                <Text className="font-inter text-[11.5px] text-neutral-700">{e.trigger}</Text>
                            </View>
                            <View style={{ marginTop: 4 }}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">Impact</Text>
                                <Text className="font-inter text-[11.5px] text-neutral-700">{e.impact}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Helper: defensive CUID check (display fallback for locked-by)            */
/* ──────────────────────────────────────────────────────────────────────── */

const CUID_RE = /^c[a-z0-9]{20,}$/i;
export function looksLikeCuid(v: unknown): boolean {
    return typeof v === 'string' && CUID_RE.test(v);
}
export function displayLockedBy(rawName: unknown, rawId: unknown): string {
    const candidate = (rawName as any) ?? (rawId as any);
    if (candidate == null) return '—';
    if (typeof candidate !== 'string') return String(candidate);
    if (looksLikeCuid(candidate)) return 'Unknown User';
    return candidate;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Styles                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    sheetContent: { padding: 18, paddingBottom: 40 },
    runRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    runRowActive: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[200],
    },
    runBadge: {
        width: 38, height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingCard: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    pendingMetaRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    pendingActionBtn: {
        marginTop: 10,
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary[200],
        backgroundColor: colors.white,
    },
    sevPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    noteBlock: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    resolutionBlock: {
        backgroundColor: colors.info[50],
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.info[200],
    },
    fieldTile: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    bulkBtn: {
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    catalogueCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    summaryStatTile: {
        flex: 1,
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reasonsBlock: {
        backgroundColor: colors.danger[50] + '99',
        borderWidth: 1,
        borderColor: colors.danger[200],
        borderRadius: 12,
        padding: 12,
    },
    suggestionsBlock: {
        backgroundColor: colors.info[50] + '99',
        borderWidth: 1,
        borderColor: colors.info[200],
        borderRadius: 12,
        padding: 12,
    },
    passBlock: {
        backgroundColor: colors.success[50] + '99',
        borderWidth: 1,
        borderColor: colors.success[200],
        borderRadius: 12,
        padding: 12,
    },
});

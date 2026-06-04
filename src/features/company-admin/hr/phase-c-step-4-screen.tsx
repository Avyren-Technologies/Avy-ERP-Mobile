/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    Linking,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
    useStatutorySummary,
    useStatutoryFiles,
    useStatutoryDetails,
    useComputationLog,
    usePayrollRun,
    usePayrollRuns,
} from '@/features/company-admin/api/use-payroll-run-queries';
import {
    useComputeStatutory,
    useResetToCompute,
} from '@/features/company-admin/api/use-payroll-run-mutations';
import { payrollRunApi } from '@/lib/api/payroll-run';
import { useFileDownload } from '@/hooks/use-file-download';
import { showErrorMessage } from '@/components/ui/utils';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

const formatINR = (v: unknown): string => `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

type StatutoryCategory = 'PF' | 'ESI' | 'PT' | 'TDS';

/* ──────────────────────────────────────────────────────────────────────── */
/* Atoms                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function StatTile({
    label, value, sub, tint, onPress,
}: {
    label: string;
    value: React.ReactNode;
    sub?: string;
    tint: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'emerald';
    onPress?: () => void;
}) {
    const tintMap = {
        primary: { bg: colors.primary[50], fg: colors.primary[600] },
        success: { bg: colors.success[50], fg: colors.success[600] },
        danger:  { bg: colors.danger[50],  fg: colors.danger[600] },
        warning: { bg: colors.warning[50], fg: colors.warning[600] },
        info:    { bg: colors.info[50],    fg: colors.info[600] },
        accent:  { bg: colors.accent[50],  fg: colors.accent[600] },
        emerald: { bg: '#ECFDF5',          fg: '#059669' },
    } as const;
    const t = tintMap[tint];
    const Wrap: any = onPress ? Pressable : View;
    return (
        <Wrap onPress={onPress} style={styles.statTile}>
            <View style={[styles.statBadge, { backgroundColor: t.bg }]}>
                <View style={[styles.statDot, { backgroundColor: t.fg }]} />
            </View>
            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text className="mt-1 font-inter text-[15px] font-extrabold text-neutral-900" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {sub ? <Text className="mt-0.5 font-inter text-[10px] text-neutral-500" numberOfLines={1}>{sub}</Text> : null}
        </Wrap>
    );
}

function ComplianceRow({ label, ready, text }: { label: string; ready: boolean; text: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, color: ready ? colors.success[600] : colors.neutral[400] }}>{ready ? '✓' : '○'}</Text>
                <Text className="font-inter text-[12.5px] text-neutral-700">{label}</Text>
            </View>
            <Text style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: '700', color: ready ? colors.success[700] : colors.neutral[500] }}>{text}</Text>
        </View>
    );
}

function FileCard({
    type, fileName, employees, amount, dueDate, fileUrl, status, onDownload, downloading,
}: {
    type: string; fileName: string; employees?: number; amount?: number;
    dueDate?: string | null; fileUrl?: string | null; status: string;
    onDownload?: () => void; downloading?: boolean;
}) {
    const meta = {
        PF_ECR:      { label: 'PF ECR File',          color: colors.primary[600] },
        ESI_CHALLAN: { label: 'ESI Challan',          color: colors.accent[600] },
        PT_CHALLAN:  { label: 'PT Challan',           color: colors.warning[600] },
        TDS_24Q:     { label: 'TDS 24Q',              color: colors.danger[600] },
    } as const;
    const m = (meta as any)[type] ?? { label: type, color: colors.neutral[600] };
    const generated = status === 'FILED' || status === 'PENDING';
    return (
        <View style={styles.fileCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.fileBadge, { backgroundColor: m.color + '20' }]}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '800', color: m.color }}>
                        {type === 'PF_ECR' ? 'ECR' : type === 'ESI_CHALLAN' ? 'ESI' : type === 'PT_CHALLAN' ? 'PT' : type === 'TDS_24Q' ? 'TDS' : '—'}
                    </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900" numberOfLines={1}>{m.label}</Text>
                    <Text className="font-inter text-[10.5px] text-neutral-500" numberOfLines={1}>{fileName}</Text>
                </View>
            </View>
            <View style={{ marginTop: 8, gap: 4 }}>
                {employees !== undefined && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text className="font-inter text-[11px] text-neutral-500">Employees</Text>
                        <Text className="font-inter text-[11px] font-bold text-neutral-900">{employees}</Text>
                    </View>
                )}
                {amount !== undefined && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text className="font-inter text-[11px] text-neutral-500">Amount</Text>
                        <Text className="font-inter text-[11px] font-bold text-neutral-900">{formatINR(amount)}</Text>
                    </View>
                )}
                {dueDate && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text className="font-inter text-[11px] text-neutral-500">Due</Text>
                        <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: colors.warning[700] }}>
                            {new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </Text>
                    </View>
                )}
            </View>
            <Pressable
                onPress={() => {
                    if (onDownload) onDownload();
                    else if (fileUrl) Linking.openURL(fileUrl);
                }}
                disabled={(!onDownload && (!generated || !fileUrl)) || downloading}
                style={[styles.dlBtn, (((!onDownload && (!generated || !fileUrl))) || downloading) && { opacity: 0.5, backgroundColor: colors.neutral[100] }]}
            >
                <Text style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: '700', color: (onDownload || (generated && fileUrl)) ? colors.primary[700] : colors.neutral[400] }}>
                    {downloading ? '… Generating' : `⬇ ${(onDownload || generated) ? 'Download' : 'Not generated'}`}
                </Text>
            </Pressable>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Statutory Detail Sheet                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

const CATEGORY_LABEL: Record<StatutoryCategory, string> = {
    PF: 'PF (Provident Fund)',
    ESI: 'ESI (Employees\' State Insurance)',
    PT: 'PT (Professional Tax)',
    TDS: 'TDS (Tax Deducted at Source)',
};

function StatutoryDetailSheet({
    visible, onClose, runId, category,
}: {
    visible: boolean;
    onClose: () => void;
    runId: string;
    category: StatutoryCategory | null;
}) {
    const detailQuery = useStatutoryDetails(runId, (category ?? 'PF') as any, visible && !!category);
    const [search, setSearch] = React.useState('');
    React.useEffect(() => { if (!visible) setSearch(''); }, [visible]);

    const rows: any[] = React.useMemo(() => {
        const data: any = (detailQuery.data as any)?.data;
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.rows)) return data.rows;
        if (Array.isArray(data.employees)) return data.employees;
        return [];
    }, [detailQuery.data]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return rows;
        const q = search.toLowerCase();
        return rows.filter(r =>
            String(r.employeeName ?? '').toLowerCase().includes(q) ||
            String(r.employeeCode ?? '').toLowerCase().includes(q),
        );
    }, [rows, search]);

    const errorObj: any = detailQuery.error as any;
    const status = errorObj?.response?.status;
    const isUnavailable = status === 404;
    const isLoading = detailQuery.isLoading && visible;
    const hasError = !!detailQuery.error && !isUnavailable;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={sheetStyles.backdrop}>
                <View style={[sheetStyles.card, { maxHeight: '90%' }]}>
                    <View style={sheetStyles.header}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text className="font-inter text-[15px] font-bold text-neutral-900" numberOfLines={1}>
                                {category ? CATEGORY_LABEL[category] : 'Statutory'} Details
                            </Text>
                            <Text className="font-inter text-[11px] text-neutral-500">
                                Per-employee breakdown ({rows.length})
                            </Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <Text style={{ color: colors.neutral[400], fontSize: 18 }}>✕</Text>
                        </Pressable>
                    </View>

                    <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                        <View style={sheetStyles.search}>
                            <Text style={{ color: colors.neutral[400], marginRight: 6 }}>🔍</Text>
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Search by code or name…"
                                placeholderTextColor={colors.neutral[400]}
                                style={sheetStyles.searchInput}
                            />
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }} showsVerticalScrollIndicator={false}>
                        {isLoading ? (
                            <Text className="font-inter text-[12.5px] text-neutral-500" style={{ textAlign: 'center', padding: 24 }}>Loading…</Text>
                        ) : isUnavailable ? (
                            <View style={{ alignItems: 'center', padding: 24 }}>
                                <Text style={{ fontSize: 28, marginBottom: 6 }}>📄</Text>
                                <Text className="font-inter text-[12.5px] text-neutral-500" style={{ textAlign: 'center' }}>
                                    Data not yet available. The detail endpoint will be enabled after backend deployment.
                                </Text>
                            </View>
                        ) : hasError ? (
                            <View style={{ alignItems: 'center', padding: 24 }}>
                                <Text style={{ fontSize: 26, marginBottom: 6, color: colors.danger[500] }}>⚠</Text>
                                <Text className="font-inter text-[12.5px] text-danger-700" style={{ textAlign: 'center' }}>
                                    Failed to load details. Pull to retry.
                                </Text>
                            </View>
                        ) : filtered.length === 0 ? (
                            <Text className="font-inter text-[12.5px] text-neutral-500" style={{ textAlign: 'center', padding: 24 }}>
                                No employees found.
                            </Text>
                        ) : (
                            <View style={{ gap: 8 }}>
                                {filtered.map((r: any, idx: number) => (
                                    <View key={r.employeeId ?? r.id ?? idx} style={sheetStyles.empCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View style={{ flex: 1, minWidth: 0 }}>
                                                <Text className="font-inter text-[12.5px] font-bold text-neutral-900" numberOfLines={1}>
                                                    {r.employeeName ?? '—'}
                                                </Text>
                                                <Text className="font-inter text-[10.5px] text-neutral-500" numberOfLines={1}>
                                                    {r.employeeCode ?? '—'} {r.designation ? `· ${r.designation}` : ''}
                                                </Text>
                                            </View>
                                            <Text className="font-inter text-[13px] font-extrabold text-primary-700" style={{ fontFamily: 'Inter' }}>
                                                {formatINR(r.total ?? r.employeeAmount ?? 0)}
                                            </Text>
                                        </View>
                                        <View style={sheetStyles.empMeta}>
                                            {category === 'PF' && (
                                                <>
                                                    <MetaCell label="Basic" value={formatINR(r.basic ?? 0)} />
                                                    <MetaCell label="Gross" value={formatINR(r.gross ?? 0)} />
                                                    <MetaCell label="Employee" value={formatINR(r.employeeAmount ?? 0)} />
                                                    <MetaCell label="Employer" value={formatINR(r.employerAmount ?? 0)} />
                                                </>
                                            )}
                                            {category === 'ESI' && (
                                                <>
                                                    <MetaCell label="Gross" value={formatINR(r.gross ?? 0)} />
                                                    <MetaCell label="Employee" value={formatINR(r.employeeAmount ?? 0)} />
                                                    <MetaCell label="Employer" value={formatINR(r.employerAmount ?? 0)} />
                                                </>
                                            )}
                                            {category === 'PT' && (
                                                <>
                                                    <MetaCell label="State" value={r.state ?? '—'} />
                                                    <MetaCell label="Gross" value={formatINR(r.gross ?? 0)} />
                                                    <MetaCell label="PT" value={formatINR(r.employeeAmount ?? 0)} />
                                                </>
                                            )}
                                            {category === 'TDS' && (
                                                <>
                                                    <MetaCell label="Regime" value={r.regime ?? '—'} />
                                                    <MetaCell label="Taxable" value={formatINR(r.taxableIncome ?? 0)} />
                                                    <MetaCell label="TDS" value={formatINR(r.employeeAmount ?? 0)} />
                                                </>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    <View style={sheetStyles.footer}>
                        <Pressable onPress={onClose} style={[sheetStyles.btn, sheetStyles.btnSecondary]}>
                            <Text className="font-inter text-[13px] font-bold text-neutral-700">Close</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function MetaCell({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ width: '48%', paddingVertical: 3 }}>
            <Text className="font-inter text-[9.5px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
            <Text className="font-inter text-[11.5px] font-bold text-neutral-900" numberOfLines={1}>{value}</Text>
        </View>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Computation Log Sheet                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function ComputationLogSheet({
    visible, onClose, runId,
}: { visible: boolean; onClose: () => void; runId: string }) {
    const fmt = useCompanyFormatter();
    const logQuery = useComputationLog(runId, visible);
    const [expanded, setExpanded] = React.useState<Record<string | number, boolean>>({});

    const entries: any[] = React.useMemo(() => {
        const data: any = (logQuery.data as any)?.data;
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.entries)) return data.entries;
        if (Array.isArray(data.logs)) return data.logs;
        return [];
    }, [logQuery.data]);

    const errorObj: any = logQuery.error as any;
    const status = errorObj?.response?.status;
    const isUnavailable = status === 404;
    const isLoading = logQuery.isLoading && visible;
    const hasError = !!logQuery.error && !isUnavailable;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={sheetStyles.backdrop}>
                <View style={[sheetStyles.card, { maxHeight: '85%' }]}>
                    <View style={sheetStyles.header}>
                        <View>
                            <Text className="font-inter text-[15px] font-bold text-neutral-900">Computation Log</Text>
                            <Text className="font-inter text-[11px] text-neutral-500">Audit trail of computation events</Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <Text style={{ color: colors.neutral[400], fontSize: 18 }}>✕</Text>
                        </Pressable>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                        {isLoading ? (
                            <Text className="font-inter text-[12.5px] text-neutral-500" style={{ textAlign: 'center', padding: 24 }}>Loading log entries…</Text>
                        ) : isUnavailable ? (
                            <View style={{ alignItems: 'center', padding: 24 }}>
                                <Text style={{ fontSize: 28, marginBottom: 6 }}>📄</Text>
                                <Text className="font-inter text-[12.5px] text-neutral-500" style={{ textAlign: 'center' }}>
                                    Data not yet available. The computation log endpoint will be enabled after backend deployment.
                                </Text>
                            </View>
                        ) : hasError ? (
                            <View style={{ alignItems: 'center', padding: 24 }}>
                                <Text style={{ fontSize: 26, marginBottom: 6, color: colors.danger[500] }}>⚠</Text>
                                <Text className="font-inter text-[12.5px] text-danger-700" style={{ textAlign: 'center' }}>Failed to load computation log.</Text>
                            </View>
                        ) : entries.length === 0 ? (
                            <Text className="font-inter text-[12.5px] text-neutral-500" style={{ textAlign: 'center', padding: 24 }}>
                                No computation log entries recorded.
                            </Text>
                        ) : (
                            <View style={{ gap: 8 }}>
                                {entries.map((e: any, idx: number) => {
                                    const key = e.id ?? idx;
                                    const ts = e.timestamp ?? e.createdAt ?? e.at;
                                    const action = e.action ?? e.event ?? e.type ?? 'EVENT';
                                    const actor = e.actorName ?? e.userName ?? e.performedBy ?? e.user ?? '—';
                                    const details = e.details ?? e.metadata ?? e.payload ?? null;
                                    const message = e.message ?? e.description ?? null;
                                    const isExpanded = !!expanded[key];
                                    return (
                                        <View key={key} style={sheetStyles.empCard}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={sheetStyles.actionPill}>
                                                    <Text style={{ fontFamily: 'Inter', fontSize: 10.5, fontWeight: '800', color: colors.primary[700] }} numberOfLines={1}>
                                                        {String(action)}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontFamily: 'Inter', fontSize: 10.5, color: colors.neutral[500] }}>
                                                    {ts ? `${fmt.date(ts)} ${fmt.time(ts)}` : '—'}
                                                </Text>
                                            </View>
                                            <Text className="mt-1 font-inter text-[12px] text-neutral-700">
                                                <Text className="font-inter text-[12px] text-neutral-500">By: </Text>
                                                <Text className="font-inter text-[12px] font-bold text-neutral-900">{String(actor)}</Text>
                                            </Text>
                                            {message && <Text className="mt-1 font-inter text-[12px] text-neutral-600">{String(message)}</Text>}
                                            {details && (
                                                <>
                                                    <Pressable onPress={() => setExpanded(p => ({ ...p, [key]: !p[key] }))}>
                                                        <Text className="mt-1.5 font-inter text-[11.5px] font-bold text-primary-600">
                                                            {isExpanded ? '▾ Hide details' : '▸ Show details'}
                                                        </Text>
                                                    </Pressable>
                                                    {isExpanded && (
                                                        <View style={sheetStyles.detailBox}>
                                                            <Text style={{ fontFamily: 'monospace', fontSize: 10.5, color: colors.neutral[700] }}>
                                                                {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                    <View style={sheetStyles.footer}>
                        <Pressable onPress={onClose} style={[sheetStyles.btn, sheetStyles.btnSecondary]}>
                            <Text className="font-inter text-[13px] font-bold text-neutral-700">Close</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Screen                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

export function PhaseCStep4Screen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const fmt = useCompanyFormatter();
    const params = useLocalSearchParams<{ runId?: string }>();
    const explicitRunId = params.runId ?? '';

    /* Resolve runId */
    const { data: runsResp } = usePayrollRuns({ limit: 20 });
    const runsList: any[] = React.useMemo(() => {
        const env: any = runsResp;
        const arr = env?.data ?? env;
        return Array.isArray(arr) ? arr : [];
    }, [runsResp]);
    const inferredRunId = React.useMemo(() => {
        if (explicitRunId) return explicitRunId;
        const t = runsList.find(r => ['COMPUTED', 'STATUTORY_DONE', 'APPROVED'].includes(r.status));
        if (t) return t.id;
        return runsList[0]?.id ?? '';
    }, [explicitRunId, runsList]);

    const { data: runResp } = usePayrollRun(inferredRunId);
    const runDetail: any = (runResp as any)?.data ?? null;

    const { data: summaryResp, isLoading, isRefetching, refetch: refetchSummary } = useStatutorySummary(inferredRunId);
    const summary: any = (summaryResp as any)?.data ?? null;

    const { data: filesResp, refetch: refetchFiles } = useStatutoryFiles(inferredRunId);
    const filesData: any = (filesResp as any)?.data ?? null;
    const files: any[] = filesData?.files ?? [];

    const computeMutation = useComputeStatutory();
    const resetMutation = useResetToCompute();
    const fileDownload = useFileDownload();
    const [downloadingType, setDownloadingType] = React.useState<string | null>(null);
    const confirmModal = useConfirmModal();

    const FILE_TYPE_TO_BACKEND: Record<string, 'pf-ecr' | 'esi-return' | 'pt-return' | 'tds-return'> = {
        PF_ECR: 'pf-ecr',
        ESI_CHALLAN: 'esi-return',
        PT_CHALLAN: 'pt-return',
        TDS_24Q: 'tds-return',
    };

    const handleFileDownload = async (fileType: string) => {
        const backendType = FILE_TYPE_TO_BACKEND[fileType];
        if (!backendType || !inferredRunId) return;
        try {
            setDownloadingType(fileType);
            const buffer = await payrollRunApi.downloadStatutoryFile(inferredRunId, backendType);
            const m = runDetail?.month;
            const y = runDetail?.year;
            const period = m && y ? `${y}-${String(m).padStart(2, '0')}` : 'period';
            await fileDownload.download(buffer, {
                fileName: `${fileType.replace(/_/g, '-')}-${period}.xlsx`,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: `Save ${fileType.replace(/_/g, ' ')}`,
            });
        } catch (err: any) {
            if (err?.response?.status === 404) {
                showErrorMessage('Statutory file endpoint not yet available.');
            } else {
                showErrorMessage('Failed to download statutory file.');
            }
        } finally {
            setDownloadingType(null);
        }
    };

    /* Bottom sheets */
    const [detailCategory, setDetailCategory] = React.useState<StatutoryCategory | null>(null);
    const [logOpen, setLogOpen] = React.useState(false);
    const [kpiDetail, setKpiDetail] = React.useState<{ label: string; value: string; sub?: string } | null>(null);

    const isStatutoryDone = runDetail?.status && ['STATUTORY_DONE', 'APPROVED', 'DISBURSED', 'ARCHIVED'].includes(runDetail.status);
    const isPostApproval = runDetail?.status && ['APPROVED', 'DISBURSED', 'ARCHIVED'].includes(runDetail.status);

    /* Backend `getStatutorySummary` returns a structured envelope:
     *   { totals: {...}, employeeContributions: {...}, employerContributions: {...}, eligibility: {...} }
     * Read from `totals` (canonical flat shape) with fallbacks for legacy callers. */
    const totals: any      = summary?.totals ?? {};
    const empContrib: any  = summary?.employeeContributions ?? {};
    const emprContrib: any = summary?.employerContributions ?? {};
    const eligibility: any = summary?.eligibility ?? {};

    /* Defensive Number(v ?? 0) wraps for all Decimal/string statutory fields */
    const pfEmp    = Number(totals?.pfEmployee  ?? empContrib?.pfEmployee  ?? summary?.pfEmployeeTotal  ?? 0);
    const pfEmpr   = Number(totals?.pfEmployer  ?? emprContrib?.pfEmployer ?? summary?.pfEmployerTotal  ?? 0);
    const esiEmp   = Number(totals?.esiEmployee ?? empContrib?.esiEmployee ?? summary?.esiEmployeeTotal ?? 0);
    const esiEmpr  = Number(totals?.esiEmployer ?? emprContrib?.esiEmployer?? summary?.esiEmployerTotal ?? 0);
    const ptTotal  = Number(totals?.pt          ?? empContrib?.pt          ?? summary?.ptTotal          ?? 0);
    const tdsTotal = Number(totals?.tds         ?? empContrib?.tds         ?? summary?.tdsTotal         ?? 0);

    const pfEligible    = Number(eligibility?.pfEmployees  ?? eligibility?.pfEligible    ?? summary?.pfEligible    ?? 0);
    const esiEligible   = Number(eligibility?.esiEmployees ?? eligibility?.esiEligible   ?? summary?.esiEligible   ?? 0);
    const ptApplicable  = Number(eligibility?.ptEmployees  ?? eligibility?.ptApplicable  ?? summary?.ptApplicable  ?? 0);
    const tdsApplicable = Number(eligibility?.tdsEmployees ?? eligibility?.tdsApplicable ?? summary?.tdsApplicable ?? 0);

    const totalEmployees = Number(runDetail?.employeeCount ?? 0);

    const computeStatusByType = React.useMemo(() => {
        const set = new Set(files.map((f: any) => f.type));
        return { PF: set.has('PF_ECR'), ESI: set.has('ESI_CHALLAN'), PT: set.has('PT_CHALLAN'), TDS: set.has('TDS_24Q') };
    }, [files]);

    const importantDates = React.useMemo(() => {
        const m = runDetail?.month;
        const y = runDetail?.year;
        if (!m || !y) return [];
        const next = m === 12 ? { m: 1, y: y + 1 } : { m: m + 1, y };
        const pfDue = new Date(next.y, next.m - 1, 15);
        const esiDue = new Date(next.y, next.m - 1, 15);
        const ptDue = new Date(next.y, next.m - 1, 20);
        let tdsDue: Date;
        if (m >= 1 && m <= 3)      tdsDue = new Date(y, 4, 31);
        else if (m >= 4 && m <= 6) tdsDue = new Date(y, 6, 31);
        else if (m >= 7 && m <= 9) tdsDue = new Date(y, 9, 31);
        else                        tdsDue = new Date(y + 1, 0, 31);
        return [
            { label: 'PF ECR',  date: pfDue },
            { label: 'ESI',     date: esiDue },
            { label: 'PT',      date: ptDue },
            { label: 'TDS 24Q', date: tdsDue },
        ];
    }, [runDetail]);

    const handleCompute = () => {
        if (!inferredRunId) return;

        /* Defensive: skip stale "compute" actions if the run has already progressed
         * past STATUTORY_DONE. Prevents the backend 400 error when the user taps
         * a partly-disabled action button on a run that's already statutory-done,
         * approved, disbursed, or archived. */
        const currentStatus = String(runDetail?.status ?? '').toLowerCase();
        const STATUS_RANK: Record<string, number> = {
            draft: 0,
            attendance_locked: 1,
            exceptions_reviewed: 2,
            computed: 3,
            statutory_done: 4,
            approved: 5,
            disbursed: 5,
            archived: 5,
        };
        const currentRank = STATUS_RANK[currentStatus] ?? 0;
        /* Step 4 = Statutory ⇒ required rank 4 (STATUTORY_DONE) */
        if (currentRank >= 4) {
            /* Already past — skip mutation, advance wizard view locally */
            router.push({ pathname: '/company/hr/payroll-c-step-5' as any, params: { runId: inferredRunId } });
            return;
        }

        confirmModal.show({
            title: 'Compute Statutory?',
            message: 'Calculate PF, ESI, PT, TDS and LWF for all applicable employees and generate filing data.',
            confirmText: 'Compute',
            onConfirm: () => {
                computeMutation.mutate(inferredRunId, {
                    onSuccess: () => { refetchSummary(); refetchFiles(); },
                });
            },
        });
    };

    const handleReset = () => {
        if (!inferredRunId) return;
        confirmModal.show({
            title: 'Reset Statutory?',
            message: 'Reset will return the run to "Computed" so you can recompute statutory amounts.',
            confirmText: 'Reset',
            onConfirm: () => {
                resetMutation.mutate(inferredRunId, {
                    onSuccess: () => { refetchSummary(); refetchFiles(); },
                });
            },
        });
    };

    const handleNext = () => {
        if (!inferredRunId) return;
        router.push({ pathname: '/company/hr/payroll-c-step-5' as any, params: { runId: inferredRunId } });
    };

    if (!inferredRunId && runsList.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 4 — Statutory" onMenuPress={toggle} />
                <EmptyState icon="inbox" title="No payroll run found"
                    message="Create a payroll run before computing statutory."
                    action={{ label: 'Open Payroll Runs', onPress: () => router.push('/company/hr/payroll-runs' as any) }} />
            </View>
        );
    }

    if (isLoading && !summary) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
                <AppTopHeader title="Step 4 — Statutory" onMenuPress={toggle} />
                <View style={{ padding: 16, gap: 12 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    /* ── Category cards data with view-details support ── */
    const categoryCards: Array<{ key: StatutoryCategory; title: string; total: number; eligible: number; tint: 'emerald' | 'info' | 'warning' | 'danger' }> = [
        { key: 'PF',  title: 'PF (Provident Fund)',           total: pfEmp + pfEmpr,  eligible: pfEligible,    tint: 'emerald' },
        { key: 'ESI', title: 'ESI (State Insurance)',          total: esiEmp + esiEmpr, eligible: esiEligible,   tint: 'info' },
        { key: 'PT',  title: 'PT (Professional Tax)',          total: ptTotal,         eligible: ptApplicable,  tint: 'warning' },
        { key: 'TDS', title: 'TDS (Tax Deducted at Source)',   total: tdsTotal,        eligible: tdsApplicable, tint: 'danger' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            <AppTopHeader title="Step 4 — Statutory" onMenuPress={toggle} subtitle="Phase C · Core Execution" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 110 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchSummary(); refetchFiles(); }} tintColor={colors.primary[600]} />}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInDown.duration(360)} style={styles.heroCard}>
                    <Text className="font-inter text-[11px] font-bold uppercase tracking-wider text-primary-600">Step 4 of 6</Text>
                    <Text className="mt-1 font-inter text-[18px] font-bold text-neutral-900">Statutory Deductions</Text>
                    <Text className="mt-1.5 font-inter text-[13px] leading-[18px] text-neutral-600">
                        Auto-compute statutory deductions and generate statutory files and challan data.
                    </Text>
                </Animated.View>

                {/* KPI tiles (tap to expand) */}
                <View style={[styles.kpiGrid, { marginTop: 12 }]}>
                    <StatTile label="Total Employees" value={totalEmployees}     sub="Active" tint="primary"
                        onPress={() => setKpiDetail({ label: 'Total Employees', value: String(totalEmployees), sub: 'Active employees in run' })} />
                    <StatTile label="PF (Employee)"    value={formatINR(pfEmp)}   sub={`${pfEligible} emp`} tint="emerald"
                        onPress={() => setKpiDetail({ label: 'PF (Employee)', value: formatINR(pfEmp), sub: `${pfEligible} eligible employees` })} />
                    <StatTile label="PF (Employer)"    value={formatINR(pfEmpr)}  sub={`${pfEligible} emp`} tint="success"
                        onPress={() => setKpiDetail({ label: 'PF (Employer)', value: formatINR(pfEmpr), sub: `${pfEligible} eligible employees` })} />
                    <StatTile label="ESI (Employee)"   value={formatINR(esiEmp)}  sub={`${esiEligible} emp`} tint="info"
                        onPress={() => setKpiDetail({ label: 'ESI (Employee)', value: formatINR(esiEmp), sub: `${esiEligible} eligible employees` })} />
                    <StatTile label="ESI (Employer)"   value={formatINR(esiEmpr)} sub={`${esiEligible} emp`} tint="accent"
                        onPress={() => setKpiDetail({ label: 'ESI (Employer)', value: formatINR(esiEmpr), sub: `${esiEligible} eligible employees` })} />
                    <StatTile label="Professional Tax" value={formatINR(ptTotal)} sub={`${ptApplicable} emp`} tint="warning"
                        onPress={() => setKpiDetail({ label: 'Professional Tax', value: formatINR(ptTotal), sub: `${ptApplicable} applicable employees` })} />
                    <StatTile label="TDS (Income Tax)" value={formatINR(tdsTotal)} sub={`${tdsApplicable} emp`} tint="danger"
                        onPress={() => setKpiDetail({ label: 'TDS (Income Tax)', value: formatINR(tdsTotal), sub: `${tdsApplicable} applicable employees` })} />
                </View>

                {/* Compliance Status */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Statutory Compliance Status</Text>
                    <ComplianceRow label="PF"  ready={computeStatusByType.PF}  text={computeStatusByType.PF ? 'Ready' : 'Pending'} />
                    <ComplianceRow label="ESI" ready={computeStatusByType.ESI} text={computeStatusByType.ESI ? 'Ready' : 'Pending'} />
                    <ComplianceRow label="Professional Tax" ready={computeStatusByType.PT} text={computeStatusByType.PT ? 'Ready' : 'Pending'} />
                    <ComplianceRow label="TDS (24Q)" ready={computeStatusByType.TDS} text={computeStatusByType.TDS ? 'Ready' : 'Pending'} />
                </View>

                {/* PF / ESI / PT / TDS category cards with View Details */}
                <View style={{ marginTop: 12, gap: 10 }}>
                    {categoryCards.map(card => {
                        const tintMap: Record<string, { bg: string; fg: string }> = {
                            emerald: { bg: '#ECFDF5', fg: '#059669' },
                            info:    { bg: colors.info[50],    fg: colors.info[700] },
                            warning: { bg: colors.warning[50], fg: colors.warning[700] },
                            danger:  { bg: colors.danger[50],  fg: colors.danger[700] },
                        };
                        const t = tintMap[card.tint];
                        return (
                            <View key={card.key} style={styles.categoryCard}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={[styles.categoryBadge, { backgroundColor: t.bg }]}>
                                        <Text style={{ fontFamily: 'Inter', fontSize: 10.5, fontWeight: '800', color: t.fg }}>{card.key}</Text>
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text className="font-inter text-[13px] font-bold text-neutral-900" numberOfLines={1}>{card.title}</Text>
                                        <Text className="font-inter text-[11px] text-neutral-500">{card.eligible} employees · {formatINR(card.total)}</Text>
                                    </View>
                                </View>
                                <Pressable
                                    onPress={() => setDetailCategory(card.key)}
                                    style={({ pressed }) => [styles.viewDetailsBtn, pressed && { backgroundColor: colors.primary[100] }]}
                                >
                                    <Text className="font-inter text-[12px] font-bold text-primary-700">View Details  ›</Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>

                {/* Important Dates */}
                <View style={[styles.heroCard, { marginTop: 12 }]}>
                    <Text className="font-inter text-[13px] font-bold text-neutral-900 mb-2">Important Dates</Text>
                    {importantDates.map(d => (
                        <View key={d.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                            <Text className="font-inter text-[12.5px] text-neutral-700">{d.label}</Text>
                            <Text className="font-inter text-[12.5px] font-bold text-neutral-900">
                                {fmt.date(d.date.toISOString())}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Generated Files */}
                <View style={{ marginTop: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text className="font-inter text-[15px] font-bold text-neutral-900">Generated Statutory Files ({files.length})</Text>
                    <Pressable onPress={() => setLogOpen(true)} style={styles.logBtn}>
                        <Text className="font-inter text-[11.5px] font-bold text-primary-700">📋 View Computation Log</Text>
                    </Pressable>
                </View>
                {files.length === 0 ? (
                    <View style={{ gap: 10 }}>
                        <View style={[styles.heroCard, { alignItems: 'center', paddingVertical: 16 }]}>
                            <Text style={{ fontSize: 26, marginBottom: 4 }}>📄</Text>
                            <Text className="font-inter text-[12.5px] text-neutral-500" style={{ textAlign: 'center' }}>
                                No pre-generated files yet. Download statutory files from the backend below.
                            </Text>
                        </View>
                        {(['PF_ECR', 'ESI_CHALLAN', 'PT_CHALLAN', 'TDS_24Q'] as const).map(t => (
                            <FileCard
                                key={t}
                                type={t}
                                fileName={`${t}_${runDetail?.month ?? ''}_${runDetail?.year ?? ''}.xlsx`}
                                fileUrl={null}
                                status="NOT_GENERATED"
                                onDownload={() => handleFileDownload(t)}
                                downloading={downloadingType === t}
                            />
                        ))}
                    </View>
                ) : (
                    <View style={{ gap: 10 }}>
                        {files.map((f, i) => (
                            <FileCard key={f.id ?? f.type ?? i}
                                type={f.type}
                                fileName={f.label ?? `${f.type}_${runDetail?.month}_${runDetail?.year}.xml`}
                                employees={f.employeeCount}
                                amount={f.amount}
                                dueDate={f.dueDate}
                                fileUrl={f.fileUrl}
                                status={f.status}
                                onDownload={f.fileUrl ? undefined : () => handleFileDownload(f.type)}
                                downloading={downloadingType === f.type} />
                        ))}
                    </View>
                )}

                {/* Warning */}
                {!isPostApproval && (
                    <View style={[styles.alertBanner, { marginTop: 16 }]}>
                        <Text style={{ color: colors.warning[700], fontSize: 16, marginRight: 8 }}>⚠</Text>
                        <Text className="font-inter text-[12.5px] text-warning-700" style={{ flex: 1 }}>
                            Please verify statutory amounts and files before proceeding. Any salary changes require re-computation.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Sticky bottom */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                {isStatutoryDone ? (
                    <>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[12px] font-semibold text-success-700">✓ Statutory computed</Text>
                            <Text className="font-inter text-[11px] text-neutral-500">{formatINR(pfEmp + pfEmpr + esiEmp + esiEmpr + ptTotal + tdsTotal)} total</Text>
                        </View>
                        {!isPostApproval && (
                            <Pressable onPress={handleReset} disabled={resetMutation.isPending}
                                style={[styles.actionBtn, { backgroundColor: colors.warning[50], borderWidth: 1, borderColor: colors.warning[300], opacity: resetMutation.isPending ? 0.5 : 1 }]}>
                                <Text className="font-inter text-[12.5px] font-bold" style={{ color: colors.warning[700] }}>↺ Reset</Text>
                            </Pressable>
                        )}
                        <Pressable onPress={handleNext} style={styles.actionBtn}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[12.5px] font-bold text-white">Next: Approval  ›</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-[11px] text-neutral-500">{totalEmployees} employees</Text>
                        </View>
                        <Pressable onPress={handleCompute} disabled={computeMutation.isPending} style={[styles.actionBtn, computeMutation.isPending && { opacity: 0.5 }]}>
                            <LinearGradient colors={[colors.primary[600], colors.accent[600]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            <Text className="font-inter text-[13px] font-bold text-white">
                                {computeMutation.isPending ? 'Computing…' : '🛡 Compute Statutory'}
                            </Text>
                        </Pressable>
                    </>
                )}
            </View>

            <ConfirmModal {...confirmModal.modalProps} />

            <StatutoryDetailSheet
                visible={!!detailCategory}
                onClose={() => setDetailCategory(null)}
                runId={inferredRunId}
                category={detailCategory}
            />
            <ComputationLogSheet
                visible={logOpen}
                onClose={() => setLogOpen(false)}
                runId={inferredRunId}
            />

            {/* KPI tap-to-expand sheet */}
            <Modal visible={!!kpiDetail} animationType="fade" transparent onRequestClose={() => setKpiDetail(null)}>
                <Pressable onPress={() => setKpiDetail(null)} style={sheetStyles.backdrop}>
                    <Pressable style={[sheetStyles.card, { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text className="font-inter text-[12px] font-bold uppercase tracking-wider text-neutral-500">{kpiDetail?.label}</Text>
                            <Pressable onPress={() => setKpiDetail(null)} hitSlop={10}>
                                <Text style={{ color: colors.neutral[400], fontSize: 18 }}>✕</Text>
                            </Pressable>
                        </View>
                        <Text className="font-inter text-[28px] font-extrabold text-neutral-900">{kpiDetail?.value}</Text>
                        {kpiDetail?.sub && <Text className="mt-2 font-inter text-[13px] text-neutral-600">{kpiDetail.sub}</Text>}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    heroCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.neutral[200] },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statTile: { width: '48%', backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    statBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statDot: { width: 10, height: 10, borderRadius: 3 },
    fileCard: { backgroundColor: colors.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    fileBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    dlBtn: { marginTop: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
    alertBanner: { backgroundColor: colors.warning[50], borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.warning[200] },
    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderTopWidth: 1, borderTopColor: colors.neutral[200],
        paddingHorizontal: 14, paddingTop: 12,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    actionBtn: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, overflow: 'hidden', minWidth: 130, alignItems: 'center', justifyContent: 'center' },
    categoryCard: {
        backgroundColor: colors.white, borderRadius: 14, padding: 12,
        borderWidth: 1, borderColor: colors.neutral[200],
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    },
    categoryBadge: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    viewDetailsBtn: {
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 8, backgroundColor: colors.primary[50],
        borderWidth: 1, borderColor: colors.primary[200],
    },
    logBtn: {
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 8, backgroundColor: colors.primary[50],
        borderWidth: 1, borderColor: colors.primary[200],
    },
});

const sheetStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    card: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: colors.neutral[100], gap: 12,
    },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    btn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    search: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[50],
        borderRadius: 10, paddingHorizontal: 12, height: 38,
        borderWidth: 1, borderColor: colors.neutral[200],
    },
    searchInput: { flex: 1, fontFamily: 'Inter', fontSize: 13, color: colors.neutral[800] },
    empCard: { backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    empMeta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 4 },
    actionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
    detailBox: { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[200] },
});

export default PhaseCStep4Screen;

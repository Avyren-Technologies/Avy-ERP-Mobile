/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useSuccessionPlans,
    useBenchStrength,
} from '@/features/company-admin/api/use-performance-queries';
import {
    useCreateSuccessionPlan,
    useUpdateSuccessionPlan,
    useDeleteSuccessionPlan,
} from '@/features/company-admin/api/use-performance-mutations';

// ============ TYPES ============

type PlanStatus = 'Active' | 'Draft' | 'Completed' | 'On Hold';
// Backend enum: SuccessorReadiness { READY_NOW, ONE_YEAR, TWO_YEARS, NOT_READY }
type ReadinessLevel = 'READY_NOW' | 'ONE_YEAR' | 'TWO_YEARS' | 'NOT_READY';
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

interface SuccessionPlanItem {
    id: string;
    positionTitle: string;
    departmentName: string;
    incumbentName: string;
    incumbentId: string;
    status: PlanStatus;
    riskLevel: RiskLevel;
    successors: {
        name: string;
        readiness: ReadinessLevel;
        score: number;
    }[];
    notes: string;
    lastReviewDate: string;
}

interface BenchStrengthData {
    totalPositions: number;
    coveredPositions: number;
    criticalRoles: number;
    readyNow: number;
    developmentNeeded: number;
    averageSuccessors: number;
    riskDistribution: { level: string; count: number }[];
}

// ============ CONSTANTS ============

const READINESS_LABELS: Record<ReadinessLevel, string> = {
    READY_NOW: 'Ready Now',
    ONE_YEAR: '1-2 Years',
    TWO_YEARS: '3-5 Years',
    NOT_READY: 'Not Ready',
};

const STATUS_COLORS: Record<PlanStatus, { bg: string; text: string; dot: string }> = {
    Active: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Draft: { bg: colors.neutral[100], text: colors.neutral[700], dot: colors.neutral[400] },
    Completed: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
    'On Hold': { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
};

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string }> = {
    Low: { bg: colors.success[50], text: colors.success[700] },
    Medium: { bg: colors.warning[50], text: colors.warning[700] },
    High: { bg: colors.danger[50], text: colors.danger[700] },
    Critical: { bg: '#FEE2E2', text: '#991B1B' },
};

const READINESS_COLORS: Record<ReadinessLevel, string> = {
    READY_NOW: colors.success[600],
    ONE_YEAR: colors.primary[600],
    TWO_YEARS: colors.warning[600],
    NOT_READY: colors.danger[600],
};

const STATUSES: PlanStatus[] = ['Active', 'Draft', 'Completed', 'On Hold'];
const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
const READINESS_LEVELS: ReadinessLevel[] = ['READY_NOW', 'ONE_YEAR', 'TWO_YEARS', 'NOT_READY'];

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: PlanStatus }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.Draft;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
    const c = RISK_COLORS[risk] ?? RISK_COLORS.Medium;
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{risk} Risk</Text>
        </View>
    );
}

function ReadinessBadge({ readiness }: { readiness: ReadinessLevel }) {
    const color = READINESS_COLORS[readiness] ?? colors.neutral[600];
    return (
        <View style={[styles.badge, { backgroundColor: color + '15' }]}>
            <Text style={{ color, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{READINESS_LABELS[readiness] ?? readiness}</Text>
        </View>
    );
}

// ============ DETAIL MODAL ============

function PlanDetailModal({
    visible, onClose, item,
}: {
    visible: boolean; onClose: () => void; item: SuccessionPlanItem | null;
}) {
    const insets = useSafeAreaInsets();
    if (!item) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 60 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-1">{item.positionTitle}</Text>
                    <Text className="font-inter text-xs text-neutral-500 mb-4">{item.departmentName}</Text>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                        {/* Incumbent Info */}
                        <View style={styles.detailCard}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Current Incumbent</Text>
                            <Text className="font-inter text-sm font-semibold text-primary-950">{item.incumbentName || 'Vacant'}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                <StatusBadge status={item.status} />
                                <RiskBadge risk={item.riskLevel} />
                            </View>
                        </View>

                        {/* Successors */}
                        <View style={styles.detailCard}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Identified Successors ({item.successors.length})</Text>
                            {item.successors.length === 0 ? (
                                <Text className="font-inter text-sm text-neutral-400">No successors identified yet.</Text>
                            ) : (
                                item.successors.map((s, i) => (
                                    <View key={i} style={styles.successorRow}>
                                        <View style={styles.successorAvatar}>
                                            <Text className="font-inter text-xs font-bold text-primary-600">{s.name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text className="font-inter text-sm font-semibold text-primary-950">{s.name}</Text>
                                            <ReadinessBadge readiness={s.readiness} />
                                        </View>
                                        {s.score > 0 && (
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text className="font-inter text-lg font-bold text-primary-600">{s.score}</Text>
                                                <Text className="font-inter text-[10px] text-neutral-400">Score</Text>
                                            </View>
                                        )}
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Notes */}
                        {item.notes ? (
                            <View style={styles.detailCard}>
                                <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Notes</Text>
                                <Text className="font-inter text-sm text-primary-950">{item.notes}</Text>
                            </View>
                        ) : null}

                        {item.lastReviewDate ? (
                            <Text className="font-inter text-xs text-neutral-400 text-center mt-2">Last reviewed: {item.lastReviewDate}</Text>
                        ) : null}
                    </ScrollView>
                    <Pressable onPress={onClose} style={styles.cancelBtn}>
                        <Text className="font-inter text-sm font-semibold text-neutral-600">Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ============ FORM MODAL ============

interface PlanForm {
    positionTitle: string;
    departmentName: string;
    incumbentName: string;
    riskLevel: RiskLevel;
    notes: string;
    successorName: string;
    successorReadiness: ReadinessLevel;
}

const EMPTY_FORM: PlanForm = {
    positionTitle: '', departmentName: '', incumbentName: '', riskLevel: 'Medium', notes: '',
    successorName: '', successorReadiness: 'READY_NOW',
};

function PlanFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: SuccessionPlanItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<PlanForm>(EMPTY_FORM);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setForm({
                    positionTitle: initialData.positionTitle,
                    departmentName: initialData.departmentName,
                    incumbentName: initialData.incumbentName,
                    riskLevel: initialData.riskLevel,
                    notes: initialData.notes,
                    successorName: '',
                    successorReadiness: 'READY_NOW',
                });
            } else {
                setForm(EMPTY_FORM);
            }
        }
    }, [visible, initialData]);

    const update = <K extends keyof PlanForm>(key: K, val: PlanForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const isValid = form.positionTitle.trim() && form.departmentName.trim();

    const handleSave = () => {
        if (!isValid) return;
        const data: Record<string, unknown> = {
            positionTitle: form.positionTitle,
            departmentName: form.departmentName,
            incumbentName: form.incumbentName,
            riskLevel: form.riskLevel,
            notes: form.notes,
        };
        if (form.successorName.trim()) {
            data.successors = [{ name: form.successorName, readiness: form.successorReadiness }];
        }
        onSave(data);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 40 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">
                        {initialData ? 'Edit Plan' : 'New Succession Plan'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Position <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. VP Engineering" placeholderTextColor={colors.neutral[400]} value={form.positionTitle} onChangeText={v => update('positionTitle', v)} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Department <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Department..." placeholderTextColor={colors.neutral[400]} value={form.departmentName} onChangeText={v => update('departmentName', v)} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Current Incumbent</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Name of current holder..." placeholderTextColor={colors.neutral[400]} value={form.incumbentName} onChangeText={v => update('incumbentName', v)} /></View>
                        </View>

                        {/* Risk Level */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Risk Level</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {RISK_LEVELS.map(r => {
                                    const sel = r === form.riskLevel;
                                    return (
                                        <Pressable key={r} onPress={() => update('riskLevel', r)} style={[styles.chip, sel && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{r}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Successor */}
                        <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 mt-2">Add Successor (Optional)</Text>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Successor Name</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Name..." placeholderTextColor={colors.neutral[400]} value={form.successorName} onChangeText={v => update('successorName', v)} /></View>
                        </View>
                        {form.successorName.trim() ? (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Readiness</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {READINESS_LEVELS.map(l => {
                                        const sel = l === form.successorReadiness;
                                        return (
                                            <Pressable key={l} onPress={() => update('successorReadiness', l)} style={[styles.chip, sel && styles.chipActive]}>
                                                <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{READINESS_LABELS[l]}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : null}

                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Notes</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder="Additional notes..." placeholderTextColor={colors.neutral[400]} value={form.notes} onChangeText={v => update('notes', v)} multiline />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create Plan'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ PLAN CARD ============

function PlanCard({ item, index, onView, onEdit, onDelete }: {
    item: SuccessionPlanItem; index: number; onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
    const successorCount = item.successors.length;
    const readyCount = item.successors.filter(s => s.readiness === 'READY_NOW').length;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onView} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.positionTitle}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.departmentName}</Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <RiskBadge risk={item.riskLevel} />
                    {item.incumbentName ? (
                        <Text className="font-inter text-xs text-neutral-500">Incumbent: {item.incumbentName}</Text>
                    ) : (
                        <View style={[styles.badge, { backgroundColor: colors.danger[50] }]}>
                            <Text style={{ color: colors.danger[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Vacant</Text>
                        </View>
                    )}
                </View>
                {/* Successor summary */}
                <View style={styles.successorSummary}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-xs text-neutral-500">
                            {successorCount} successor{successorCount !== 1 ? 's' : ''} identified
                        </Text>
                        {readyCount > 0 && (
                            <Text className="font-inter text-[10px] font-semibold text-success-600">{readyCount} ready now</Text>
                        )}
                    </View>
                    {/* Successor avatars */}
                    <View style={{ flexDirection: 'row', gap: -6 }}>
                        {item.successors.slice(0, 3).map((s, i) => (
                            <View key={i} style={[styles.miniAvatar, { borderColor: READINESS_COLORS[s.readiness] ?? colors.neutral[400], zIndex: 3 - i }]}>
                                <Text style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: '700', color: colors.primary[700] }}>{s.name.charAt(0)}</Text>
                            </View>
                        ))}
                        {successorCount > 3 && (
                            <View style={[styles.miniAvatar, { backgroundColor: colors.neutral[200], borderColor: colors.neutral[300] }]}>
                                <Text style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: '700', color: colors.neutral[600] }}>+{successorCount - 3}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Pressable onPress={onEdit} style={styles.editBtn}>
                        <Text className="font-inter text-[10px] font-bold text-primary-600">Edit</Text>
                    </Pressable>
                    {item.status === 'Draft' && (
                        <Pressable onPress={onDelete} hitSlop={8} style={{ marginLeft: 'auto' }}>
                            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        </Pressable>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function SuccessionScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<SuccessionPlanItem | null>(null);
    const [detailItem, setDetailItem] = React.useState<SuccessionPlanItem | null>(null);
    const [detailVisible, setDetailVisible] = React.useState(false);

    const { data: response, isLoading, error, refetch, isFetching } = useSuccessionPlans();
    const { data: benchResponse } = useBenchStrength();
    const createMutation = useCreateSuccessionPlan();
    const updateMutation = useUpdateSuccessionPlan();
    const deleteMutation = useDeleteSuccessionPlan();

    const plans: SuccessionPlanItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            positionTitle: item.positionTitle ?? '',
            departmentName: item.departmentName ?? '',
            incumbentName: item.incumbentName ?? '',
            incumbentId: item.incumbentId ?? '',
            status: item.status ?? 'Draft',
            riskLevel: item.riskLevel ?? 'Medium',
            successors: Array.isArray(item.successors) ? item.successors.map((s: any) => ({
                name: s.name ?? '',
                readiness: s.readiness ?? 'NOT_READY',
                score: s.score ?? 0,
            })) : [],
            notes: item.notes ?? '',
            lastReviewDate: item.lastReviewDate ?? '',
        }));
    }, [response]);

    const bench: BenchStrengthData | null = React.useMemo(() => {
        const raw = (benchResponse as any)?.data ?? benchResponse;
        if (!raw) return null;
        return {
            totalPositions: raw.totalPositions ?? 0,
            coveredPositions: raw.coveredPositions ?? 0,
            criticalRoles: raw.criticalRoles ?? 0,
            readyNow: raw.readyNow ?? 0,
            developmentNeeded: raw.developmentNeeded ?? 0,
            averageSuccessors: raw.averageSuccessors ?? 0,
            riskDistribution: raw.riskDistribution ?? [],
        };
    }, [benchResponse]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return plans;
        const q = search.toLowerCase();
        return plans.filter(p => p.positionTitle.toLowerCase().includes(q) || p.departmentName.toLowerCase().includes(q) || p.incumbentName.toLowerCase().includes(q));
    }, [plans, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: SuccessionPlanItem) => { setEditingItem(item); setFormVisible(true); };
    const handleView = (item: SuccessionPlanItem) => { setDetailItem(item); setDetailVisible(true); };

    const handleDelete = (item: SuccessionPlanItem) => {
        showConfirm({ title: 'Delete Plan', message: `Delete succession plan for "${item.positionTitle}"?`, confirmText: 'Delete', variant: 'danger', onConfirm: () => deleteMutation.mutate(item.id) });
    };

    const handleSave = (data: Record<string, unknown>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
        }
    };

    const coveragePct = bench ? (bench.totalPositions > 0 ? (bench.coveredPositions / bench.totalPositions) * 100 : 0) : 0;

    const renderItem = ({ item, index }: { item: SuccessionPlanItem; index: number }) => (
        <PlanCard item={item} index={index} onView={() => handleView(item)} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Succession Planning</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{plans.length} plan{plans.length !== 1 ? 's' : ''}</Text>

            {/* Bench Strength Stats */}
            {bench && (
                <View style={styles.benchCard}>
                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Bench Strength</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        <View style={[styles.statBox, { flex: 1 }]}>
                            <Text className="font-inter text-lg font-bold text-primary-600">{bench.totalPositions}</Text>
                            <Text className="font-inter text-[10px] text-neutral-500">Positions</Text>
                        </View>
                        <View style={[styles.statBox, { flex: 1 }]}>
                            <Text className="font-inter text-lg font-bold text-success-600">{bench.coveredPositions}</Text>
                            <Text className="font-inter text-[10px] text-neutral-500">Covered</Text>
                        </View>
                        <View style={[styles.statBox, { flex: 1 }]}>
                            <Text className="font-inter text-lg font-bold text-danger-600">{bench.criticalRoles}</Text>
                            <Text className="font-inter text-[10px] text-neutral-500">Critical</Text>
                        </View>
                    </View>
                    {/* Coverage bar */}
                    <View style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text className="font-inter text-xs text-neutral-600">Coverage</Text>
                            <Text className="font-inter text-xs font-bold text-primary-600">{coveragePct.toFixed(0)}%</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${coveragePct}%`, backgroundColor: coveragePct >= 75 ? colors.success[500] : coveragePct >= 50 ? colors.warning[500] : colors.danger[500] }]} />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text className="font-inter text-[10px] text-neutral-400">Ready Now: {bench.readyNow}</Text>
                        <Text className="font-inter text-[10px] text-neutral-400">Avg Successors: {bench.averageSuccessors.toFixed(1)}</Text>
                    </View>
                </View>
            )}

            <View style={{ marginTop: 12 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search plans..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No plans match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No succession plans" message="Create your first succession plan." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientHeader, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={toggle} />
                    <Text className="font-inter text-white text-lg font-bold ml-3">Succession Planning</Text>
                </View>
            </LinearGradient>
            <FlatList
                data={filtered} renderItem={renderItem} keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <PlanFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />
            <PlanDetailModal visible={detailVisible} onClose={() => setDetailVisible(false)} item={detailItem} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    gradientHeader: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    benchCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.primary[100] },
    statBox: { backgroundColor: colors.neutral[50], borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral[200] },
    progressTrack: { height: 6, backgroundColor: colors.neutral[200], borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    successorSummary: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
    miniAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary[50], borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    successorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    successorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    editBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.primary[50] },
    detailCard: { backgroundColor: colors.neutral[50], borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    fullFormSheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200], marginTop: 16 },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

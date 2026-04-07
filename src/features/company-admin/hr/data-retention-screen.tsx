/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

import {
    useCreateConsent,
    useCreateRetentionPolicy,
    useDeleteRetentionPolicy,
    useUpdateDataRequest,
    useUpdateRetentionPolicy,
} from '@/features/company-admin/api/use-retention-mutations';
import {
    useConsents,
    useDataRequests,
    useRetentionCheckDue,
    useRetentionPolicies,
} from '@/features/company-admin/api/use-retention-queries';

// ============ TYPES ============

type TabId = 'policies' | 'requests' | 'consent';

interface RetentionPolicy {
    id: string;
    category: string;
    retentionYears: number;
    action: string;
    description: string;
}

interface AccessRequest {
    id: string;
    employeeName: string;
    type: 'ACCESS' | 'PORTABILITY' | 'ERASURE';
    status: string;
    createdAt: string;
}

interface ConsentRecord {
    id: string;
    employeeId: string;
    employeeName: string;
    consentType: string;
    granted: boolean;
}

const TABS: { id: TabId; label: string }[] = [
    { id: 'policies', label: 'Policies' },
    { id: 'requests', label: 'Requests' },
    { id: 'consent', label: 'Consent' },
];

const DATA_CATEGORIES = ['PERSONAL_INFO', 'FINANCIAL_DATA', 'MEDICAL_RECORDS', 'ATTENDANCE_DATA', 'PERFORMANCE_DATA', 'COMMUNICATION_LOGS', 'EXIT_DATA'];
const RETENTION_ACTIONS = ['ARCHIVE', 'DELETE', 'ANONYMIZE'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: colors.warning[50], text: 'text-warning-700' },
    APPROVED: { bg: colors.success[50], text: 'text-success-700' },
    COMPLETED: { bg: colors.success[50], text: 'text-success-700' },
    REJECTED: { bg: colors.danger[50], text: 'text-danger-600' },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    ACCESS: { bg: colors.info[50], text: 'text-info-700' },
    PORTABILITY: { bg: colors.accent[50], text: 'text-accent-700' },
    ERASURE: { bg: colors.danger[50], text: 'text-danger-600' },
};

// ============ BADGES ============

function StatusBadge({ status }: { status: string }) {
    const c = STATUS_COLORS[status?.toUpperCase()] ?? STATUS_COLORS.PENDING;
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{status}</Text>
        </View>
    );
}

function TypeBadge({ type }: { type: string }) {
    const c = TYPE_COLORS[type?.toUpperCase()] ?? TYPE_COLORS.ACCESS;
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{type}</Text>
        </View>
    );
}

// ============ CHIP SELECTOR ============

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-[10px] font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt.replace(/_/g, ' ')}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ POLICY FORM MODAL ============

function PolicyFormModal({
    visible,
    onClose,
    onSave,
    initialData,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: RetentionPolicy | null;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [category, setCategory] = React.useState('');
    const [years, setYears] = React.useState('');
    const [action, setAction] = React.useState('');
    const [description, setDescription] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setCategory(initialData.category ?? '');
                setYears(String(initialData.retentionYears ?? ''));
                setAction(initialData.action ?? '');
                setDescription(initialData.description ?? '');
            } else {
                setCategory('');
                setYears('');
                setAction('');
                setDescription('');
            }
        }
    }, [visible, initialData]);

    const isValid = category && years && action;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Policy' : 'Add Policy'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <ChipSelector label="Data Category" options={DATA_CATEGORIES} value={category} onSelect={setCategory} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Retention Years <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. 7" placeholderTextColor={colors.neutral[400]} value={years} onChangeText={setYears} keyboardType="numeric" /></View>
                        </View>
                        <ChipSelector label="Action After Retention" options={RETENTION_ACTIONS} value={action} onSelect={setAction} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 80 }]}><TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder="Optional description..." placeholderTextColor={colors.neutral[400]} value={description} onChangeText={setDescription} multiline /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ id: initialData?.id, category, retentionYears: Number(years), action, description })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Policy'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ DUE CHECK MODAL ============

function DueCheckModal({
    visible,
    onClose,
    items,
    isLoading,
}: {
    visible: boolean;
    onClose: () => void;
    items: any[];
    isLoading: boolean;
}) {
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Retention Check</Text>
                    {isLoading ? (
                        <View style={{ paddingTop: 20 }}><SkeletonCard /><SkeletonCard /></View>
                    ) : items.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.success[50], justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                                <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.success[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </View>
                            <Text className="font-inter text-sm font-bold text-primary-950">All Clear</Text>
                            <Text className="font-inter text-xs text-neutral-500 mt-1">No overdue retention records.</Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {items.map((d: any, idx: number) => (
                                <View key={idx} style={styles.dueCard}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-bold text-warning-800">{d.category?.replace(/_/g, ' ')}</Text>
                                        <Text className="font-inter text-[10px] text-warning-600 mt-0.5">Action: {d.action}</Text>
                                    </View>
                                    <View style={styles.dueCount}>
                                        <Text className="font-inter text-sm font-bold text-warning-700">{d.overdueCount ?? 0}</Text>
                                        <Text className="font-inter text-[10px] text-warning-600 ml-1">records</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                    <Pressable onPress={onClose} style={[styles.cancelBtn, { marginTop: 16 }]}>
                        <Text className="font-inter text-sm font-semibold text-neutral-600">Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ============ POLICY CARD ============

function PolicyCard({ item, index, onEdit, onDelete }: { item: RetentionPolicy; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950">{item.category?.replace(/_/g, ' ')}</Text>
                        {item.description ? <Text className="mt-0.5 font-inter text-[10px] text-neutral-500" numberOfLines={1}>{item.description}</Text> : null}
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">{item.retentionYears} years</Text>
                    </View>
                    <View style={[styles.metaChip, { backgroundColor: colors.primary[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-primary-700">{item.action}</Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ REQUEST CARD ============

function RequestCard({ item, index, onProcess }: { item: AccessRequest; index: number; onProcess: (id: string, action: string) => void }) {
    const fmt = useCompanyFormatter();
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950">{item.employeeName}</Text>
                            <TypeBadge type={item.type} />
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">
                            {item.createdAt ? fmt.date(item.createdAt) : ''}
                        </Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                {item.status === 'PENDING' && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                        <Pressable onPress={() => onProcess(item.id, 'APPROVED')} style={[styles.actionBtn, { backgroundColor: colors.success[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-success-700">Approve</Text>
                        </Pressable>
                        <Pressable onPress={() => onProcess(item.id, 'REJECTED')} style={[styles.actionBtn, { backgroundColor: colors.danger[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-danger-600">Reject</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ CONSENT CARD ============

function ConsentCard({ item, index, onToggle, isToggling }: { item: ConsentRecord; index: number; onToggle: () => void; isToggling: boolean }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text className="font-inter text-sm font-semibold text-primary-950">{item.consentType?.replace(/_/g, ' ')}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.employeeName ?? item.employeeId}</Text>
                    </View>
                    <Switch
                        value={item.granted}
                        onValueChange={onToggle}
                        disabled={isToggling}
                        trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                        thumbColor={item.granted ? colors.primary[600] : colors.neutral[300]}
                    />
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function DataRetentionScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [activeTab, setActiveTab] = React.useState<TabId>('policies');
    const [search, setSearch] = React.useState('');
    const [consentSearch, setConsentSearch] = React.useState('');
    const [formVisible, setFormVisible] = React.useState(false);
    const [editingPolicy, setEditingPolicy] = React.useState<RetentionPolicy | null>(null);
    const [dueVisible, setDueVisible] = React.useState(false);

    const { data: policiesRes, isLoading: policiesLoading, refetch: refetchPolicies, isFetching: policiesFetching } = useRetentionPolicies();
    const { data: requestsRes, isLoading: requestsLoading, refetch: refetchRequests, isFetching: requestsFetching } = useDataRequests();
    const { data: dueRes, isLoading: dueLoading, refetch: refetchDue } = useRetentionCheckDue();
    const { data: consentsRes, isLoading: consentsLoading, refetch: refetchConsents, isFetching: consentsFetching } = useConsents(consentSearch ? { search: consentSearch } as any : undefined);

    const createPolicy = useCreateRetentionPolicy();
    const updatePolicy = useUpdateRetentionPolicy();
    const deletePolicy = useDeleteRetentionPolicy();
    const processRequest = useUpdateDataRequest();
    const recordConsent = useCreateConsent();

    const policies: RetentionPolicy[] = React.useMemo(() => {
        const raw = (policiesRes as any)?.data ?? policiesRes ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [policiesRes]);

    const requests: AccessRequest[] = React.useMemo(() => {
        const raw = (requestsRes as any)?.data ?? requestsRes ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [requestsRes]);

    const dueItems: any[] = (dueRes as any)?.data ?? [];
    const consents: ConsentRecord[] = React.useMemo(() => {
        const raw = (consentsRes as any)?.data ?? consentsRes ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [consentsRes]);

    const filteredPolicies = React.useMemo(() => {
        if (!search.trim()) return policies;
        return policies.filter(p => p.category?.toLowerCase().includes(search.toLowerCase()));
    }, [policies, search]);

    const filteredRequests = React.useMemo(() => {
        if (!search.trim()) return requests;
        const q = search.toLowerCase();
        return requests.filter(r => r.employeeName?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q));
    }, [requests, search]);

    const handleAddPolicy = () => { setEditingPolicy(null); setFormVisible(true); };
    const handleEditPolicy = (p: RetentionPolicy) => { setEditingPolicy(p); setFormVisible(true); };

    const handleSavePolicy = (data: any) => {
        if (editingPolicy) {
            updatePolicy.mutate({ id: editingPolicy.id, data } as any, { onSuccess: () => setFormVisible(false) });
        } else {
            createPolicy.mutate(data as any, { onSuccess: () => setFormVisible(false) });
        }
    };

    const handleDeletePolicy = (p: RetentionPolicy) => {
        showConfirm({
            title: 'Delete Policy',
            message: `Are you sure you want to delete the "${p.category?.replace(/_/g, ' ')}" retention policy?`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => { deletePolicy.mutate(p.id); },
        });
    };

    const handleProcessRequest = (id: string, action: string) => {
        processRequest.mutate({ id, action } as any);
    };

    const handleToggleConsent = (c: ConsentRecord) => {
        recordConsent.mutate({ employeeId: c.employeeId, consentType: c.consentType, granted: !c.granted } as any);
    };

    const handleCheckDue = () => {
        refetchDue();
        setDueVisible(true);
    };

    // Choose data based on tab
    const currentData = activeTab === 'policies' ? filteredPolicies : activeTab === 'requests' ? filteredRequests : consents;
    const currentLoading = activeTab === 'policies' ? policiesLoading : activeTab === 'requests' ? requestsLoading : consentsLoading;
    const currentFetching = activeTab === 'policies' ? policiesFetching : activeTab === 'requests' ? requestsFetching : consentsFetching;
    const currentRefetch = activeTab === 'policies' ? refetchPolicies : activeTab === 'requests' ? refetchRequests : refetchConsents;

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        if (activeTab === 'policies') return <PolicyCard item={item} index={index} onEdit={() => handleEditPolicy(item)} onDelete={() => handleDeletePolicy(item)} />;
        if (activeTab === 'requests') return <RequestCard item={item} index={index} onProcess={handleProcessRequest} />;
        return <ConsentCard item={item} index={index} onToggle={() => handleToggleConsent(item)} isToggling={recordConsent.isPending} />;
    };

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text className="font-inter text-2xl font-bold text-primary-950">Data Retention</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">GDPR & Compliance</Text>
                </View>
                <Pressable onPress={handleCheckDue} style={styles.dueBtn}>
                    <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={colors.warning[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /><Path d="M12 9v4M12 17h.01" stroke={colors.warning[600]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    <Text className="ml-1 font-inter text-[10px] font-bold text-warning-700">Check Due</Text>
                </Pressable>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                {TABS.map(tab => {
                    const active = tab.id === activeTab;
                    return (
                        <Pressable key={tab.id} onPress={() => { setActiveTab(tab.id); setSearch(''); }} style={[styles.chip, active && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{tab.label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={{ marginTop: 12 }}>
                <SearchBar
                    value={activeTab === 'consent' ? consentSearch : search}
                    onChangeText={activeTab === 'consent' ? setConsentSearch : setSearch}
                    placeholder={activeTab === 'consent' ? 'Search employee...' : 'Search...'}
                />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (currentLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (activeTab === 'consent' && !consentSearch) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="Search Employee" message="Enter an employee name to view consent records." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title={`No ${activeTab}`} message={`No ${activeTab} found.`} /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Data Retention & GDPR" onMenuPress={toggle} />
            <FlashList
                data={currentData}
                renderItem={renderItem}
                keyExtractor={(item: any) => item.id ?? `${item.employeeId}-${item.consentType}`}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={currentFetching && !currentLoading} onRefresh={() => currentRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            {activeTab === 'policies' && (
                <View style={{ position: 'absolute', right: 24, bottom: insets.bottom + 24 }}>
                    <Pressable onPress={handleAddPolicy} style={styles.fab}>
                        <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.white} strokeWidth="2.5" strokeLinecap="round" /></Svg>
                    </Pressable>
                </View>
            )}
            <PolicyFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSavePolicy} initialData={editingPolicy} isSaving={createPolicy.isPending || updatePolicy.isPending} />
            <DueCheckModal visible={dueVisible} onClose={() => setDueVisible(false)} items={dueItems} isLoading={dueLoading} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    dueBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.warning[50] },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    dueCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: colors.warning[50], borderRadius: 14, borderWidth: 1, borderColor: colors.warning[200], marginBottom: 8 },
    dueCount: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning[100], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
});

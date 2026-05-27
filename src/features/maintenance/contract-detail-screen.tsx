import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View, Modal as RNModal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useContract, useContractUtilisation, useAssets } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import { useCanPerform } from '@/hooks/use-can-perform';
import { useUpdateContract, useAddContractAsset, useRemoveContractAsset, useLogContractVisit } from '@/features/maintenance/api/use-maintenance-mutations';
import { Input } from '@/components/ui/input';
import { DropdownField } from '@/components/ui/dropdown-field';
import { DatePickerField } from '@/components/ui/date-picker';

const CONTRACT_TYPES = [
    { id: 'WARRANTY', name: 'Warranty' },
    { id: 'AMC', name: 'AMC' },
    { id: 'CAMC', name: 'CAMC' },
    { id: 'RENTAL', name: 'Rental' },
    { id: 'SERVICE', name: 'Service' },
];

/* ── Screen ── */

export function ContractDetailScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const canManage = useCanPerform('maintenance:create');

    const { data, isLoading, refetch } = useContract(id ?? '');
    const contract: any = (data as any)?.data ?? {};

    const { data: utilData, refetch: refetchUtil } = useContractUtilisation(id ?? '');
    const utilisation: any = (utilData as any)?.data ?? {};

    const [activeTab, setActiveTab] = React.useState<'info' | 'assets' | 'visits' | 'utilisation'>('info');

    // Edit Contract Modal State — ALL hooks must be before any early return
    const updateMutation = useUpdateContract();
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [editForm, setEditForm] = React.useState({
        name: '',
        contractType: 'AMC',
        vendorName: '',
        startDate: '',
        endDate: '',
        callLimit: '',
        contractValue: '',
        coverageScope: '',
    });
    const [editFormErrors, setEditFormErrors] = React.useState<Record<string, string>>({});

    // Add Asset Modal State
    const addAssetMutation = useAddContractAsset();
    const removeAssetMutation = useRemoveContractAsset();
    const [showAddAsset, setShowAddAsset] = React.useState(false);
    const [assetSearch, setAssetSearch] = React.useState('');
    const { data: assetsData } = useAssets({ search: assetSearch.trim() || undefined, limit: 20 });

    // Log Visit Modal State
    const logVisitMutation = useLogContractVisit();
    const [showVisitModal, setShowVisitModal] = React.useState(false);
    const [visitForm, setVisitForm] = React.useState({
        visitDate: '',
        vendorTechName: '',
        serviceReport: '',
        invoiceAmount: '',
    });
    const [visitErrors, setVisitErrors] = React.useState<Record<string, string>>({});

    // ── Derived values (safe to compute after hooks) ──
    const linkedAssets: any[] = contract.assets ?? contract.contractAssets ?? [];
    const visits: any[] = contract.visits ?? contract.contractVisits ?? [];
    const searchAssets: any[] = (assetsData as any)?.data ?? [];

    const daysLeft = contract.endDate
        ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / 86400000)
        : null;

    const callsPct = contract.callLimit ? Math.min(100, Math.round(((contract.callsUsed ?? 0) / contract.callLimit) * 100)) : 0;
    // Fallback: sum visit invoice amounts if backend costClaimed is 0 but visits have costs
    const visitsCostSum = visits.reduce((sum: number, v: any) => sum + (v.invoiceAmount ? Number(v.invoiceAmount) : 0), 0);
    const effectiveCostClaimed = Number(utilisation.costClaimed ?? 0) > 0 ? Number(utilisation.costClaimed) : visitsCostSum;
    const usingCostFallback = Number(utilisation.costClaimed ?? 0) === 0 && visitsCostSum > 0;
    const costPct = contract.contractValue && effectiveCostClaimed > 0
        ? Math.min(100, Math.round((effectiveCostClaimed / Number(contract.contractValue)) * 100))
        : (utilisation.costClaimedPct ? Math.min(100, Number(utilisation.costClaimedPct)) : 0);
    const callLimitExceeded = contract.callLimit != null && (contract.callsUsed ?? 0) > contract.callLimit;

    const tabs = ['info', 'assets', 'visits', 'utilisation'] as const;

    // ── Early return AFTER all hooks ──
    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <View style={{ padding: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    // ── Handlers ──

    const openEditModal = () => {
        setEditForm({
            name: contract.name ?? '',
            contractType: contract.contractType ?? 'AMC',
            vendorName: contract.vendorName ?? '',
            startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
            endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
            callLimit: contract.callLimit?.toString() ?? '',
            contractValue: contract.contractValue?.toString() ?? '',
            coverageScope: contract.coverageScope ?? '',
        });
        setEditFormErrors({});
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!id) return;
        const errors: Record<string, string> = {};
        if (!editForm.name.trim()) errors.name = 'Contract name is required';
        if (!editForm.startDate) errors.startDate = 'Start date is required';
        if (!editForm.endDate) errors.endDate = 'End date is required';
        
        if (editForm.startDate && editForm.endDate && new Date(editForm.endDate) <= new Date(editForm.startDate)) {
            errors.endDate = 'End date must be after start date';
        }

        if (Object.keys(errors).length > 0) {
            setEditFormErrors(errors);
            return;
        }

        setEditFormErrors({});
        try {
            await updateMutation.mutateAsync({
                id,
                data: {
                    name: editForm.name.trim(),
                    contractType: editForm.contractType,
                    vendorName: editForm.vendorName.trim() || undefined,
                    startDate: editForm.startDate,
                    endDate: editForm.endDate,
                    callLimit: editForm.callLimit ? Number(editForm.callLimit) : undefined,
                    contractValue: editForm.contractValue ? Number(editForm.contractValue) : undefined,
                    coverageScope: editForm.coverageScope.trim() || undefined,
                },
            });
            setShowEditModal(false);
            refetch();
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to update contract');
        }
    };

    const handleAddAsset = async (assetId: string) => {
        if (!id) return;
        try {
            await addAssetMutation.mutateAsync({ id, data: { assetId } });
            setShowAddAsset(false);
            setAssetSearch('');
            refetch();
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to link asset');
        }
    };

    const handleRemoveAsset = async (assetId: string) => {
        if (!id) return;
        Alert.alert(
            'Remove Asset',
            'Are you sure you want to remove this asset from the contract?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeAssetMutation.mutateAsync({ id, assetId });
                            refetch();
                        } catch (err: any) {
                            Alert.alert('Error', err?.message || 'Failed to remove asset');
                        }
                    },
                },
            ]
        );
    };

    const openLogVisitModal = () => {
        setVisitForm({
            visitDate: '',
            vendorTechName: '',
            serviceReport: '',
            invoiceAmount: '',
        });
        setVisitErrors({});
        setShowVisitModal(true);
    };

    const handleLogVisit = async () => {
        if (!id) return;
        const errors: Record<string, string> = {};
        if (!visitForm.visitDate) errors.visitDate = 'Visit date is required';

        if (Object.keys(errors).length > 0) {
            setVisitErrors(errors);
            return;
        }

        setVisitErrors({});
        try {
            await logVisitMutation.mutateAsync({
                id,
                data: {
                    visitDate: visitForm.visitDate,
                    vendorTechName: visitForm.vendorTechName.trim() || undefined,
                    serviceReport: visitForm.serviceReport.trim() || undefined,
                    invoiceAmount: visitForm.invoiceAmount ? Number(visitForm.invoiceAmount) : undefined,
                },
            });
            setShowVisitModal(false);
            refetch();
            refetchUtil();
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to log visit');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <ScrollView
                contentContainerStyle={{ padding: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-600">Back</Text>
                        </Pressable>
                        {canManage && (
                            <Pressable onPress={openEditModal} style={{ paddingVertical: 8 }}>
                                <Text className="font-inter text-sm font-bold text-primary-600">Edit</Text>
                            </Pressable>
                        )}
                    </View>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white" style={{ marginTop: 8 }}>
                        {contract.name ?? 'Contract Detail'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text className="font-inter text-xs text-neutral-500">{contract.contractCode ?? ''} - {contract.contractType ?? ''}</Text>
                        {daysLeft !== null && (
                            <View style={[
                                styles.expiryBadge,
                                {
                                    backgroundColor: daysLeft < 0 ? colors.neutral[100] : daysLeft <= 30 ? colors.danger[50] : daysLeft <= 90 ? colors.warning[50] : colors.success[50],
                                },
                            ]}>
                                <Text className="font-inter text-[10px] font-bold" style={{
                                    color: daysLeft < 0 ? colors.neutral[500] : daysLeft <= 30 ? colors.danger[700] : daysLeft <= 90 ? colors.warning[700] : colors.success[700],
                                }}>
                                    {daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
                                </Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* Info cards — match web: Type | Period | Calls | Value */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.cardsRow}>
                    {[
                        { label: 'Type', value: contract.contractType ?? '---', accent: colors.info[700], exceeded: false },
                        { label: 'Calls Used', value: `${contract.callsUsed ?? 0} / ${contract.callLimit ?? 'Unlimited'}`, accent: callLimitExceeded ? colors.danger[600] : colors.success[700], exceeded: callLimitExceeded },
                        { label: 'Value', value: contract.contractValue ? Number(contract.contractValue).toLocaleString() : '---', accent: colors.warning[700], exceeded: false },
                        { label: 'Period', value: `${contract.startDate ? fmt.date(contract.startDate) : '---'} → ${contract.endDate ? fmt.date(contract.endDate) : '---'}`, accent: colors.primary[600], exceeded: false },
                    ].map((c, i) => (
                        <View key={i} style={[
                            styles.infoCard,
                            {
                                backgroundColor: c.exceeded ? (isDark ? '#2D0A0A' : '#FFF5F5') : (isDark ? '#1A1730' : colors.white),
                                borderColor: c.exceeded ? colors.danger[200] : colors.neutral[100],
                            },
                        ]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: c.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</Text>
                                {c.exceeded && <Text style={{ fontSize: 9, fontWeight: '800', color: colors.danger[600] }}>⚠ EXCEEDED</Text>}
                            </View>
                            <Text
                                style={[
                                    { marginTop: 3, fontSize: 11, fontWeight: '700', fontFamily: 'Inter' },
                                    { color: c.exceeded ? colors.danger[600] : (isDark ? colors.white : colors.primary[950]) },
                                ]}
                                numberOfLines={2}
                            >{c.value}</Text>
                        </View>
                    ))}
                </Animated.View>

                {/* Call limit exceeded banner */}
                {callLimitExceeded && (
                    <Animated.View entering={FadeInUp.duration(300)} style={styles.warningBanner}>
                        <Text style={{ fontSize: 16, lineHeight: 20 }}>⚠️</Text>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', fontFamily: 'Inter', color: colors.danger[700] }}>Call Limit Exceeded</Text>
                            <Text style={{ fontSize: 11, fontFamily: 'Inter', color: colors.danger[600], marginTop: 2, lineHeight: 16 }}>
                                {contract.callsUsed} calls used out of {contract.callLimit} allowed. Contact the vendor to review the contract terms.
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Tabs */}
                <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.tabRow}>
                    {tabs.map((tab) => (
                        <Pressable
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[
                                styles.tab,
                                {
                                    backgroundColor: activeTab === tab ? (isDark ? colors.primary[900] : colors.primary[50]) : 'transparent',
                                },
                            ]}
                        >
                            <Text className="font-inter text-xs font-bold" style={{ color: activeTab === tab ? colors.primary[700] : colors.neutral[500], textTransform: 'capitalize' }}>
                                {tab}
                            </Text>
                        </Pressable>
                    ))}
                </Animated.View>

                {/* Tab content */}
                {activeTab === 'info' && (
                    <Animated.View entering={FadeInUp.duration(300)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <View style={{ gap: 16 }}>
                            {/* Row 1: Vendor + Contract Type */}
                            <View style={{ flexDirection: 'row', gap: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Vendor</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" style={{ marginTop: 3 }}>{contract.vendorName ?? '---'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Contract Type</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" style={{ marginTop: 3 }}>{contract.contractType ?? '---'}</Text>
                                </View>
                            </View>
                            {/* Row 2: Vendor Contact */}
                            <View>
                                <Text style={styles.fieldLabel}>Vendor Contact</Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" style={{ marginTop: 3 }}>{contract.vendorContact ?? '---'}</Text>
                            </View>
                            {/* Row 3: Period */}
                            <View style={{ flexDirection: 'row', gap: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Start Date</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" style={{ marginTop: 3 }}>{contract.startDate ? fmt.date(contract.startDate) : '---'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>End Date</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" style={{ marginTop: 3 }}>{contract.endDate ? fmt.date(contract.endDate) : '---'}</Text>
                                </View>
                            </View>
                            {/* Coverage Scope */}
                            <View>
                                <Text style={styles.fieldLabel}>Coverage Scope</Text>
                                <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400" style={{ marginTop: 3, lineHeight: 20 }}>{contract.coverageScope ?? '---'}</Text>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {activeTab === 'assets' && (
                    <Animated.View entering={FadeInUp.duration(300)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text className="font-inter text-sm font-bold text-neutral-700 dark:text-neutral-300">
                                Linked Assets ({linkedAssets.length})
                            </Text>
                            {canManage && (
                                <Pressable onPress={() => setShowAddAsset(true)} style={styles.addAssetBtn}>
                                    <Text className="font-inter text-[10px] font-bold text-primary-700">+ Add Asset</Text>
                                </Pressable>
                            )}
                        </View>
                        {linkedAssets.length === 0 ? (
                            <EmptyState icon="search" title="No assets linked" message="Add assets covered by this contract." />
                        ) : (
                            linkedAssets.map((a: any, i: number) => (
                                <View key={i} style={[styles.assetItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{a.asset?.name ?? a.name ?? '---'}</Text>
                                        <Text className="font-inter text-[10px] text-neutral-400">{a.asset?.assetNumber ?? a.assetNumber ?? ''}</Text>
                                    </View>
                                    {canManage && (
                                        <Pressable onPress={() => handleRemoveAsset(a.assetId ?? a.id)} style={{ padding: 6 }}>
                                            <Text className="font-inter text-xs text-danger-500 font-bold">Remove</Text>
                                        </Pressable>
                                    )}
                                </View>
                            ))
                        )}
                    </Animated.View>
                )}

                {activeTab === 'visits' && (
                    <Animated.View entering={FadeInUp.duration(300)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text className="font-inter text-sm font-bold text-neutral-700 dark:text-neutral-300">
                                Visit Log ({visits.length})
                            </Text>
                            {canManage && (
                                <Pressable onPress={openLogVisitModal} style={styles.addAssetBtn}>
                                    <Text className="font-inter text-[10px] font-bold text-primary-700">+ Log Visit</Text>
                                </Pressable>
                            )}
                        </View>
                        {visits.length === 0 ? (
                            <EmptyState icon="search" title="No visits logged" message="Log a vendor visit to track usage." />
                        ) : (
                            visits.map((v: any, i: number) => (
                                <View key={i} style={styles.visitItem}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">{v.vendorTechName ?? '---'}</Text>
                                        <Text className="font-inter text-[10px] text-neutral-400">{v.visitDate ? fmt.date(v.visitDate) : '---'}</Text>
                                    </View>
                                    {v.serviceReport ? <Text className="font-inter text-[10px] text-neutral-500" numberOfLines={2} style={{ marginTop: 4 }}>{v.serviceReport}</Text> : null}
                                    {v.invoiceAmount ? <Text className="font-inter text-xs font-bold text-primary-700 dark:text-primary-400" style={{ marginTop: 4 }}>Cost: {Number(v.invoiceAmount).toLocaleString()}</Text> : null}
                                </View>
                            ))
                        )}
                    </Animated.View>
                )}

                {activeTab === 'utilisation' && (
                    <Animated.View entering={FadeInUp.duration(300)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <View style={{ gap: 20 }}>
                            {/* Calls used bar */}
                            <View>
                                <Text className="font-inter text-[10px] text-neutral-400 uppercase">Calls Used</Text>
                                <View style={styles.barContainer}>
                                    <View style={[styles.barBg, { backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
                                        <View style={[styles.barFill, {
                                            width: `${Math.min(callsPct, 100)}%`,
                                            backgroundColor: callLimitExceeded ? colors.danger[500] : callsPct >= 90 ? colors.danger[500] : callsPct >= 70 ? colors.warning[500] : colors.primary[500],
                                        }]} />
                                    </View>
                                    <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: 'Inter', color: callLimitExceeded ? colors.danger[600] : (isDark ? colors.neutral[300] : colors.neutral[700]) }}>
                                        {callLimitExceeded ? '100%+' : `${callsPct}%`}
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 10, fontFamily: 'Inter', marginTop: 2, fontWeight: callLimitExceeded ? '700' : '400', color: callLimitExceeded ? colors.danger[600] : colors.neutral[400] }}>
                                    {contract.callsUsed ?? 0} of {contract.callLimit ?? 'Unlimited'}{callLimitExceeded ? ' — Limit exceeded!' : ''}
                                </Text>
                            </View>
                            {/* Cost claimed bar */}
                            <View>
                                <Text className="font-inter text-[10px] text-neutral-400 uppercase">Cost Claimed</Text>
                                <View style={styles.barContainer}>
                                    <View style={[styles.barBg, { backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
                                        <View style={[styles.barFill, { width: `${costPct}%`, backgroundColor: costPct >= 90 ? colors.danger[500] : costPct >= 70 ? colors.warning[500] : colors.success[500] }]} />
                                    </View>
                                    <Text className="font-inter text-xs font-bold text-neutral-700 dark:text-neutral-300">{costPct.toFixed(1)}%</Text>
                                </View>
                                <Text style={{ fontSize: 10, fontFamily: 'Inter', marginTop: 2, fontWeight: '400', color: colors.neutral[400] }}>
                                    {effectiveCostClaimed > 0 ? Number(effectiveCostClaimed).toLocaleString() : '0'} of {contract.contractValue ? Number(contract.contractValue).toLocaleString() : '---'}
                                    {usingCostFallback ? ' *' : ''}
                                </Text>
                                {usingCostFallback && (
                                    <Text style={{ fontSize: 9, fontFamily: 'Inter', color: colors.warning[500], marginTop: 2 }}>* Computed from visit invoices</Text>
                                )}
                            </View>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* ============ EDIT CONTRACT MODAL ============ */}
            <RNModal visible={showEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                            <Pressable onPress={() => setShowEditModal(false)}>
                                <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                            </Pressable>
                            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Edit Contract</Text>
                            <View style={{ width: 52 }} />
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <Input
                                label="Name"
                                placeholder="E.g. Acme Compressor AMC"
                                value={editForm.name}
                                onChangeText={(v) => setEditForm({ ...editForm, name: v })}
                                error={editFormErrors.name}
                            />
                            
                            <DropdownField
                                label="Contract Type"
                                options={CONTRACT_TYPES}
                                selected={editForm.contractType}
                                onSelect={(v) => setEditForm({ ...editForm, contractType: v })}
                            />
                            
                            <Input
                                label="Vendor Name"
                                placeholder="E.g. Acme Corp"
                                value={editForm.vendorName}
                                onChangeText={(v) => setEditForm({ ...editForm, vendorName: v })}
                            />
                            
                            <DatePickerField
                                label="Start Date"
                                required
                                value={editForm.startDate}
                                onChange={(v) => setEditForm({ ...editForm, startDate: v })}
                                error={editFormErrors.startDate}
                            />
                            
                            <DatePickerField
                                label="End Date"
                                required
                                value={editForm.endDate}
                                onChange={(v) => setEditForm({ ...editForm, endDate: v })}
                                error={editFormErrors.endDate}
                            />
                            
                            <Input
                                label="Call Limit"
                                placeholder="E.g. 10 (leave empty for unlimited)"
                                keyboardType="numeric"
                                value={editForm.callLimit}
                                onChangeText={(v) => setEditForm({ ...editForm, callLimit: v })}
                            />
                            
                            <Input
                                label="Contract Value"
                                placeholder="E.g. 50000"
                                keyboardType="numeric"
                                value={editForm.contractValue}
                                onChangeText={(v) => setEditForm({ ...editForm, contractValue: v })}
                            />
                            
                            <Input
                                label="Coverage Scope"
                                placeholder="Describe inclusions, safety terms, etc."
                                multiline
                                numberOfLines={3}
                                style={{ height: 80, textAlignVertical: 'top' }}
                                value={editForm.coverageScope}
                                onChangeText={(v) => setEditForm({ ...editForm, coverageScope: v })}
                            />
                        </ScrollView>

                        <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                            <Pressable
                                style={({ pressed }) => [sheetStyles.submitBtn, pressed && { opacity: 0.85 }, updateMutation.isPending && { opacity: 0.6 }]}
                                onPress={handleUpdate}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                                    <Text className="font-inter text-base font-bold text-white">Save Changes</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </RNModal>

            {/* ============ ADD ASSET MODAL ============ */}
            <RNModal visible={showAddAsset} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddAsset(false)}>
                <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                        <Pressable onPress={() => setShowAddAsset(false)}>
                            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Add Asset</Text>
                        <View style={{ width: 52 }} />
                    </View>

                    <View style={{ padding: 20, gap: 12 }}>
                        <Input
                            label="Search Assets"
                            placeholder="Type asset name or number..."
                            value={assetSearch}
                            onChangeText={setAssetSearch}
                        />
                    </View>

                    <FlatList
                        data={searchAssets}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
                        renderItem={({ item: a }) => (
                            <Pressable
                                onPress={() => handleAddAsset(a.id)}
                                disabled={addAssetMutation.isPending}
                                style={[styles.assetSelectItem, { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{a.name}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-400">{a.assetNumber}</Text>
                                </View>
                                <Text className="font-inter text-xs text-primary-600 font-bold">+ Link</Text>
                            </Pressable>
                        )}
                        ListEmptyComponent={
                            <Text className="font-inter text-sm text-neutral-400 py-6 text-center">
                                No assets found.
                            </Text>
                        }
                    />
                </View>
            </RNModal>

            {/* ============ LOG VISIT MODAL ============ */}
            <RNModal visible={showVisitModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowVisitModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                            <Pressable onPress={() => setShowVisitModal(false)}>
                                <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                            </Pressable>
                            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Log Visit</Text>
                            <View style={{ width: 52 }} />
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <DatePickerField
                                label="Visit Date"
                                required
                                value={visitForm.visitDate}
                                onChange={(v) => setVisitForm({ ...visitForm, visitDate: v })}
                                error={visitErrors.visitDate}
                            />

                            <Input
                                label="Technician Name"
                                placeholder="E.g. John Doe"
                                value={visitForm.vendorTechName}
                                onChangeText={(v) => setVisitForm({ ...visitForm, vendorTechName: v })}
                            />

                            <Input
                                label="Service Report Notes"
                                placeholder="Describe service activities performed..."
                                multiline
                                numberOfLines={4}
                                style={{ height: 100, textAlignVertical: 'top' }}
                                value={visitForm.serviceReport}
                                onChangeText={(v) => setVisitForm({ ...visitForm, serviceReport: v })}
                            />

                            <Input
                                label="Invoice Amount"
                                placeholder="E.g. 1500 (if any)"
                                keyboardType="numeric"
                                value={visitForm.invoiceAmount}
                                onChangeText={(v) => setVisitForm({ ...visitForm, invoiceAmount: v })}
                            />
                        </ScrollView>

                        <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                            <Pressable
                                style={({ pressed }) => [sheetStyles.submitBtn, pressed && { opacity: 0.85 }, logVisitMutation.isPending && { opacity: 0.6 }]}
                                onPress={handleLogVisit}
                                disabled={logVisitMutation.isPending}
                            >
                                {logVisitMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                                    <Text className="font-inter text-base font-bold text-white">Log Visit</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </RNModal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    expiryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
    cardsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
    },
    infoCard: {
        flex: 1,
        minWidth: '45%',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#FFF5F5',
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'Inter',
        color: colors.neutral[400],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tabRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 20,
        backgroundColor: colors.neutral[100],
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    section: {
        marginTop: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    addAssetBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
    },
    assetItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    assetSelectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    visitItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    barContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    barBg: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },
});

const sheetStyles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    submitContainer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    submitBtn: {
        backgroundColor: colors.primary[600],
        borderRadius: 14,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});

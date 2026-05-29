import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, RefreshControl, StyleSheet, View, Modal as RNModal, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { contractListHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useContracts } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import { useCanPerform } from '@/hooks/use-can-perform';
import { useCreateContract } from '@/features/maintenance/api/use-maintenance-mutations';
import { Input } from '@/components/ui/input';
import { DropdownField } from '@/components/ui/dropdown-field';
import { DatePickerField } from '@/components/ui/date-picker';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

/* ── Type config ── */

const TYPE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    WARRANTY: { label: 'Warranty', bgColor: colors.info[50], textColor: colors.info[700] },
    AMC: { label: 'AMC', bgColor: colors.accent[50], textColor: colors.accent[700] },
    CAMC: { label: 'CAMC', bgColor: colors.success[50], textColor: colors.success[700] },
    RENTAL: { label: 'Rental', bgColor: colors.warning[50], textColor: colors.warning[700] },
    SERVICE: { label: 'Service', bgColor: '#ECFDF5', textColor: '#047857' },
};

const CONTRACT_TYPES = [
    { id: 'WARRANTY', name: 'Warranty' },
    { id: 'AMC', name: 'AMC' },
    { id: 'CAMC', name: 'CAMC' },
    { id: 'RENTAL', name: 'Rental' },
    { id: 'SERVICE', name: 'Service' },
];

function ContractTypeBadge({ type }: { type: string }) {
    const cfg = TYPE_CONFIG[type] ?? { label: type, bgColor: colors.neutral[100], textColor: colors.neutral[600] };
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Expiry badge ── */

function ExpiryBadge({ endDate }: { endDate: string }) {
    if (!endDate) return null;
    const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    let bgColor = colors.success[50];
    let textColor = colors.success[700];
    let label = `${daysLeft}d`;

    if (daysLeft < 0) { bgColor = colors.neutral[100]; textColor = colors.neutral[500]; label = 'Expired'; }
    else if (daysLeft <= 30) { bgColor = colors.danger[50]; textColor = colors.danger[700]; }
    else if (daysLeft <= 90) { bgColor = colors.warning[50]; textColor = colors.warning[700]; }

    return (
        <View style={[badgeStyles.badge, { backgroundColor: bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: textColor }]}>{label}</Text>
        </View>
    );
}

/* ── Filters ── */

const CONTRACT_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'WARRANTY', label: 'Warranty' },
    { key: 'AMC', label: 'AMC' },
    { key: 'CAMC', label: 'CAMC' },
    { key: 'RENTAL', label: 'Rental' },
    { key: 'SERVICE', label: 'Service' },
];

/* ── Card ── */

function ContractCard({
    item,
    index,
    isDark,
    onPress,
    fmt,
}: {
    item: any;
    index: number;
    isDark: boolean;
    onPress: () => void;
    fmt: CompanyFormatter;
}) {
    const callsExceeded = item.callLimit != null && (item.callsUsed ?? 0) > item.callLimit;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable
                onPress={onPress}
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: callsExceeded
                            ? colors.danger[300]
                            : (isDark ? colors.primary[900] : colors.primary[50]),
                        borderWidth: callsExceeded ? 1.5 : 1,
                    },
                ]}
            >
                <View style={cardStyles.headerRow}>
                    <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-info-700">
                            {item.contractCode ?? 'CTR'}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {callsExceeded && (
                            <View style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 100, backgroundColor: colors.danger[50], borderWidth: 1, borderColor: colors.danger[200] }}>
                                <Text style={{ fontSize: 9, fontWeight: '800', color: colors.danger[700] }}>⚠ Exceeded</Text>
                            </View>
                        )}
                        <ExpiryBadge endDate={item.endDate} />
                    </View>
                </View>

                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ marginTop: 8 }}>
                    {item.name ?? 'Unnamed Contract'}
                </Text>

                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1} style={{ marginTop: 4 }}>
                    {item.vendorName ?? 'No vendor'}
                </Text>

                <View style={cardStyles.detailsRow}>
                    <ContractTypeBadge type={item.contractType ?? 'AMC'} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: callsExceeded ? colors.danger[600] : colors.neutral[400] }}>
                        {item.callsUsed ?? 0}/{item.callLimit ?? '∞'} calls
                    </Text>
                    <Text className="font-inter text-[10px] text-neutral-400" style={{ marginLeft: 'auto' }}>
                        {item.startDate ? fmt.date(item.startDate) : ''} - {item.endDate ? fmt.date(item.endDate) : ''}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

/* ── Screen ── */

export function ContractListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');

    const canCreate = useCanPerform('maintenance:create');
    const createMutation = useCreateContract();
    const [showModal, setShowModal] = React.useState(false);
    const [form, setForm] = React.useState({
        name: '',
        contractType: 'AMC',
        vendorName: '',
        startDate: '',
        endDate: '',
        callLimit: '',
        contractValue: '',
        coverageScope: '',
    });
    const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

    const typeParam = activeFilter === 'all' ? undefined : activeFilter;
    const { data: response, isLoading, error, refetch, isFetching } = useContracts({
        search: search.trim() || undefined,
        contractType: typeParam,
    });

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <ContractCard
            item={item}
            index={index}
            isDark={isDark}
            fmt={fmt}
            onPress={() => router.push({ pathname: '/maintenance/contract-detail' as any, params: { id: item.id } })}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader
                    title="Contracts"
                    subtitle={`${totalCount} contract${totalCount !== 1 ? 's' : ''}`}
                    onMenuPress={toggle}
                    rightSlot={<HelpDrawer help={contractListHelp} />}
                />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search contracts..."
                    filters={CONTRACT_FILTERS}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={{ paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        }
        if (error) {
            return (
                <View style={{ paddingTop: 40 }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load contracts"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return <EmptyState icon="search" title="No contracts found" message="Add a maintenance contract to get started." />;
    };

    const handleSave = async () => {
        const errors: Record<string, string> = {};
        if (!form.name.trim()) errors.name = 'Contract name is required';
        if (!form.startDate) errors.startDate = 'Start date is required';
        if (!form.endDate) errors.endDate = 'End date is required';
        
        if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
            errors.endDate = 'End date must be after start date';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});
        try {
            await createMutation.mutateAsync({
                name: form.name.trim(),
                contractType: form.contractType,
                vendorName: form.vendorName.trim() || undefined,
                startDate: form.startDate,
                endDate: form.endDate,
                callLimit: form.callLimit ? Number(form.callLimit) : undefined,
                contractValue: form.contractValue ? Number(form.contractValue) : undefined,
                coverageScope: form.coverageScope.trim() || undefined,
            });
            setShowModal(false);
            setForm({
                name: '',
                contractType: 'AMC',
                vendorName: '',
                startDate: '',
                endDate: '',
                callLimit: '',
                contractValue: '',
                coverageScope: '',
            });
            refetch();
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to create contract');
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
            <FlashList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => refetch()}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            />

            {canCreate && (
                <FAB onPress={() => { setFormErrors({}); setShowModal(true); }} />
            )}

            <RNModal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                            <Pressable onPress={() => setShowModal(false)}>
                                <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                            </Pressable>
                            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Add Contract</Text>
                            <View style={{ width: 52 }} />
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <Input
                                label="Name"
                                placeholder="E.g. Acme Compressor AMC"
                                value={form.name}
                                onChangeText={(v) => setForm({ ...form, name: v })}
                                error={formErrors.name}
                            />
                            
                            <DropdownField
                                label="Contract Type"
                                options={CONTRACT_TYPES}
                                selected={form.contractType}
                                onSelect={(v) => setForm({ ...form, contractType: v })}
                            />
                            
                            <Input
                                label="Vendor Name"
                                placeholder="E.g. Acme Corp"
                                value={form.vendorName}
                                onChangeText={(v) => setForm({ ...form, vendorName: v })}
                            />
                            
                            <DatePickerField
                                label="Start Date"
                                required
                                value={form.startDate}
                                onChange={(v) => setForm({ ...form, startDate: v })}
                                error={formErrors.startDate}
                            />
                            
                            <DatePickerField
                                label="End Date"
                                required
                                value={form.endDate}
                                onChange={(v) => setForm({ ...form, endDate: v })}
                                error={formErrors.endDate}
                            />
                            
                            <Input
                                label="Call Limit"
                                placeholder="E.g. 10 (leave empty for unlimited)"
                                keyboardType="numeric"
                                value={form.callLimit}
                                onChangeText={(v) => setForm({ ...form, callLimit: v })}
                            />
                            
                            <Input
                                label="Contract Value"
                                placeholder="E.g. 50000"
                                keyboardType="numeric"
                                value={form.contractValue}
                                onChangeText={(v) => setForm({ ...form, contractValue: v })}
                            />
                            
                            <Input
                                label="Coverage Scope"
                                placeholder="Describe inclusions, safety terms, etc."
                                multiline
                                numberOfLines={3}
                                style={{ height: 80, textAlignVertical: 'top' }}
                                value={form.coverageScope}
                                onChangeText={(v) => setForm({ ...form, coverageScope: v })}
                            />
                        </ScrollView>

                        <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                            <Pressable
                                style={({ pressed }) => [sheetStyles.submitBtn, pressed && { opacity: 0.85 }, createMutation.isPending && { opacity: 0.6 }]}
                                onPress={handleSave}
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                                    <Text className="font-inter text-base font-bold text-white">Create Contract</Text>
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
    searchSection: { paddingHorizontal: 24, paddingVertical: 16 },
});

const badgeStyles = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
    label: { fontSize: 10, fontWeight: '700' },
});

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    codeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 8,
        flexWrap: 'wrap',
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

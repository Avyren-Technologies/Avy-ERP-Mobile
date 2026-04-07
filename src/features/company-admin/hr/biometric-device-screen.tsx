/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
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
import { FAB } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useCreateBiometricDevice,
    useDeleteBiometricDevice,
    useSyncBiometricDevice,
    useTestBiometricDevice,
    useUpdateBiometricDevice,
} from '@/features/company-admin/api/use-biometric-mutations';
import { useBiometricDevices } from '@/features/company-admin/api/use-biometric-queries';

// ============ TYPES ============

interface BiometricDevice {
    id: string;
    name: string;
    brand: string;
    deviceId: string;
    ip: string;
    port: number;
    status: string;
    syncMode: string;
    syncInterval: number;
    lastSyncAt: string;
    locationId: string;
}

const BRANDS = ['ZKTeco', 'ESSL', 'Realtime', 'BioEnable', 'Mantra'];
const SYNC_MODES = ['PUSH', 'PULL', 'BIDIRECTIONAL'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: colors.success[50], text: 'text-success-700' },
    ONLINE: { bg: colors.success[50], text: 'text-success-700' },
    OFFLINE: { bg: colors.danger[50], text: 'text-danger-600' },
    ERROR: { bg: colors.warning[50], text: 'text-warning-700' },
};

// ============ HELPERS ============

// formatSyncTime removed — use fmt.dateTime() from useCompanyFormatter inside components

// ============ STATUS BADGE ============

function StatusBadge({ status }: { status: string }) {
    const c = STATUS_COLORS[status?.toUpperCase()] ?? STATUS_COLORS.OFFLINE;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{status}</Text>
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
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ STATS HEADER ============

function StatsHeader({ devices }: { devices: BiometricDevice[] }) {
    const total = devices.length;
    const online = devices.filter(d => d.status === 'ACTIVE' || d.status === 'ONLINE').length;
    const offline = devices.filter(d => d.status === 'OFFLINE').length;

    return (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {[
                { label: 'Total', value: total, color: colors.primary[50], textColor: 'text-primary-700' },
                { label: 'Online', value: online, color: colors.success[50], textColor: 'text-success-700' },
                { label: 'Offline', value: offline, color: colors.danger[50], textColor: 'text-danger-600' },
            ].map(stat => (
                <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.color }]}>
                    <Text className={`font-inter text-lg font-bold ${stat.textColor}`}>{stat.value}</Text>
                    <Text className="font-inter text-[10px] text-neutral-500">{stat.label}</Text>
                </View>
            ))}
        </View>
    );
}

// ============ FORM MODAL ============

function DeviceFormModal({
    visible,
    onClose,
    onSave,
    initialData,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: BiometricDevice | null;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [brand, setBrand] = React.useState('ZKTeco');
    const [deviceId, setDeviceId] = React.useState('');
    const [ip, setIp] = React.useState('');
    const [port, setPort] = React.useState('4370');
    const [syncMode, setSyncMode] = React.useState('PULL');
    const [syncInterval, setSyncInterval] = React.useState('15');
    const [locationId, setLocationId] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name);
                setBrand(initialData.brand);
                setDeviceId(initialData.deviceId);
                setIp(initialData.ip);
                setPort(String(initialData.port ?? '4370'));
                setSyncMode(initialData.syncMode ?? 'PULL');
                setSyncInterval(String(initialData.syncInterval ?? '15'));
                setLocationId(initialData.locationId ?? '');
            } else {
                setName(''); setBrand('ZKTeco'); setDeviceId(''); setIp('');
                setPort('4370'); setSyncMode('PULL'); setSyncInterval('15'); setLocationId('');
            }
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!name.trim() || !deviceId.trim() || !ip.trim()) return;
        onSave({
            name: name.trim(), brand, deviceId: deviceId.trim(),
            ip: ip.trim(), port: Number(port), syncMode,
            syncInterval: Number(syncInterval), locationId: locationId.trim() || undefined,
        });
    };

    const isValid = name.trim() && deviceId.trim() && ip.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Device' : 'Add Device'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Device Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Main Gate Scanner" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <ChipSelector label="Brand" options={BRANDS} value={brand} onSelect={setBrand} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Device ID <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. ZK-001" placeholderTextColor={colors.neutral[400]} value={deviceId} onChangeText={setDeviceId} /></View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 2 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">IP Address <Text className="text-danger-500">*</Text></Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="192.168.1.100" placeholderTextColor={colors.neutral[400]} value={ip} onChangeText={setIp} keyboardType="numeric" /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Port</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="4370" placeholderTextColor={colors.neutral[400]} value={port} onChangeText={setPort} keyboardType="numeric" /></View>
                            </View>
                        </View>
                        <ChipSelector label="Sync Mode" options={SYNC_MODES} value={syncMode} onSelect={setSyncMode} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Sync Interval (min)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="15" placeholderTextColor={colors.neutral[400]} value={syncInterval} onChangeText={setSyncInterval} keyboardType="numeric" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Location ID</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Optional" placeholderTextColor={colors.neutral[400]} value={locationId} onChangeText={setLocationId} /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Device'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ DEVICE CARD ============

function DeviceCard({ item, index, onEdit, onDelete, onTest, onSync, isTesting, isSyncing }: {
    item: BiometricDevice; index: number; onEdit: () => void; onDelete: () => void;
    onTest: () => void; onSync: () => void; isTesting: boolean; isSyncing: boolean;
}) {
    const fmt = useCompanyFormatter();
    const formatSyncTime = (d: string) => fmt.dateTime(d);
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <StatusBadge status={item.status ?? 'OFFLINE'} />
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">{item.brand} | {item.deviceId}</Text>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">IP: {item.ip}:{item.port}</Text>
                    </View>
                    {item.lastSyncAt && (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500">Sync: {formatSyncTime(item.lastSyncAt)}</Text>
                        </View>
                    )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Pressable onPress={onTest} disabled={isTesting} style={[styles.actionBtn, { backgroundColor: colors.accent[50] }]}>
                        <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={colors.accent[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="font-inter text-[10px] font-bold text-accent-700">{isTesting ? 'Testing...' : 'Test'}</Text>
                    </Pressable>
                    <Pressable onPress={onSync} disabled={isSyncing} style={[styles.actionBtn, { backgroundColor: colors.success[50] }]}>
                        <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="font-inter text-[10px] font-bold text-success-700">{isSyncing ? 'Syncing...' : 'Sync'}</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function BiometricDeviceScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<BiometricDevice | null>(null);
    const [testingId, setTestingId] = React.useState<string | null>(null);
    const [syncingId, setSyncingId] = React.useState<string | null>(null);

    const { data: response, isLoading, error, refetch, isFetching } = useBiometricDevices();
    const createMutation = useCreateBiometricDevice();
    const updateMutation = useUpdateBiometricDevice();
    const deleteMutation = useDeleteBiometricDevice();
    const testMutation = useTestBiometricDevice();
    const syncMutation = useSyncBiometricDevice();

    const devices: BiometricDevice[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            brand: item.brand ?? '',
            deviceId: item.deviceId ?? '',
            ip: item.ip ?? '',
            port: item.port ?? 4370,
            status: item.status ?? 'OFFLINE',
            syncMode: item.syncMode ?? 'PULL',
            syncInterval: item.syncInterval ?? 15,
            lastSyncAt: item.lastSyncAt ?? '',
            locationId: item.locationId ?? '',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return devices;
        const q = search.toLowerCase();
        return devices.filter(d => d.name.toLowerCase().includes(q) || d.brand.toLowerCase().includes(q) || d.deviceId.toLowerCase().includes(q));
    }, [devices, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: BiometricDevice) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: BiometricDevice) => {
        showConfirm({
            title: 'Delete Device',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Record<string, unknown>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data as any, { onSuccess: () => setFormVisible(false) });
        }
    };

    const handleTest = (item: BiometricDevice) => {
        setTestingId(item.id);
        testMutation.mutate(item.id, { onSettled: () => setTestingId(null) });
    };

    const handleSync = (item: BiometricDevice) => {
        setSyncingId(item.id);
        syncMutation.mutate(item.id, { onSettled: () => setSyncingId(null) });
    };

    const renderItem = ({ item, index }: { item: BiometricDevice; index: number }) => (
        <DeviceCard
            item={item} index={index}
            onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)}
            onTest={() => handleTest(item)} onSync={() => handleSync(item)}
            isTesting={testingId === item.id} isSyncing={syncingId === item.id}
        />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View>
                <Text className="font-inter text-2xl font-bold text-primary-950">Biometric Devices</Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500">{devices.length} device{devices.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={{ marginTop: 16 }}>
                <StatsHeader devices={devices} />
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search devices..." />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load devices" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No devices match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No devices yet" message="Add a biometric device to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Biometric Devices" onMenuPress={toggle} />
            <FlashList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <DeviceFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />
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
    statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

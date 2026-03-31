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
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import {
    useCreateAsset,
    useCreateAssetAssignment,
    useCreateAssetCategory,
    useDeleteAssetCategory,
    useUpdateAsset,
    useUpdateAssetAssignment,
    useUpdateAssetCategory,
} from '@/features/company-admin/api/use-recruitment-mutations';
import { useAssetAssignments, useAssetCategories, useAssets } from '@/features/company-admin/api/use-recruitment-queries';

// ============ TYPES ============

type AssetCondition = 'New' | 'Good' | 'Fair' | 'Poor' | 'Damaged';
type AssetStatus = 'Available' | 'Assigned' | 'Under Repair' | 'Disposed';
type Tab = 'categories' | 'inventory' | 'assignments';

interface CategoryItem {
    id: string;
    name: string;
    depreciationRate: number;
    assetCount: number;
}

interface AssetItem {
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
    serialNumber: string;
    condition: AssetCondition;
    status: AssetStatus;
    purchaseDate: string;
    purchaseCost: number;
}

interface AssignmentItem {
    id: string;
    assetId: string;
    assetName: string;
    employeeId: string;
    employeeName: string;
    issueDate: string;
    returnDate: string;
    returnCondition: string;
    isReturned: boolean;
}

// ============ CONSTANTS ============

const CONDITION_COLORS: Record<AssetCondition, { bg: string; text: string }> = {
    New: { bg: colors.success[50], text: colors.success[700] },
    Good: { bg: colors.primary[50], text: colors.primary[700] },
    Fair: { bg: colors.warning[50], text: colors.warning[700] },
    Poor: { bg: colors.danger[50], text: colors.danger[700] },
    Damaged: { bg: colors.danger[100], text: colors.danger[800] },
};

const ASSET_STATUS_COLORS: Record<AssetStatus, { bg: string; text: string; dot: string }> = {
    Available: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Assigned: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
    'Under Repair': { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    Disposed: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
};

const CONDITIONS: AssetCondition[] = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];
const ASSET_STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Under Repair', 'Disposed'];

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: AssetStatus }) {
    const s = ASSET_STATUS_COLORS[status] ?? ASSET_STATUS_COLORS.Available;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

function ConditionBadge({ condition }: { condition: AssetCondition }) {
    const c = CONDITION_COLORS[condition] ?? CONDITION_COLORS.Good;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{condition}</Text>
        </View>
    );
}

function AvatarCircle({ name }: { name: string }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
        <View style={styles.avatar}>
            <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
        </View>
    );
}

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

function Dropdown({
    label, value, options, onSelect, placeholder, required,
}: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; required?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');
    const filteredOptions = React.useMemo(() => {
        if (!searchText.trim()) return options;
        const q = searchText.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, searchText]);

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => { setOpen(true); setSearchText(''); }} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">{label}</Text>
                        <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                            <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={searchText} onChangeText={setSearchText} autoCapitalize="none" />
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filteredOptions.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                            {filteredOptions.length === 0 && <Text className="py-4 text-center font-inter text-sm text-neutral-400">No options found</Text>}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ CATEGORY FORM MODAL ============

function CategoryFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: CategoryItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [depreciationRate, setDepreciationRate] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) { setName(initialData.name); setDepreciationRate(String(initialData.depreciationRate || '')); }
            else { setName(''); setDepreciationRate(''); }
        }
    }, [visible, initialData]);

    const isValid = name.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">{initialData ? 'Edit Category' : 'New Category'}</Text>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Category Name <Text className="text-danger-500">*</Text></Text>
                        <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Laptops" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                    </View>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Depreciation Rate (%)</Text>
                        <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. 25" placeholderTextColor={colors.neutral[400]} value={depreciationRate} onChangeText={setDepreciationRate} keyboardType="decimal-pad" /></View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ name: name.trim(), depreciationRate: Number(depreciationRate) || 0 })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ ASSET FORM MODAL ============

function AssetFormModal({
    visible, onClose, onSave, initialData, categoryOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: AssetItem | null; categoryOptions: { id: string; label: string }[]; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [categoryId, setCategoryId] = React.useState('');
    const [serialNumber, setSerialNumber] = React.useState('');
    const [condition, setCondition] = React.useState<AssetCondition>('New');
    const [purchaseCost, setPurchaseCost] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name); setCategoryId(initialData.categoryId);
                setSerialNumber(initialData.serialNumber); setCondition(initialData.condition);
                setPurchaseCost(String(initialData.purchaseCost || ''));
            } else {
                setName(''); setCategoryId(''); setSerialNumber(''); setCondition('New'); setPurchaseCost('');
            }
        }
    }, [visible, initialData]);

    const isValid = name.trim() && categoryId;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">{initialData ? 'Edit Asset' : 'New Asset'}</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Asset Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. MacBook Pro 16" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <Dropdown label="Category" value={categoryId} options={categoryOptions} onSelect={setCategoryId} placeholder="Select category..." required />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Serial Number</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. SN-12345" placeholderTextColor={colors.neutral[400]} value={serialNumber} onChangeText={setSerialNumber} autoCapitalize="characters" /></View>
                        </View>
                        <ChipSelector label="Condition" options={[...CONDITIONS]} value={condition} onSelect={v => setCondition(v as AssetCondition)} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Purchase Cost</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={purchaseCost} onChangeText={setPurchaseCost} keyboardType="number-pad" /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ name: name.trim(), categoryId, categoryName: categoryOptions.find(c => c.id === categoryId)?.label ?? '', serialNumber: serialNumber.trim(), condition, status: 'Available', purchaseCost: Number(purchaseCost) || 0 })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ ASSIGN FORM MODAL ============

function AssignFormModal({
    visible, onClose, onSave, assetOptions, employeeOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    assetOptions: { id: string; label: string }[];
    employeeOptions: { id: string; label: string }[];
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [assetId, setAssetId] = React.useState('');
    const [employeeId, setEmployeeId] = React.useState('');
    const [issueDate, setIssueDate] = React.useState('');

    React.useEffect(() => {
        if (visible) { setAssetId(''); setEmployeeId(''); setIssueDate(new Date().toISOString().split('T')[0]); }
    }, [visible]);

    const isValid = assetId && employeeId && issueDate.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Assign Asset</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        <Dropdown label="Asset" value={assetId} options={assetOptions} onSelect={setAssetId} placeholder="Select asset..." required />
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Select employee..." required />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Issue Date <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={issueDate} onChangeText={setIssueDate} /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ assetId, assetName: assetOptions.find(a => a.id === assetId)?.label ?? '', employeeId, employeeName: employeeOptions.find(e => e.id === employeeId)?.label ?? '', issueDate: issueDate.trim(), isReturned: false })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Assigning...' : 'Assign'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARD COMPONENTS ============

function CategoryCard({ item, index, onEdit, onDelete }: {
    item: CategoryItem; index: number; onEdit: () => void; onDelete: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950">{item.name}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.assetCount} asset{item.assetCount !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: colors.primary[50] }]}>
                        <Text style={{ color: colors.primary[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.depreciationRate}% dep.</Text>
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

function AssetCard({ item, index, onEdit }: {
    item: AssetItem; index: number; onEdit: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.categoryName}</Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <ConditionBadge condition={item.condition} />
                    {item.serialNumber ? <Text className="font-inter text-xs text-neutral-400">S/N: {item.serialNumber}</Text> : null}
                    {item.purchaseCost > 0 && <Text className="font-inter text-xs text-neutral-400">{'\u20B9'}{item.purchaseCost.toLocaleString('en-IN')}</Text>}
                </View>
            </Pressable>
        </Animated.View>
    );
}

function AssignmentCard({ item, index, onReturn }: {
    item: AssignmentItem; index: number; onReturn: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={item.employeeName} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.assetName}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.employeeName}</Text>
                        </View>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: item.isReturned ? colors.success[50] : colors.info[50] }]}>
                        <Text style={{ color: item.isReturned ? colors.success[700] : colors.info[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>
                            {item.isReturned ? 'Returned' : 'Active'}
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <Text className="font-inter text-xs text-neutral-500">Issued: {item.issueDate}</Text>
                    {item.returnDate ? <Text className="font-inter text-xs text-neutral-500">Returned: {item.returnDate}</Text> : null}
                </View>
                {!item.isReturned && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onReturn} style={styles.returnBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M9 14l-4-4 4-4M5 10h11a4 4 0 010 8h-1" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-white">Return</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function AssetsScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [activeTab, setActiveTab] = React.useState<Tab>('categories');
    const [search, setSearch] = React.useState('');

    // Queries
    const { data: catResponse, isLoading: catLoading, error: catError, refetch: catRefetch, isFetching: catFetching } = useAssetCategories();
    const { data: assResponse, isLoading: assLoading, error: assError, refetch: assRefetch, isFetching: assFetching } = useAssets();
    const { data: asgResponse, isLoading: asgLoading, error: asgError, refetch: asgRefetch, isFetching: asgFetching } = useAssetAssignments();
    const { data: empResponse } = useEmployees();

    // Mutations
    const createCat = useCreateAssetCategory();
    const updateCat = useUpdateAssetCategory();
    const deleteCat = useDeleteAssetCategory();
    const createAss = useCreateAsset();
    const updateAss = useUpdateAsset();
    const createAsg = useCreateAssetAssignment();
    const updateAsg = useUpdateAssetAssignment();

    // Modals
    const [catFormVisible, setCatFormVisible] = React.useState(false);
    const [editingCat, setEditingCat] = React.useState<CategoryItem | null>(null);
    const [assFormVisible, setAssFormVisible] = React.useState(false);
    const [editingAss, setEditingAss] = React.useState<AssetItem | null>(null);
    const [asgFormVisible, setAsgFormVisible] = React.useState(false);

    // Parse data
    const categories: CategoryItem[] = React.useMemo(() => {
        const raw = (catResponse as any)?.data ?? catResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', name: item.name ?? '', depreciationRate: item.depreciationRate ?? 0, assetCount: item.assetCount ?? 0,
        }));
    }, [catResponse]);

    const assets: AssetItem[] = React.useMemo(() => {
        const raw = (assResponse as any)?.data ?? assResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', name: item.name ?? '', categoryId: item.categoryId ?? '', categoryName: item.categoryName ?? '',
            serialNumber: item.serialNumber ?? '', condition: item.condition ?? 'Good', status: item.status ?? 'Available',
            purchaseDate: item.purchaseDate ?? '', purchaseCost: item.purchaseCost ?? 0,
        }));
    }, [assResponse]);

    const assignments: AssignmentItem[] = React.useMemo(() => {
        const raw = (asgResponse as any)?.data ?? asgResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', assetId: item.assetId ?? '', assetName: item.assetName ?? '',
            employeeId: item.employeeId ?? '', employeeName: item.employeeName ?? '',
            issueDate: item.issueDate ?? '', returnDate: item.returnDate ?? '',
            returnCondition: item.returnCondition ?? '', isReturned: item.isReturned ?? false,
        }));
    }, [asgResponse]);

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const categoryOptions = React.useMemo(() => categories.map(c => ({ id: c.id, label: c.name })), [categories]);
    const assetOptions = React.useMemo(() => assets.filter(a => a.status === 'Available').map(a => ({ id: a.id, label: a.name })), [assets]);

    const filteredCategories = React.useMemo(() => {
        if (!search.trim()) return categories;
        const q = search.toLowerCase();
        return categories.filter(c => c.name.toLowerCase().includes(q));
    }, [categories, search]);

    const filteredAssets = React.useMemo(() => {
        if (!search.trim()) return assets;
        const q = search.toLowerCase();
        return assets.filter(a => a.name.toLowerCase().includes(q) || a.categoryName.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q));
    }, [assets, search]);

    const filteredAssignments = React.useMemo(() => {
        if (!search.trim()) return assignments;
        const q = search.toLowerCase();
        return assignments.filter(a => a.assetName.toLowerCase().includes(q) || a.employeeName.toLowerCase().includes(q));
    }, [assignments, search]);

    // Handlers
    const handleSaveCategory = (data: Record<string, unknown>) => {
        if (editingCat) {
            updateCat.mutate({ id: editingCat.id, data }, { onSuccess: () => setCatFormVisible(false) });
        } else {
            createCat.mutate(data, { onSuccess: () => setCatFormVisible(false) });
        }
    };

    const handleDeleteCategory = (item: CategoryItem) => {
        showConfirm({
            title: 'Delete Category', message: `Delete "${item.name}"?`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteCat.mutate(item.id),
        });
    };

    const handleSaveAsset = (data: Record<string, unknown>) => {
        if (editingAss) {
            updateAss.mutate({ id: editingAss.id, data }, { onSuccess: () => setAssFormVisible(false) });
        } else {
            createAss.mutate(data, { onSuccess: () => setAssFormVisible(false) });
        }
    };

    const handleSaveAssignment = (data: Record<string, unknown>) => {
        createAsg.mutate(data, { onSuccess: () => setAsgFormVisible(false) });
    };

    const handleReturnAsset = (item: AssignmentItem) => {
        showConfirm({
            title: 'Return Asset', message: `Mark "${item.assetName}" as returned from ${item.employeeName}?`,
            confirmText: 'Return', variant: 'primary',
            onConfirm: () => updateAsg.mutate({ id: item.id, data: { isReturned: true, returnDate: new Date().toISOString().split('T')[0], returnCondition: 'Good' } }),
        });
    };

    const isLoading = activeTab === 'categories' ? catLoading : activeTab === 'inventory' ? assLoading : asgLoading;
    const isFetching = activeTab === 'categories' ? catFetching : activeTab === 'inventory' ? assFetching : asgFetching;
    const activeRefetch = activeTab === 'categories' ? catRefetch : activeTab === 'inventory' ? assRefetch : asgRefetch;
    const error = activeTab === 'categories' ? catError : activeTab === 'inventory' ? assError : asgError;

    const tabs: { key: Tab; label: string }[] = [
        { key: 'categories', label: 'Categories' },
        { key: 'inventory', label: 'Inventory' },
        { key: 'assignments', label: 'Assignments' },
    ];

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Asset Management</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{assets.length} asset{assets.length !== 1 ? 's' : ''}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8 }}>
                {tabs.map(tab => {
                    const active = tab.key === activeTab;
                    return (
                        <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.filterChip, active && styles.filterChipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{tab.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            <View style={{ marginTop: 12 }}><SearchBar value={search} onChangeText={setSearch} placeholder={`Search ${activeTab}...`} /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => activeRefetch() }} /></View>;
        const msgs: Record<Tab, string> = { categories: 'No asset categories yet.', inventory: 'No assets in inventory.', assignments: 'No asset assignments.' };
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title={`No ${activeTab}`} message={msgs[activeTab]} /></View>;
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        if (activeTab === 'categories') return <CategoryCard item={item} index={index} onEdit={() => { setEditingCat(item); setCatFormVisible(true); }} onDelete={() => handleDeleteCategory(item)} />;
        if (activeTab === 'inventory') return <AssetCard item={item} index={index} onEdit={() => { setEditingAss(item); setAssFormVisible(true); }} />;
        return <AssignmentCard item={item} index={index} onReturn={() => handleReturnAsset(item)} />;
    };

    const activeData = activeTab === 'categories' ? filteredCategories : activeTab === 'inventory' ? filteredAssets : filteredAssignments;

    const handleFAB = () => {
        if (activeTab === 'categories') { setEditingCat(null); setCatFormVisible(true); }
        else if (activeTab === 'inventory') { setEditingAss(null); setAssFormVisible(true); }
        else { setAsgFormVisible(true); }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Assets" onMenuPress={toggle} />
            <FlatList
                data={activeData} renderItem={renderItem} keyExtractor={(item: any) => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => activeRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleFAB} />
            <CategoryFormModal visible={catFormVisible} onClose={() => setCatFormVisible(false)} onSave={handleSaveCategory} initialData={editingCat} isSaving={createCat.isPending || updateCat.isPending} />
            <AssetFormModal visible={assFormVisible} onClose={() => setAssFormVisible(false)} onSave={handleSaveAsset} initialData={editingAss} categoryOptions={categoryOptions} isSaving={createAss.isPending || updateAss.isPending} />
            <AssignFormModal visible={asgFormVisible} onClose={() => setAsgFormVisible(false)} onSave={handleSaveAssignment} assetOptions={assetOptions} employeeOptions={employeeOptions} isSaving={createAsg.isPending} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    returnBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.primary[600] },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

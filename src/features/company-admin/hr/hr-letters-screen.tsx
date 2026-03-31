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
    useCreateLetter,
    useCreateLetterTemplate,
    useDeleteLetterTemplate,
    useGenerateLetterPdf,
    useUpdateLetterTemplate,
} from '@/features/company-admin/api/use-recruitment-mutations';
import { useLetters, useLetterTemplates } from '@/features/company-admin/api/use-recruitment-queries';

// ============ TYPES ============

type LetterType = 'Offer' | 'Appointment' | 'Confirmation' | 'Increment' | 'Transfer' | 'Warning' | 'Termination' | 'Experience' | 'Relieving' | 'Other';
type Tab = 'templates' | 'letters';

interface TemplateItem {
    id: string;
    type: LetterType;
    name: string;
    body: string;
    createdAt: string;
}

interface LetterItem {
    id: string;
    templateId: string;
    employeeId: string;
    employeeName: string;
    letterType: LetterType;
    effectiveDate: string;
    pdfGenerated: boolean;
    eSigned: boolean;
    createdAt: string;
}

// ============ CONSTANTS ============

const LETTER_TYPES: LetterType[] = ['Offer', 'Appointment', 'Confirmation', 'Increment', 'Transfer', 'Warning', 'Termination', 'Experience', 'Relieving', 'Other'];
const AVAILABLE_TOKENS = ['{employee_name}', '{designation}', '{department}', '{date_of_joining}', '{effective_date}', '{salary}', '{company_name}'];

const TYPE_COLORS: Record<LetterType, { bg: string; text: string }> = {
    Offer: { bg: colors.success[50], text: colors.success[700] },
    Appointment: { bg: colors.primary[50], text: colors.primary[700] },
    Confirmation: { bg: colors.info[50], text: colors.info[700] },
    Increment: { bg: colors.accent[50], text: colors.accent[700] },
    Transfer: { bg: colors.warning[50], text: colors.warning[700] },
    Warning: { bg: colors.danger[50], text: colors.danger[700] },
    Termination: { bg: colors.danger[100], text: colors.danger[800] },
    Experience: { bg: colors.primary[50], text: colors.primary[700] },
    Relieving: { bg: colors.neutral[100], text: colors.neutral[700] },
    Other: { bg: colors.neutral[100], text: colors.neutral[600] },
};

// ============ SHARED ATOMS ============

function TypeBadge({ type }: { type: LetterType }) {
    const c = TYPE_COLORS[type] ?? TYPE_COLORS.Other;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{type}</Text>
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

// ============ TEMPLATE FORM MODAL ============

function TemplateFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: TemplateItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [type, setType] = React.useState<LetterType>('Offer');
    const [name, setName] = React.useState('');
    const [body, setBody] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) { setType(initialData.type); setName(initialData.name); setBody(initialData.body); }
            else { setType('Offer'); setName(''); setBody(''); }
        }
    }, [visible, initialData]);

    const isValid = name.trim() && body.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">
                        {initialData ? 'Edit Template' : 'New Template'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        <ChipSelector label="Letter Type" options={[...LETTER_TYPES]} value={type} onSelect={v => setType(v as LetterType)} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Template Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Standard Offer Letter" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Body <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 200 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Dear {employee_name},\n\nWe are pleased to..." placeholderTextColor={colors.neutral[400]} value={body} onChangeText={setBody} multiline numberOfLines={10} />
                            </View>
                        </View>
                        <View style={{ backgroundColor: colors.primary[50], borderRadius: 12, padding: 12, marginBottom: 14 }}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-700">Available Tokens</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {AVAILABLE_TOKENS.map(token => (
                                    <Pressable key={token} onPress={() => setBody(prev => `${prev  } ${  token}`)} style={{ backgroundColor: colors.white, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary[200] }}>
                                        <Text className="font-inter text-[10px] font-semibold text-primary-600">{token}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ type, name: name.trim(), body: body.trim() })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ GENERATE LETTER MODAL ============

function GenerateLetterModal({
    visible, onClose, onSave, templateOptions, employeeOptions, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    templateOptions: { id: string; label: string; type: LetterType }[];
    employeeOptions: { id: string; label: string }[];
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [templateId, setTemplateId] = React.useState('');
    const [employeeId, setEmployeeId] = React.useState('');
    const [effectiveDate, setEffectiveDate] = React.useState('');

    React.useEffect(() => {
        if (visible) { setTemplateId(''); setEmployeeId(''); setEffectiveDate(new Date().toISOString().split('T')[0]); }
    }, [visible]);

    const isValid = templateId && employeeId && effectiveDate.trim();
    const selectedTemplate = templateOptions.find(t => t.id === templateId);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Generate Letter</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        <Dropdown label="Template" value={templateId} options={templateOptions.map(t => ({ id: t.id, label: `${t.type} - ${t.label}` }))} onSelect={setTemplateId} placeholder="Select template..." required />
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Select employee..." required />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Effective Date <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={effectiveDate} onChangeText={setEffectiveDate} /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ templateId, employeeId, employeeName: employeeOptions.find(e => e.id === employeeId)?.label ?? '', letterType: selectedTemplate?.type ?? 'Other', effectiveDate: effectiveDate.trim(), pdfGenerated: false, eSigned: false })} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Generating...' : 'Generate'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARD COMPONENTS ============

function TemplateCard({ item, index, onEdit, onDelete }: {
    item: TemplateItem; index: number; onEdit: () => void; onDelete: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                    </View>
                    <TypeBadge type={item.type} />
                </View>
                <Text className="mt-2 font-inter text-xs text-neutral-500" numberOfLines={2}>{item.body}</Text>
                <View style={styles.cardFooter}>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

function LetterCard({ item, index, onGeneratePdf }: {
    item: LetterItem; index: number; onGeneratePdf: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <AvatarCircle name={item.employeeName} />
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500">{item.effectiveDate}</Text>
                        </View>
                    </View>
                    <TypeBadge type={item.letterType} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={[styles.statusIndicator, { backgroundColor: item.pdfGenerated ? colors.success[50] : colors.neutral[100] }]}>
                        <Svg width={10} height={10} viewBox="0 0 24 24"><Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={item.pdfGenerated ? colors.success[600] : colors.neutral[400]} strokeWidth="2" fill="none" /></Svg>
                        <Text style={{ color: item.pdfGenerated ? colors.success[700] : colors.neutral[500], fontFamily: 'Inter', fontSize: 10, fontWeight: '600' }}>PDF {item.pdfGenerated ? 'Ready' : 'Pending'}</Text>
                    </View>
                    <View style={[styles.statusIndicator, { backgroundColor: item.eSigned ? colors.success[50] : colors.neutral[100] }]}>
                        <Svg width={10} height={10} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={item.eSigned ? colors.success[600] : colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text style={{ color: item.eSigned ? colors.success[700] : colors.neutral[500], fontFamily: 'Inter', fontSize: 10, fontWeight: '600' }}>e-Sign {item.eSigned ? 'Done' : 'Pending'}</Text>
                    </View>
                </View>
                {!item.pdfGenerated && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onGeneratePdf} style={styles.generateBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={colors.white} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-xs font-bold text-white">Generate PDF</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function HRLettersScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [activeTab, setActiveTab] = React.useState<Tab>('templates');
    const [search, setSearch] = React.useState('');

    const { data: tplResponse, isLoading: tplLoading, error: tplError, refetch: tplRefetch, isFetching: tplFetching } = useLetterTemplates();
    const { data: letResponse, isLoading: letLoading, error: letError, refetch: letRefetch, isFetching: letFetching } = useLetters();
    const { data: empResponse } = useEmployees();

    const createTpl = useCreateLetterTemplate();
    const updateTpl = useUpdateLetterTemplate();
    const deleteTpl = useDeleteLetterTemplate();
    const createLet = useCreateLetter();
    const generatePdf = useGenerateLetterPdf();

    const [tplFormVisible, setTplFormVisible] = React.useState(false);
    const [editingTpl, setEditingTpl] = React.useState<TemplateItem | null>(null);
    const [letFormVisible, setLetFormVisible] = React.useState(false);

    const templates: TemplateItem[] = React.useMemo(() => {
        const raw = (tplResponse as any)?.data ?? tplResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', type: item.type ?? 'Other', name: item.name ?? '', body: item.body ?? '', createdAt: item.createdAt ?? '',
        }));
    }, [tplResponse]);

    const letters: LetterItem[] = React.useMemo(() => {
        const raw = (letResponse as any)?.data ?? letResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', templateId: item.templateId ?? '', employeeId: item.employeeId ?? '',
            employeeName: item.employeeName ?? '', letterType: item.letterType ?? 'Other',
            effectiveDate: item.effectiveDate ?? '', pdfGenerated: item.pdfGenerated ?? false,
            eSigned: item.eSigned ?? false, createdAt: item.createdAt ?? '',
        }));
    }, [letResponse]);

    const employeeOptions = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '' }));
    }, [empResponse]);

    const templateOptions = React.useMemo(() => templates.map(t => ({ id: t.id, label: t.name, type: t.type })), [templates]);

    const filteredTemplates = React.useMemo(() => {
        if (!search.trim()) return templates;
        const q = search.toLowerCase();
        return templates.filter(t => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q));
    }, [templates, search]);

    const filteredLetters = React.useMemo(() => {
        if (!search.trim()) return letters;
        const q = search.toLowerCase();
        return letters.filter(l => l.employeeName.toLowerCase().includes(q) || l.letterType.toLowerCase().includes(q));
    }, [letters, search]);

    const handleSaveTemplate = (data: Record<string, unknown>) => {
        if (editingTpl) {
            updateTpl.mutate({ id: editingTpl.id, data }, { onSuccess: () => setTplFormVisible(false) });
        } else {
            createTpl.mutate(data, { onSuccess: () => setTplFormVisible(false) });
        }
    };

    const handleDeleteTemplate = (item: TemplateItem) => {
        showConfirm({
            title: 'Delete Template', message: `Delete "${item.name}"?`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => deleteTpl.mutate(item.id),
        });
    };

    const handleSaveLetter = (data: Record<string, unknown>) => {
        createLet.mutate(data, { onSuccess: () => setLetFormVisible(false) });
    };

    const handleGeneratePdf = (item: LetterItem) => {
        showConfirm({
            title: 'Generate PDF', message: `Generate PDF for ${item.employeeName}'s ${item.letterType} letter?`,
            confirmText: 'Generate', variant: 'primary',
            onConfirm: () => generatePdf.mutate(item.id),
        });
    };

    const isLoading = activeTab === 'templates' ? tplLoading : letLoading;
    const isFetching = activeTab === 'templates' ? tplFetching : letFetching;
    const activeRefetch = activeTab === 'templates' ? tplRefetch : letRefetch;
    const error = activeTab === 'templates' ? tplError : letError;

    const tabs: { key: Tab; label: string }[] = [
        { key: 'templates', label: 'Templates' },
        { key: 'letters', label: 'Letters' },
    ];

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">HR Letters</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">
                {activeTab === 'templates' ? `${templates.length} template${templates.length !== 1 ? 's' : ''}` : `${letters.length} letter${letters.length !== 1 ? 's' : ''}`}
            </Text>
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
        if (activeTab === 'templates') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No templates" message="Create your first letter template." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No letters" message="Generate a letter from a template." /></View>;
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        if (activeTab === 'templates') return <TemplateCard item={item} index={index} onEdit={() => { setEditingTpl(item); setTplFormVisible(true); }} onDelete={() => handleDeleteTemplate(item)} />;
        return <LetterCard item={item} index={index} onGeneratePdf={() => handleGeneratePdf(item)} />;
    };

    const activeData = activeTab === 'templates' ? filteredTemplates : filteredLetters;

    const handleFAB = () => {
        if (activeTab === 'templates') { setEditingTpl(null); setTplFormVisible(true); }
        else { setLetFormVisible(true); }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="HR Letters" onMenuPress={toggle} />
            <FlatList
                data={activeData} renderItem={renderItem} keyExtractor={(item: any) => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => activeRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleFAB} />
            <TemplateFormModal visible={tplFormVisible} onClose={() => setTplFormVisible(false)} onSave={handleSaveTemplate} initialData={editingTpl} isSaving={createTpl.isPending || updateTpl.isPending} />
            <GenerateLetterModal visible={letFormVisible} onClose={() => setLetFormVisible(false)} onSave={handleSaveLetter} templateOptions={templateOptions} employeeOptions={employeeOptions} isSaving={createLet.isPending} />
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
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    generateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.primary[600] },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    fullFormSheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
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

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
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useCreateContact,
    useDeleteContact,
    useUpdateContact,
} from '@/features/company-admin/api/use-company-admin-mutations';
import { useCompanyContacts } from '@/features/company-admin/api/use-company-admin-queries';

// ============ CONSTANTS ============

const CONTACT_TYPES = [
    'Primary', 'HR Contact', 'Finance Contact',
    'IT Contact', 'Legal Contact', 'Operations Contact',
];

// ============ TYPES ============

interface ContactItem {
    id: string;
    name: string;
    designation: string;
    department: string;
    type: string;
    email: string;
    countryCode: string;
    phone: string;
    linkedin: string;
}

// ============ CHIP SELECTOR ============

function ContactTypeChips({
    value,
    onSelect,
}: {
    value: string;
    onSelect: (v: string) => void;
}) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                Contact Type
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    {CONTACT_TYPES.map(opt => (
                        <Pressable
                            key={opt}
                            onPress={() => onSelect(opt)}
                            style={[styles.chip, value === opt && styles.chipActive]}
                        >
                            <Text className={`font-inter text-xs font-semibold ${value === opt ? 'text-white' : 'text-neutral-600'}`}>
                                {opt}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

// ============ CONTACT FORM MODAL ============

function ContactFormModal({
    visible,
    onClose,
    onSave,
    initialData,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: Omit<ContactItem, 'id'>) => void;
    initialData?: ContactItem | null;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [designation, setDesignation] = React.useState('');
    const [department, setDepartment] = React.useState('');
    const [type, setType] = React.useState('Primary');
    const [email, setEmail] = React.useState('');
    const [countryCode, setCountryCode] = React.useState('+91');
    const [phone, setPhone] = React.useState('');
    const [linkedin, setLinkedin] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name);
                setDesignation(initialData.designation);
                setDepartment(initialData.department);
                setType(initialData.type);
                setEmail(initialData.email);
                setCountryCode(initialData.countryCode || '+91');
                setPhone(initialData.phone);
                setLinkedin(initialData.linkedin);
            } else {
                setName('');
                setDesignation('');
                setDepartment('');
                setType('Primary');
                setEmail('');
                setCountryCode('+91');
                setPhone('');
                setLinkedin('');
            }
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!name.trim() || !email.trim()) return;
        onSave({ name: name.trim(), designation, department, type, email: email.trim(), countryCode, phone, linkedin });
    };

    const isValid = name.trim() && email.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />

                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Contact' : 'Add Contact'}
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        {/* Name */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Name <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput style={styles.textInput} placeholder="Full name" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} autoCapitalize="words" />
                            </View>
                        </View>

                        {/* Designation + Department */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Designation</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput style={styles.textInput} placeholder="CEO, CHRO" placeholderTextColor={colors.neutral[400]} value={designation} onChangeText={setDesignation} autoCapitalize="words" />
                                </View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Department</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput style={styles.textInput} placeholder="HR, IT" placeholderTextColor={colors.neutral[400]} value={department} onChangeText={setDepartment} autoCapitalize="words" />
                                </View>
                            </View>
                        </View>

                        {/* Contact Type */}
                        <ContactTypeChips value={type} onSelect={setType} />

                        {/* Email */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Email <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput style={styles.textInput} placeholder="contact@company.com" placeholderTextColor={colors.neutral[400]} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                            </View>
                        </View>

                        {/* Phone */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Phone</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={[styles.inputWrap, { width: 80 }]}>
                                    <TextInput style={styles.textInput} placeholder="+91" placeholderTextColor={colors.neutral[400]} value={countryCode} onChangeText={setCountryCode} keyboardType="phone-pad" />
                                </View>
                                <View style={[styles.inputWrap, { flex: 1 }]}>
                                    <TextInput style={styles.textInput} placeholder="98765 43210" placeholderTextColor={colors.neutral[400]} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                                </View>
                            </View>
                        </View>

                        {/* LinkedIn */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">LinkedIn</Text>
                            <View style={styles.inputWrap}>
                                <TextInput style={styles.textInput} placeholder="https://linkedin.com/in/username" placeholderTextColor={colors.neutral[400]} value={linkedin} onChangeText={setLinkedin} keyboardType="url" autoCapitalize="none" />
                            </View>
                        </View>
                    </ScrollView>

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSave}
                            disabled={!isValid || isSaving}
                            style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">
                                {isSaving ? 'Saving...' : initialData ? 'Update Contact' : 'Add Contact'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CONTACT CARD ============

function ContactCard({
    contact,
    index,
    onEdit,
    onDelete,
}: {
    contact: ContactItem;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable
                onPress={onEdit}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>
                            {contact.name}
                        </Text>
                        {(contact.designation || contact.department) && (
                            <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={1}>
                                {[contact.designation, contact.department].filter(Boolean).join(' · ')}
                            </Text>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.typeBadge}>
                            <Text className="font-inter text-[9px] font-bold text-primary-700">
                                {contact.type}
                            </Text>
                        </View>
                        <Pressable onPress={onDelete} hitSlop={8}>
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.contactDetails}>
                    {contact.email ? (
                        <View style={styles.detailRow}>
                            <Svg width={12} height={12} viewBox="0 0 24 24">
                                <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                                <Path d="M22 6l-10 7L2 6" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            </Svg>
                            <Text className="font-inter text-[11px] text-neutral-600" numberOfLines={1}>
                                {contact.email}
                            </Text>
                        </View>
                    ) : null}
                    {contact.phone ? (
                        <View style={styles.detailRow}>
                            <Svg width={12} height={12} viewBox="0 0 24 24">
                                <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                            </Svg>
                            <Text className="font-inter text-[11px] text-neutral-600">
                                {contact.countryCode} {contact.phone}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function ContactManagementScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useCompanyContacts();
    const createMutation = useCreateContact();
    const updateMutation = useUpdateContact();
    const deleteMutation = useDeleteContact();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingContact, setEditingContact] = React.useState<ContactItem | null>(null);

    const contacts: ContactItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            designation: item.designation ?? '',
            department: item.department ?? '',
            type: item.type ?? 'Primary',
            email: item.email ?? '',
            countryCode: item.countryCode ?? '+91',
            phone: item.phone ?? item.mobile ?? '',
            linkedin: item.linkedin ?? '',
        }));
    }, [response]);

    const handleAdd = () => {
        setEditingContact(null);
        setFormVisible(true);
    };

    const handleEdit = (contact: ContactItem) => {
        setEditingContact(contact);
        setFormVisible(true);
    };

    const handleDelete = (contact: ContactItem) => {
        showConfirm({
            title: 'Delete Contact',
            message: `Are you sure you want to delete "${contact.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                deleteMutation.mutate(contact.id);
            },
        });
    };

    const handleSave = (data: Omit<ContactItem, 'id'>) => {
        if (editingContact) {
            updateMutation.mutate(
                { id: editingContact.id, data: data as unknown as Record<string, unknown> },
                { onSuccess: () => setFormVisible(false) },
            );
        } else {
            createMutation.mutate(
                data as unknown as Record<string, unknown>,
                { onSuccess: () => setFormVisible(false) },
            );
        }
    };

    const renderContact = ({ item, index }: { item: ContactItem; index: number }) => (
        <ContactCard
            contact={item}
            index={index}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
        />
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
                <View style={{ paddingTop: 40, alignItems: 'center' }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load contacts"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
                <EmptyState
                    icon="inbox"
                    title="No contacts configured"
                    message="Add your first contact to keep important people accessible."
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <AppTopHeader title="Contact Management" onMenuPress={toggle} />

            <FlatList
                data={contacts}
                renderItem={renderContact}
                keyExtractor={item => item.id}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
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

            <FAB onPress={handleAdd} />

            <ContactFormModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleSave}
                initialData={editingContact}
                isSaving={createMutation.isPending || updateMutation.isPending}
            />

            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
    },
    listContent: {
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    cardPressed: {
        backgroundColor: colors.primary[50],
        transform: [{ scale: 0.98 }],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    typeBadge: {
        backgroundColor: colors.primary[50],
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    contactDetails: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    // Form sheet
    formSheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral[300],
        alignSelf: 'center',
        marginBottom: 16,
    },
    fieldWrap: {
        marginBottom: 14,
    },
    inputWrap: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 46,
        justifyContent: 'center',
    },
    textInput: {
        fontFamily: 'Inter',
        fontSize: 14,
        color: colors.primary[950],
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.neutral[100],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    chipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    cancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
    },
    saveBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});

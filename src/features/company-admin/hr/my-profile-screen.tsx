/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';

import { useUpdateMyProfile } from '@/features/company-admin/api/use-ess-mutations';
import { useMyProfile } from '@/features/company-admin/api/use-ess-queries';

// ============ TYPES ============

interface ProfileData {
    name: string;
    employeeCode: string;
    designation: string;
    department: string;
    dateOfJoining: string;
    reportingTo: string;
    employeeType: string;
    email: string;
    phone: string;
    address: string;
    emergencyContact: string;
    emergencyPhone: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    pan: string;
    aadhaar: string;
    uan: string;
    esiNumber: string;
}

// ============ HELPERS ============

function maskValue(val: string, showLast: number = 4): string {
    if (!val || val.length <= showLast) return val;
    return '*'.repeat(val.length - showLast) + val.slice(-showLast);
}

function asDisplayText(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (Array.isArray(value)) {
        return value.map(asDisplayText).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const preferred = record.name ?? record.label ?? record.title ?? record.value ?? record.code;
        if (preferred != null && (typeof preferred === 'string' || typeof preferred === 'number')) {
            return String(preferred);
        }
    }
    return '';
}

// ============ SHARED ATOMS ============

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</Text>
            {children}
        </View>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text className="font-inter text-xs text-neutral-500" style={{ width: 120 }}>{label}</Text>
            <Text className="font-inter text-sm font-semibold text-primary-950 flex-1" numberOfLines={2}>{value || '--'}</Text>
        </View>
    );
}

function AvatarLarge({ name }: { name: string }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
        <View style={styles.avatarLarge}>
            <Text className="font-inter text-xl font-bold text-primary-600">{initials}</Text>
        </View>
    );
}

// ============ EDIT PROFILE TYPES & CONSTANTS ============

const MARITAL_STATUS_OPTIONS = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];

interface EditProfileFormData {
    personalMobile: string;
    alternativeMobile: string;
    personalEmail: string;
    emergencyContactName: string;
    emergencyContactRelation: string;
    emergencyContactMobile: string;
    maritalStatus: string;
    bloodGroup: string;
}

// ============ EDIT PROFILE MODAL ============

function EditProfileModal({
    visible, onClose, onSave, isSaving, initialData,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: EditProfileFormData) => void; isSaving: boolean;
    initialData: EditProfileFormData;
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<EditProfileFormData>(initialData);
    const [maritalPickerVisible, setMaritalPickerVisible] = React.useState(false);

    React.useEffect(() => {
        if (visible) setForm(initialData);
    }, [visible, initialData]);

    const updateField = (field: keyof EditProfileFormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Edit Profile</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Personal Mobile */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Personal Mobile</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Personal mobile..." placeholderTextColor={colors.neutral[400]} value={form.personalMobile} onChangeText={v => updateField('personalMobile', v)} keyboardType="phone-pad" /></View>
                        </View>

                        {/* Alternative Mobile */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Alternative Mobile</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Alternative mobile..." placeholderTextColor={colors.neutral[400]} value={form.alternativeMobile} onChangeText={v => updateField('alternativeMobile', v)} keyboardType="phone-pad" /></View>
                        </View>

                        {/* Personal Email */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Personal Email</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Personal email..." placeholderTextColor={colors.neutral[400]} value={form.personalEmail} onChangeText={v => updateField('personalEmail', v)} keyboardType="email-address" autoCapitalize="none" /></View>
                        </View>

                        {/* Emergency Contact Name */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Emergency Contact Name</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Contact name..." placeholderTextColor={colors.neutral[400]} value={form.emergencyContactName} onChangeText={v => updateField('emergencyContactName', v)} /></View>
                        </View>

                        {/* Emergency Contact Relation */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Relation</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Relation..." placeholderTextColor={colors.neutral[400]} value={form.emergencyContactRelation} onChangeText={v => updateField('emergencyContactRelation', v)} /></View>
                        </View>

                        {/* Emergency Contact Mobile */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Emergency Contact Mobile</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Emergency mobile..." placeholderTextColor={colors.neutral[400]} value={form.emergencyContactMobile} onChangeText={v => updateField('emergencyContactMobile', v)} keyboardType="phone-pad" /></View>
                        </View>

                        {/* Marital Status */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Marital Status</Text>
                            <Pressable onPress={() => setMaritalPickerVisible(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${form.maritalStatus ? 'font-semibold text-primary-950' : 'text-neutral-400'}`}>{form.maritalStatus || 'Select...'}</Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={maritalPickerVisible} transparent animationType="slide" onRequestClose={() => setMaritalPickerVisible(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setMaritalPickerVisible(false)} />
                                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '50%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Marital Status</Text>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {MARITAL_STATUS_OPTIONS.map(opt => (
                                                <Pressable key={opt} onPress={() => { updateField('maritalStatus', opt); setMaritalPickerVisible(false); }}
                                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt === form.maritalStatus ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                                    <Text className={`font-inter text-sm ${opt === form.maritalStatus ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        {/* Blood Group */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Blood Group</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Blood group..." placeholderTextColor={colors.neutral[400]} value={form.bloodGroup} onChangeText={v => updateField('bloodGroup', v)} /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave(form)} disabled={isSaving} style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Save'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ MAIN COMPONENT ============

export function MyProfileScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { data: response, isLoading, error, refetch, isFetching } = useMyProfile();
    const updateProfile = useUpdateMyProfile();
    const [editVisible, setEditVisible] = React.useState(false);

    const profile: ProfileData | null = React.useMemo(() => {
        const d: any = (response as any)?.data ?? response;
        if (!d) return null;
        return {
            name: asDisplayText(d.name) || `${asDisplayText(d.firstName)} ${asDisplayText(d.lastName)}`.trim(),
            employeeCode: asDisplayText(d.employeeCode ?? d.code),
            designation: asDisplayText(d.designation),
            department: asDisplayText(d.department),
            dateOfJoining: asDisplayText(d.dateOfJoining ?? d.joiningDate),
            reportingTo: asDisplayText(d.reportingTo ?? d.managerName),
            employeeType: asDisplayText(d.employeeType ?? d.type),
            email: asDisplayText(d.email),
            phone: asDisplayText(d.phone ?? d.mobile),
            address: asDisplayText(d.address),
            emergencyContact: asDisplayText(d.emergencyContact ?? d.emergencyContactName),
            emergencyPhone: asDisplayText(d.emergencyPhone ?? d.emergencyContactPhone),
            bankName: asDisplayText(d.bankName),
            accountNumber: asDisplayText(d.accountNumber),
            ifscCode: asDisplayText(d.ifscCode ?? d.ifsc),
            pan: asDisplayText(d.pan),
            aadhaar: asDisplayText(d.aadhaar),
            uan: asDisplayText(d.uan),
            esiNumber: asDisplayText(d.esiNumber),
        };
    }, [response]);

    const editFormData: EditProfileFormData = React.useMemo(() => {
        const d: any = (response as any)?.data ?? response ?? {};
        return {
            personalMobile: d.personalMobile ?? d.phone ?? d.mobile ?? '',
            alternativeMobile: d.alternativeMobile ?? d.altMobile ?? '',
            personalEmail: d.personalEmail ?? '',
            emergencyContactName: d.emergencyContactName ?? d.emergencyContact ?? '',
            emergencyContactRelation: d.emergencyContactRelation ?? '',
            emergencyContactMobile: d.emergencyContactMobile ?? d.emergencyPhone ?? '',
            maritalStatus: d.maritalStatus ?? '',
            bloodGroup: d.bloodGroup ?? '',
        };
    }, [response]);

    const handleSaveProfile = (data: EditProfileFormData) => {
        updateProfile.mutate(data, {
            onSuccess: () => {
                setEditVisible(false);
                showSuccess('Profile updated successfully');
            },
        });
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="My Profile" onMenuPress={toggle} />
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    if (error || !profile) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="My Profile" onMenuPress={toggle} />
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load profile" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <HamburgerButton onPress={toggle} />
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">My Profile</Text>
                <Pressable onPress={() => setEditVisible(true)} style={styles.editHeaderBtn}>
                    <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
            </View>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            >
                {/* Profile Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.profileHeader}>
                    <AvatarLarge name={profile.name} />
                    <Text className="mt-3 font-inter text-xl font-bold text-primary-950">{profile.name}</Text>
                    <Text className="mt-0.5 font-inter text-sm text-neutral-500">{profile.designation} {'\u2022'} {profile.department}</Text>
                    <Text className="mt-0.5 font-inter text-xs text-neutral-400">{profile.employeeCode}</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* Personal Info */}
                    <SectionCard title="Personal Info">
                        <InfoRow label="Full Name" value={profile.name} />
                        <InfoRow label="Employee Code" value={profile.employeeCode} />
                        <InfoRow label="Designation" value={profile.designation} />
                        <InfoRow label="Department" value={profile.department} />
                    </SectionCard>

                    {/* Contact */}
                    <SectionCard title="Contact">
                        <InfoRow label="Email" value={profile.email} />
                        <InfoRow label="Phone" value={profile.phone} />
                        <InfoRow label="Address" value={profile.address} />
                        <InfoRow label="Emergency" value={profile.emergencyContact} />
                        <InfoRow label="Emergency Ph." value={profile.emergencyPhone} />
                    </SectionCard>

                    {/* Employment */}
                    <SectionCard title="Employment Details">
                        <InfoRow label="Date of Joining" value={profile.dateOfJoining} />
                        <InfoRow label="Reporting To" value={profile.reportingTo} />
                        <InfoRow label="Employee Type" value={profile.employeeType} />
                    </SectionCard>

                    {/* Bank */}
                    <SectionCard title="Bank Details">
                        <InfoRow label="Bank Name" value={profile.bankName} />
                        <InfoRow label="Account No." value={maskValue(profile.accountNumber)} />
                        <InfoRow label="IFSC Code" value={profile.ifscCode} />
                    </SectionCard>

                    {/* Statutory IDs */}
                    <SectionCard title="Statutory IDs">
                        <InfoRow label="PAN" value={profile.pan} />
                        <InfoRow label="Aadhaar" value={maskValue(profile.aadhaar)} />
                        <InfoRow label="UAN" value={profile.uan} />
                        <InfoRow label="ESI Number" value={profile.esiNumber} />
                    </SectionCard>

                    {/* Edit Profile */}
                    <Pressable onPress={() => setEditVisible(true)} style={styles.requestBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="font-inter text-sm font-bold text-primary-600">Edit Profile</Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>

            <EditProfileModal
                visible={editVisible}
                onClose={() => setEditVisible(false)}
                onSave={handleSaveProfile}
                isSaving={updateProfile.isPending}
                initialData={editFormData}
            />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 24 },
    profileHeader: { alignItems: 'center', paddingVertical: 20 },
    avatarLarge: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primary[200] },
    sectionCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    editHeaderBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    requestBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary[200], backgroundColor: colors.primary[50], marginTop: 8,
    },
});

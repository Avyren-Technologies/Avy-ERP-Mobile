/* eslint-disable better-tailwindcss/no-unknown-classes */
import { File as ExpoFile } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
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
import { useQuery } from '@tanstack/react-query';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';

import { useUpdateMyProfile } from '@/features/company-admin/api/use-ess-mutations';
import { useMyProfile } from '@/features/company-admin/api/use-ess-queries';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useFileUrl } from '@/hooks/use-file-url';
import { authApi } from '@/lib/api/auth';
import type { AuthUser } from '@/lib/api/auth';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface ProfileData {
    name: string;
    employeeCode: string;
    designation: string;
    department: string;
    // Personal
    dateOfBirth: string;
    gender: string;
    bloodGroup: string;
    maritalStatus: string;
    nationality: string;
    fatherMotherName: string;
    // Contact
    officialEmail: string;
    personalEmail: string;
    phone: string;
    altPhone: string;
    emergencyContactName: string;
    emergencyContactRelation: string;
    emergencyContactMobile: string;
    currentAddress: string;
    permanentAddress: string;
    // Employment
    dateOfJoining: string;
    probationEndDate: string;
    confirmationDate: string;
    noticePeriodDays: string;
    reportingTo: string;
    functionalManager: string;
    employeeType: string;
    grade: string;
    shift: string;
    location: string;
    costCentre: string;
    status: string;
    workType: string;
    // Bank
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    bankBranch: string;
    accountType: string;
    // Statutory
    pan: string;
    aadhaar: string;
    uan: string;
    esiNumber: string;
    // Photo
    profilePhotoUrl: string;
}

// ============ HELPERS ============

function maskValue(val: string, showLast: number = 4): string {
    if (!val || val.length <= showLast) return val;
    return '\u2022'.repeat(val.length - showLast) + val.slice(-showLast);
}

function formatBankAccountLastFour(last4: string | null | undefined): string {
    if (!last4) return '';
    return '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ' + last4;
}

function maskPAN(pan: string | null | undefined): string {
    if (!pan) return '';
    if (pan.length <= 4) return pan;
    return pan.slice(0, 2) + '\u2022\u2022\u2022\u2022\u2022' + pan.slice(-2);
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
        // Manager objects: { firstName, lastName }
        if ('firstName' in record || 'lastName' in record) {
            const parts = [record.firstName, record.lastName].filter(
                (x) => typeof x === 'string' && (x as string).length > 0,
            );
            return parts.length ? (parts as string[]).join(' ') : '';
        }
        const preferred = record.name ?? record.label ?? record.title ?? record.value ?? record.code;
        if (preferred != null && (typeof preferred === 'string' || typeof preferred === 'number')) {
            const code = typeof record.code === 'string' && record.code.length > 0 ? ` (${record.code})` : '';
            return String(preferred) + code;
        }
    }
    return '';
}

function humanizeEnum(value: string | null | undefined): string {
    if (value == null || value === '') return '';
    const s = String(value).replace(/_/g, ' ').toLowerCase();
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAddress(addr: unknown): string {
    if (addr == null || addr === '') return '';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object' && addr !== null) {
        const o = addr as Record<string, unknown>;
        const parts = [o.line1, o.line2, o.city, o.district, o.state, o.pincode ?? o.pin, o.country].filter(
            (x) => typeof x === 'string' && (x as string).length > 0,
        ) as string[];
        return parts.length ? parts.join(', ') : '';
    }
    return '';
}

function formatShift(shift: unknown): string {
    if (shift == null) return '';
    if (typeof shift === 'object') {
        const s = shift as Record<string, unknown>;
        const name = (s.name as string) ?? '';
        const from = (s.fromTime as string) ?? '';
        const to = (s.toTime as string) ?? '';
        const time = from && to ? ` \u00B7 ${from} \u2013 ${to}` : from ? ` \u00B7 from ${from}` : to ? ` \u00B7 until ${to}` : '';
        return (name + time).trim();
    }
    return '';
}

function isProfileIncomplete(profile: ProfileData | null): boolean {
    if (!profile) return true;
    return !profile.name && !profile.designation && !profile.employeeCode;
}

// ============ ICON COMPONENTS ============

function UserIcon({ size = 16, color = colors.primary[600] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function PhoneIcon({ size = 16, color = colors.primary[600] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function BriefcaseIcon({ size = 16, color = colors.primary[600] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function CreditCardIcon({ size = 16, color = colors.primary[600] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ShieldIcon({ size = 16, color = colors.primary[600] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function LockIcon({ size = 16, color = colors.primary[600] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function KeyIcon({ size = 16, color = colors.primary[600] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function EyeIcon({ size = 16, color = colors.neutral[400] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth="1.8" fill="none" />
        </Svg>
    );
}

function EyeOffIcon({ size = 16, color = colors.neutral[400] }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

// ============ SHARED ATOMS ============

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>{icon}</View>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{title}</Text>
            </View>
            {children}
        </View>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text className="font-inter text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400" style={{ width: 130 }}>{label}</Text>
            <Text className="flex-1 text-right font-inter text-sm font-medium text-primary-950 dark:text-white" numberOfLines={3}>{value || '\u2014'}</Text>
        </View>
    );
}

// ============ AVATAR / PHOTO ============

function ProfileAvatar({
    name,
    photoUrl,
    onPress,
    isUploading,
}: {
    name: string;
    photoUrl?: string;
    onPress: () => void;
    isUploading?: boolean;
}) {
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <Pressable onPress={onPress} style={styles.avatarWrap}>
            {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Text className="font-inter text-2xl font-bold text-primary-600">{initials}</Text>
                </View>
            )}
            <View style={styles.cameraBadge}>
                {isUploading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                ) : (
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                        <Path
                            d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                            stroke={colors.white}
                            strokeWidth="1.8"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <Path
                            d="M12 17a4 4 0 100-8 4 4 0 000 8z"
                            stroke={colors.white}
                            strokeWidth="1.8"
                            fill="none"
                        />
                    </Svg>
                )}
            </View>
        </Pressable>
    );
}

// ============ INCOMPLETE PROFILE BANNER ============

function IncompleteProfileBanner({ userEmail, onGoToDirectory }: { userEmail: string; onGoToDirectory: () => void }) {
    return (
        <View style={styles.incompleteBanner}>
            <View style={styles.incompleteBannerIcon}>
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                        stroke={colors.primary[600]}
                        strokeWidth="1.8"
                        fill="none"
                    />
                    <Path
                        d="M12 8v4M12 16h.01"
                        stroke={colors.primary[600]}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </Svg>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
                <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100">Profile not set up yet</Text>
                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                    Go to <Text className="font-bold text-primary-600">Employee Directory</Text> and find your record using{' '}
                    <Text className="font-bold text-primary-700">{userEmail}</Text> to complete your profile.
                </Text>
                <Pressable onPress={onGoToDirectory} style={styles.goToDirectoryBtn}>
                    <Text className="font-inter text-xs font-bold text-primary-600">Open Employee Directory</Text>
                    <Svg width={12} height={12} viewBox="0 0 24 24">
                        <Path d="M5 12h14M12 5l7 7-7 7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </Svg>
                </Pressable>
            </View>
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

// ============ EDIT PROFILE SCREEN (full-page modal) ============

function EditProfileModal({
    visible, onClose, onSave, isSaving, initialData,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: EditProfileFormData) => void; isSaving: boolean;
    initialData: EditProfileFormData;
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<EditProfileFormData>(initialData);

    React.useEffect(() => {
        if (visible) setForm(initialData);
    }, [visible, initialData]);

    const updateField = (field: keyof EditProfileFormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: colors.neutral[50] }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <View style={[editStyles.navBar, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={onClose} style={editStyles.navCancel}>
                        <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-400">Cancel</Text>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950 dark:text-white">Edit Profile</Text>
                    <Pressable
                        onPress={() => onSave(form)}
                        disabled={isSaving}
                        style={[editStyles.navSave, isSaving && { opacity: 0.5 }]}
                    >
                        {isSaving
                            ? <ActivityIndicator size="small" color={colors.white} />
                            : <Text className="font-inter text-sm font-bold text-white">Save</Text>
                        }
                    </Pressable>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={editStyles.formContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Contact */}
                    <Text style={editStyles.groupLabel}>Contact</Text>
                    <View style={editStyles.card}>
                        <View style={editStyles.fieldWrap}>
                            <Text style={editStyles.fieldLabel}>Personal Mobile</Text>
                            <TextInput
                                style={editStyles.input}
                                placeholder="Enter mobile number"
                                placeholderTextColor={colors.neutral[400]}
                                value={form.personalMobile}
                                onChangeText={v => updateField('personalMobile', v)}
                                keyboardType="phone-pad"
                                returnKeyType="next"
                            />
                        </View>
                        <View style={[editStyles.fieldWrap, { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                            <Text style={editStyles.fieldLabel}>Alternative Mobile</Text>
                            <TextInput
                                style={editStyles.input}
                                placeholder="Enter alternate number"
                                placeholderTextColor={colors.neutral[400]}
                                value={form.alternativeMobile}
                                onChangeText={v => updateField('alternativeMobile', v)}
                                keyboardType="phone-pad"
                                returnKeyType="next"
                            />
                        </View>
                        <View style={[editStyles.fieldWrap, { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                            <Text style={editStyles.fieldLabel}>Personal Email</Text>
                            <TextInput
                                style={editStyles.input}
                                placeholder="Enter personal email"
                                placeholderTextColor={colors.neutral[400]}
                                value={form.personalEmail}
                                onChangeText={v => updateField('personalEmail', v)}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                returnKeyType="next"
                            />
                        </View>
                    </View>

                    {/* Emergency Contact */}
                    <Text style={editStyles.groupLabel}>Emergency Contact</Text>
                    <View style={editStyles.card}>
                        <View style={editStyles.fieldWrap}>
                            <Text style={editStyles.fieldLabel}>Contact Name</Text>
                            <TextInput
                                style={editStyles.input}
                                placeholder="Enter contact name"
                                placeholderTextColor={colors.neutral[400]}
                                value={form.emergencyContactName}
                                onChangeText={v => updateField('emergencyContactName', v)}
                                returnKeyType="next"
                            />
                        </View>
                        <View style={[editStyles.fieldWrap, { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                            <Text style={editStyles.fieldLabel}>Relation</Text>
                            <TextInput
                                style={editStyles.input}
                                placeholder="e.g. Spouse, Parent"
                                placeholderTextColor={colors.neutral[400]}
                                value={form.emergencyContactRelation}
                                onChangeText={v => updateField('emergencyContactRelation', v)}
                                returnKeyType="next"
                            />
                        </View>
                        <View style={[editStyles.fieldWrap, { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                            <Text style={editStyles.fieldLabel}>Contact Mobile</Text>
                            <TextInput
                                style={editStyles.input}
                                placeholder="Enter emergency number"
                                placeholderTextColor={colors.neutral[400]}
                                value={form.emergencyContactMobile}
                                onChangeText={v => updateField('emergencyContactMobile', v)}
                                keyboardType="phone-pad"
                                returnKeyType="next"
                            />
                        </View>
                    </View>

                    {/* Other Details */}
                    <Text style={editStyles.groupLabel}>Other Details</Text>
                    <View style={editStyles.card}>
                        <View style={editStyles.fieldWrap}>
                            <Text style={editStyles.fieldLabel}>Marital Status</Text>
                            <View style={editStyles.chipRow}>
                                {MARITAL_STATUS_OPTIONS.map(opt => (
                                    <Pressable
                                        key={opt}
                                        onPress={() => updateField('maritalStatus', opt)}
                                        style={[editStyles.chip, form.maritalStatus === opt && editStyles.chipActive]}
                                    >
                                        <Text style={[editStyles.chipText, form.maritalStatus === opt && editStyles.chipTextActive]}>
                                            {opt}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                        <View style={[editStyles.fieldWrap, { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                            <Text style={editStyles.fieldLabel}>Blood Group</Text>
                            <TextInput
                                style={editStyles.input}
                                placeholder="e.g. O+, A-, B+"
                                placeholderTextColor={colors.neutral[400]}
                                value={form.bloodGroup}
                                onChangeText={v => updateField('bloodGroup', v)}
                                autoCapitalize="characters"
                                returnKeyType="done"
                            />
                        </View>
                    </View>

                    <View style={{ height: Math.max(insets.bottom, 24) }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============ CHANGE PASSWORD MODAL ============

function ChangePasswordModal({
    visible, onClose,
}: {
    visible: boolean; onClose: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = React.useState(false);
    const [showCurrent, setShowCurrent] = React.useState(false);
    const [showNew, setShowNew] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowCurrent(false);
            setShowNew(false);
        }
    }, [visible]);

    const handleSubmit = async () => {
        if (!form.currentPassword || !form.newPassword) return;
        if (form.newPassword !== form.confirmPassword) {
            showErrorMessage('New password and confirmation do not match');
            return;
        }
        setLoading(true);
        try {
            await authApi.changePassword(form.currentPassword, form.newPassword);
            showSuccess('Password updated successfully');
            onClose();
        } catch (err: any) {
            showErrorMessage(err?.response?.data?.message || err?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: colors.neutral[50] }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[editStyles.navBar, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={onClose} style={editStyles.navCancel}>
                        <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-400">Cancel</Text>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950 dark:text-white">Change Password</Text>
                    <Pressable
                        onPress={handleSubmit}
                        disabled={loading || !form.currentPassword || !form.newPassword || !form.confirmPassword}
                        style={[editStyles.navSave, (loading || !form.currentPassword || !form.newPassword) && { opacity: 0.5 }]}
                    >
                        {loading
                            ? <ActivityIndicator size="small" color={colors.white} />
                            : <Text className="font-inter text-sm font-bold text-white">Save</Text>
                        }
                    </Pressable>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={editStyles.formContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={editStyles.card}>
                        <View style={editStyles.fieldWrap}>
                            <Text style={editStyles.fieldLabel}>Current Password</Text>
                            <View style={pwStyles.inputWrap}>
                                <TextInput
                                    style={[editStyles.input, { flex: 1 }]}
                                    placeholder="Enter current password"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={form.currentPassword}
                                    onChangeText={v => setForm(prev => ({ ...prev, currentPassword: v }))}
                                    secureTextEntry={!showCurrent}
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                />
                                <Pressable onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
                                    {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
                                </Pressable>
                            </View>
                        </View>
                        <View style={[editStyles.fieldWrap, { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                            <Text style={editStyles.fieldLabel}>New Password</Text>
                            <View style={pwStyles.inputWrap}>
                                <TextInput
                                    style={[editStyles.input, { flex: 1 }]}
                                    placeholder="Enter new password"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={form.newPassword}
                                    onChangeText={v => setForm(prev => ({ ...prev, newPassword: v }))}
                                    secureTextEntry={!showNew}
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                />
                                <Pressable onPress={() => setShowNew(!showNew)} hitSlop={8}>
                                    {showNew ? <EyeOffIcon /> : <EyeIcon />}
                                </Pressable>
                            </View>
                        </View>
                        <View style={[editStyles.fieldWrap, { borderTopWidth: 1, borderTopColor: colors.neutral[100] }]}>
                            <Text style={editStyles.fieldLabel}>Confirm New Password</Text>
                            <TextInput
                                style={editStyles.input}
                                placeholder="Re-enter new password"
                                placeholderTextColor={colors.neutral[400]}
                                value={form.confirmPassword}
                                onChangeText={v => setForm(prev => ({ ...prev, confirmPassword: v }))}
                                secureTextEntry
                                autoCapitalize="none"
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                        </View>
                    </View>

                    <View style={{ height: Math.max(insets.bottom, 24) }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============ MAIN COMPONENT ============

export function MyProfileScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();
    const user = useAuthStore.use.user();
    const fmt = useCompanyFormatter();
    const formatDate = (d: string | null | undefined) => d ? fmt.date(d) : '';
    const { data: response, isLoading, error, refetch, isFetching } = useMyProfile();
    const updateProfile = useUpdateMyProfile();
    const [editVisible, setEditVisible] = React.useState(false);
    const [changePasswordVisible, setChangePasswordVisible] = React.useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
    const [localPhotoUri, setLocalPhotoUri] = React.useState<string | null>(null);

    // Fetch MFA status
    const { data: authProfileData } = useQuery({
        queryKey: ['auth-profile', 'mfa'],
        queryFn: async () => {
            const res = await authApi.getProfile();
            const profileData = (res as any)?.data;
            if (profileData) {
                const current = useAuthStore.getState().user;
                if (current) {
                    const merged: AuthUser = { ...current, mfaEnabled: profileData.mfaEnabled ?? false };
                    useAuthStore.setState({ user: merged });
                }
            }
            return profileData;
        },
        staleTime: 60_000,
    });
    const mfaEnabled = authProfileData?.mfaEnabled === true || user?.mfaEnabled === true;

    const profile: ProfileData | null = React.useMemo(() => {
        const d: any = (response as any)?.data ?? response;
        if (!d) return null;

        const name = `${asDisplayText(d.firstName)} ${asDisplayText(d.middleName ? d.middleName + ' ' : '')}${asDisplayText(d.lastName)}`.replace(/\s+/g, ' ').trim();

        const reportingTo = asDisplayText(d.reportingManager ?? d.reportingTo);
        const functionalManager = asDisplayText(d.functionalManager);

        return {
            name,
            employeeCode: asDisplayText(d.employeeId ?? d.employeeCode ?? d.code),
            designation: asDisplayText(d.designation),
            department: asDisplayText(d.department),
            // Personal
            dateOfBirth: formatDate(d.dateOfBirth),
            gender: humanizeEnum(d.gender),
            bloodGroup: asDisplayText(d.bloodGroup),
            maritalStatus: humanizeEnum(d.maritalStatus),
            nationality: asDisplayText(d.nationality) || 'Indian',
            fatherMotherName: asDisplayText(d.fatherMotherName ?? d.fatherName),
            // Contact
            officialEmail: asDisplayText(d.officialEmail ?? d.email ?? d.workEmail),
            personalEmail: asDisplayText(d.personalEmail),
            phone: asDisplayText(d.personalMobile ?? d.phone ?? d.mobile),
            altPhone: asDisplayText(d.alternativeMobile),
            emergencyContactName: asDisplayText(d.emergencyContactName),
            emergencyContactRelation: asDisplayText(d.emergencyContactRelation),
            emergencyContactMobile: asDisplayText(d.emergencyContactMobile),
            currentAddress: formatAddress(d.currentAddress),
            permanentAddress: formatAddress(d.permanentAddress),
            // Employment
            dateOfJoining: formatDate(d.joiningDate ?? d.dateOfJoining),
            probationEndDate: formatDate(d.probationEndDate),
            confirmationDate: formatDate(d.confirmationDate),
            noticePeriodDays: d.noticePeriodDays != null ? `${d.noticePeriodDays} day(s)` : '',
            reportingTo,
            functionalManager,
            employeeType: asDisplayText(d.employeeType),
            grade: asDisplayText(d.grade),
            shift: formatShift(d.shift),
            location: asDisplayText(d.location),
            costCentre: asDisplayText(d.costCentre),
            status: humanizeEnum(d.status),
            workType: humanizeEnum(d.workType),
            // Bank
            bankName: asDisplayText(d.bankName),
            accountNumber: asDisplayText(d.bankAccountNumber ?? d.accountNumber),
            ifscCode: asDisplayText(d.bankIfscCode ?? d.ifscCode),
            bankBranch: asDisplayText(d.bankBranch),
            accountType: humanizeEnum(d.accountType),
            // Statutory
            pan: asDisplayText(d.panNumber ?? d.pan),
            aadhaar: asDisplayText(d.aadhaarNumber ?? d.aadhaar),
            uan: asDisplayText(d.uan ?? d.uanNumber),
            esiNumber: asDisplayText(d.esiIpNumber ?? d.esiNumber),
            // Photo
            profilePhotoUrl: asDisplayText(d.profilePhotoUrl),
        };
    }, [response]);

    const editFormData: EditProfileFormData = React.useMemo(() => {
        const d: any = (response as any)?.data ?? response ?? {};
        return {
            personalMobile: d.personalMobile ?? d.phone ?? d.mobile ?? '',
            alternativeMobile: d.alternativeMobile ?? '',
            personalEmail: d.personalEmail ?? '',
            emergencyContactName: d.emergencyContactName ?? '',
            emergencyContactRelation: d.emergencyContactRelation ?? '',
            emergencyContactMobile: d.emergencyContactMobile ?? '',
            maritalStatus: d.maritalStatus ?? '',
            bloodGroup: d.bloodGroup ?? '',
        };
    }, [response]);

    const { upload: uploadPhoto } = useFileUpload({
        category: 'employee-photo',
        entityId: user?.id || 'me',
        onSuccess: (key) => {
            updateProfile.mutate({ profilePhotoUrl: key }, {
                onSuccess: () => {
                    setIsUploadingPhoto(false);
                    showSuccess('Profile photo updated');
                },
                onError: () => {
                    setIsUploadingPhoto(false);
                    setLocalPhotoUri(null);
                    showErrorMessage('Failed to update photo. Please try again.');
                },
            });
        },
        onError: () => {
            setIsUploadingPhoto(false);
            setLocalPhotoUri(null);
            showErrorMessage('Failed to upload photo. Please try again.');
        },
    });

    const { url: resolvedPhotoUrl } = useFileUrl({ key: profile?.profilePhotoUrl });

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showErrorMessage('Permission to access photos is required.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setLocalPhotoUri(asset.uri);
            setIsUploadingPhoto(true);
            let sizeBytes = asset.fileSize ?? 0;
            if (!sizeBytes) {
                const f = new ExpoFile(asset.uri);
                sizeBytes = f.exists ? f.size : 0;
            }
            await uploadPhoto({
                uri: asset.uri,
                name: 'photo.jpg',
                type: asset.mimeType || 'image/jpeg',
                size: sizeBytes,
            });
        }
    };

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
                <AppTopHeader title="My Profile" onMenuPress={toggle} />
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    if (error && !profile) {
        return (
            <View style={styles.container}>
                <AppTopHeader title="My Profile" onMenuPress={toggle} />
                <View style={{ paddingTop: 60, alignItems: 'center' }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load profile"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            </View>
        );
    }

    const incomplete = isProfileIncomplete(profile);
    const userEmail = user?.email ?? '';
    const displayName = profile?.name || user?.email || 'You';
    const photoUrl = localPhotoUri || resolvedPhotoUrl || undefined;

    return (
        <View style={styles.container}>
            <AppTopHeader title="My Profile" onMenuPress={toggle} />

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 34) + 48 }]}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => refetch()}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            >
                {/* Profile Header Card */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.profileHeaderCard}>
                    <ProfileAvatar
                        name={displayName}
                        photoUrl={photoUrl}
                        onPress={handlePickPhoto}
                        isUploading={isUploadingPhoto}
                    />
                    <Text className="mt-3 font-inter text-xl font-bold text-primary-950 dark:text-white">{displayName}</Text>
                    {(profile?.designation || profile?.department) ? (
                        <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">
                            {[profile.designation, profile.department].filter(Boolean).join(' \u2022 ')}
                        </Text>
                    ) : null}
                    {(profile?.officialEmail) ? (
                        <Text className="mt-1 font-inter text-xs text-neutral-400">{profile.officialEmail}</Text>
                    ) : null}
                    {(profile?.phone) ? (
                        <Text className="mt-0.5 font-inter text-xs text-neutral-400">{profile.phone}</Text>
                    ) : null}
                    {(profile?.status || profile?.workType) ? (
                        <View style={styles.badgeRow}>
                            {profile?.status ? (
                                <View style={[styles.statusBadge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                                    <Text className="font-inter text-[10px] font-bold uppercase tracking-wide text-primary-700">{profile.status}</Text>
                                </View>
                            ) : null}
                            {profile?.workType ? (
                                <View style={[styles.statusBadge, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100] }]}>
                                    <Text className="font-inter text-[10px] font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{profile.workType}</Text>
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                    {profile?.employeeCode ? (
                        <View style={styles.empCodeBadge}>
                            <Text className="font-inter text-xs font-semibold text-primary-600">{profile.employeeCode}</Text>
                        </View>
                    ) : null}
                    <Text className="mt-2 font-inter text-xs text-neutral-400">Tap photo to update</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* Incomplete profile banner */}
                    {incomplete && (
                        <IncompleteProfileBanner
                            userEmail={userEmail}
                            onGoToDirectory={() => router.push('/company/hr/employees' as any)}
                        />
                    )}

                    {/* Personal Information */}
                    <SectionCard title="Personal Information" icon={<UserIcon />}>
                        <InfoRow label="Full Name" value={profile?.name ?? ''} />
                        <InfoRow label="Date of Birth" value={profile?.dateOfBirth ?? ''} />
                        <InfoRow label="Gender" value={profile?.gender ?? ''} />
                        <InfoRow label="Blood Group" value={profile?.bloodGroup ?? ''} />
                        <InfoRow label="Marital Status" value={profile?.maritalStatus ?? ''} />
                        <InfoRow label="Nationality" value={profile?.nationality ?? ''} />
                        <InfoRow label="Father / Mother" value={profile?.fatherMotherName ?? ''} />
                    </SectionCard>

                    {/* Contact Information */}
                    <SectionCard title="Contact Information" icon={<PhoneIcon />}>
                        <InfoRow label="Official Email" value={profile?.officialEmail ?? ''} />
                        <InfoRow label="Personal Email" value={profile?.personalEmail ?? ''} />
                        <InfoRow label="Mobile" value={profile?.phone ?? ''} />
                        {profile?.altPhone ? <InfoRow label="Alt. Mobile" value={profile.altPhone} /> : null}
                        <InfoRow label="Emergency" value={profile?.emergencyContactName ?? ''} />
                        <InfoRow label="Relation" value={profile?.emergencyContactRelation ?? ''} />
                        <InfoRow label="Emergency No." value={profile?.emergencyContactMobile ?? ''} />
                        <InfoRow label="Current Address" value={profile?.currentAddress ?? ''} />
                        <InfoRow label="Permanent Addr." value={profile?.permanentAddress ?? ''} />
                    </SectionCard>

                    {/* Employment Details */}
                    <SectionCard title="Employment Details" icon={<BriefcaseIcon />}>
                        <InfoRow label="Employee ID" value={profile?.employeeCode ?? ''} />
                        <InfoRow label="Department" value={profile?.department ?? ''} />
                        <InfoRow label="Designation" value={profile?.designation ?? ''} />
                        <InfoRow label="Grade" value={profile?.grade ?? ''} />
                        <InfoRow label="Employee Type" value={profile?.employeeType ?? ''} />
                        <InfoRow label="Cost Centre" value={profile?.costCentre ?? ''} />
                        <InfoRow label="Date of Joining" value={profile?.dateOfJoining ?? ''} />
                        <InfoRow label="Probation End" value={profile?.probationEndDate ?? ''} />
                        <InfoRow label="Confirmation" value={profile?.confirmationDate ?? ''} />
                        <InfoRow label="Notice Period" value={profile?.noticePeriodDays ?? ''} />
                        <InfoRow label="Shift" value={profile?.shift ?? ''} />
                        <InfoRow label="Location" value={profile?.location ?? ''} />
                        <InfoRow label="Reporting Mgr" value={profile?.reportingTo ?? ''} />
                        <InfoRow label="Functional Mgr" value={profile?.functionalManager ?? ''} />
                        <InfoRow label="Status" value={profile?.status ?? ''} />
                        <InfoRow label="Work Type" value={profile?.workType ?? ''} />
                    </SectionCard>

                    {/* Bank Details */}
                    <SectionCard title="Bank Details" icon={<CreditCardIcon />}>
                        <InfoRow label="Bank Name" value={profile?.bankName ?? ''} />
                        <InfoRow label="Branch" value={profile?.bankBranch ?? ''} />
                        <InfoRow label="Account No." value={formatBankAccountLastFour(profile?.accountNumber)} />
                        <InfoRow label="IFSC Code" value={profile?.ifscCode ?? ''} />
                        <InfoRow label="Account Type" value={profile?.accountType ?? ''} />
                    </SectionCard>

                    {/* Statutory Details */}
                    <SectionCard title="Statutory Details" icon={<ShieldIcon />}>
                        <InfoRow label="PAN" value={maskPAN(profile?.pan)} />
                        <InfoRow label="Aadhaar" value={profile?.aadhaar ? '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ' + profile.aadhaar.slice(-4) : ''} />
                        <InfoRow label="UAN" value={profile?.uan ?? ''} />
                        <InfoRow label="ESI IP Number" value={profile?.esiNumber ?? ''} />
                    </SectionCard>

                    {/* Security */}
                    <SectionCard title="Security" icon={<LockIcon />}>
                        {/* MFA Row */}
                        <View style={styles.securityRow}>
                            <View style={styles.securityInfo}>
                                <ShieldIcon size={14} />
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">Two-Factor Authentication</Text>
                                    <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                        {mfaEnabled ? 'Authenticator app is active' : 'Add an extra layer of security'}
                                    </Text>
                                </View>
                            </View>
                            {mfaEnabled ? (
                                <View style={[styles.mfaBadge, { backgroundColor: colors.success[50] }]}>
                                    <Text className="font-inter text-xs font-bold text-success-700">Enabled</Text>
                                </View>
                            ) : (
                                <View style={[styles.mfaBadge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] }]}>
                                    <Text className="font-inter text-xs font-bold text-primary-600">Enable MFA</Text>
                                </View>
                            )}
                        </View>

                        {/* Change Password Row */}
                        <Pressable style={styles.securityRow} onPress={() => setChangePasswordVisible(true)}>
                            <View style={styles.securityInfo}>
                                <KeyIcon size={14} />
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">Change Password</Text>
                                    <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">Update your account password</Text>
                                </View>
                            </View>
                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                <Path d="M9 18l6-6-6-6" stroke={colors.neutral[400]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </Svg>
                        </Pressable>
                    </SectionCard>

                    {/* Edit & Save button */}
                    <Pressable onPress={() => setEditVisible(true)} style={styles.editBtn}>
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                            <Path
                                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                stroke={colors.white}
                                strokeWidth="1.8"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                        <Text className="font-inter text-sm font-bold text-white">Edit Profile</Text>
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

            <ChangePasswordModal
                visible={changePasswordVisible}
                onClose={() => setChangePasswordVisible(false)}
            />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50] },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

    // Profile header card
    profileHeaderCard: {
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 16,
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 24,
        marginBottom: 16,
        marginTop: 8,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },

    // Avatar
    avatarWrap: {
        position: 'relative',
        width: 90,
        height: 90,
    },
    avatarImage: {
        width: 90,
        height: 90,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: colors.primary[200],
    },
    avatarPlaceholder: {
        width: 90,
        height: 90,
        borderRadius: 28,
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary[200],
    },
    cameraBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    },

    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },

    empCodeBadge: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        borderWidth: 1,
        borderColor: isDark ? colors.primary[800] : colors.primary[100],
    },

    // Section cards
    sectionCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    sectionIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },

    // Security section
    securityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    securityInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    mfaBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },

    // Incomplete banner
    incompleteBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[800] : colors.primary[100],
    },
    incompleteBannerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: isDark ? colors.primary[800] : colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    goToDirectoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
        alignSelf: 'flex-start',
    },

    // Edit & Save button
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 54,
        borderRadius: 16,
        backgroundColor: colors.primary[600],
        marginTop: 12,
        marginBottom: 4,
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
});
const styles = createStyles(false);

// ============ EDIT PAGE STYLES ============

const editStyles = StyleSheet.create({
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    navCancel: {
        paddingHorizontal: 4,
        paddingVertical: 6,
        minWidth: 60,
    },
    navSave: {
        minWidth: 60,
        height: 36,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
    },
    formContent: {
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    groupLabel: {
        fontFamily: 'Inter',
        fontSize: 11,
        fontWeight: '700',
        color: colors.neutral[400],
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        overflow: 'hidden',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    fieldWrap: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    fieldLabel: {
        fontFamily: 'Inter',
        fontSize: 11,
        fontWeight: '600',
        color: colors.neutral[500],
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        fontFamily: 'Inter',
        fontSize: 15,
        color: colors.primary[950],
        paddingVertical: 0,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        backgroundColor: colors.neutral[50],
    },
    chipActive: {
        borderColor: colors.primary[500],
        backgroundColor: colors.primary[50],
    },
    chipText: {
        fontFamily: 'Inter',
        fontSize: 13,
        color: colors.neutral[500],
        fontWeight: '500',
    },
    chipTextActive: {
        color: colors.primary[700],
        fontWeight: '700',
    },
});

// ============ PASSWORD MODAL STYLES ============

const pwStyles = StyleSheet.create({
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});

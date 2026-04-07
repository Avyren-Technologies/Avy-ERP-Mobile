/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';

import { useUpdateMyProfile } from '@/features/company-admin/api/use-ess-mutations';
import { useMyProfile } from '@/features/company-admin/api/use-ess-queries';
import { useAuthStore } from '@/features/auth/use-auth-store';

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
    profilePhotoUrl: string;
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

function isProfileIncomplete(profile: ProfileData | null): boolean {
    if (!profile) return true;
    return !profile.name && !profile.designation && !profile.employeeCode;
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
            <Text className="font-inter text-xs text-neutral-500" style={{ width: 130 }}>{label}</Text>
            <Text className="font-inter text-sm font-semibold text-primary-950 flex-1" numberOfLines={2}>{value || '--'}</Text>
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
            {/* Camera badge */}
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
                <Text className="font-inter text-sm font-bold text-primary-900">Profile not set up yet</Text>
                <Text className="font-inter text-xs text-neutral-500">
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
    const [maritalPickerVisible, setMaritalPickerVisible] = React.useState(false);

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
            {/* KeyboardAvoidingView pushes content up when keyboard opens */}
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: colors.neutral[50] }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                {/* Top navigation bar */}
                <View style={[editStyles.navBar, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={onClose} style={editStyles.navCancel}>
                        <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Edit Profile</Text>
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

                {/* Scrollable form — keyboard won't hide any field */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={editStyles.formContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Contact ── */}
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

                    {/* ── Emergency Contact ── */}
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

                    {/* ── Other Details ── */}
                    <Text style={editStyles.groupLabel}>Other Details</Text>

                    <View style={editStyles.card}>
                        {/* Marital Status — inline picker, no nested modal */}
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

// ============ MAIN COMPONENT ============

export function MyProfileScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();
    const user = useAuthStore.use.user();
    const { data: response, isLoading, error, refetch, isFetching } = useMyProfile();
    const updateProfile = useUpdateMyProfile();
    const [editVisible, setEditVisible] = React.useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
    // Immediate local preview — shown right after pick, before server refetch
    const [localPhotoUri, setLocalPhotoUri] = React.useState<string | null>(null);

    const profile: ProfileData | null = React.useMemo(() => {
        const d: any = (response as any)?.data ?? response;
        if (!d) return null;

        // Full name: prefer composite name, else build from parts
        const name = asDisplayText(d.name)
            || `${asDisplayText(d.firstName)} ${asDisplayText(d.middleName ? d.middleName + ' ' : '')}${asDisplayText(d.lastName)}`.replace(/\s+/g, ' ').trim();

        // Reporting manager: can be an object {firstName, lastName} or {name}
        const rmRaw = d.reportingManager ?? d.reportingTo ?? d.managerName;
        const reportingTo = (() => {
            if (!rmRaw) return '';
            if (typeof rmRaw === 'string') return rmRaw;
            if (typeof rmRaw === 'object') {
                const r = rmRaw as any;
                return r.name ?? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim();
            }
            return '';
        })();

        // Address: can be an object {line1, line2, city, state, pin, country}
        const addrRaw = d.currentAddress ?? d.address;
        const address = (() => {
            if (!addrRaw) return '';
            if (typeof addrRaw === 'string') return addrRaw;
            if (typeof addrRaw === 'object') {
                const a = addrRaw as any;
                return [a.line1, a.line2, a.city, a.state, a.pin ?? a.pinCode, a.country]
                    .filter(Boolean).join(', ');
            }
            return '';
        })();

        return {
            name,
            employeeCode: asDisplayText(d.employeeCode ?? d.code),
            designation: asDisplayText(d.designation),
            department: asDisplayText(d.department),
            dateOfJoining: asDisplayText(d.joiningDate ?? d.dateOfJoining),
            reportingTo,
            employeeType: asDisplayText(d.employeeType ?? d.type),
            email: asDisplayText(d.officialEmail ?? d.email ?? d.workEmail),
            phone: asDisplayText(d.personalMobile ?? d.phone ?? d.mobile ?? d.contactNumber),
            address,
            emergencyContact: asDisplayText(d.emergencyContactName ?? d.emergencyContact ?? d.emergencyName),
            emergencyPhone: asDisplayText(d.emergencyContactMobile ?? d.emergencyPhone ?? d.emergencyContactPhone),
            // Bank — API stores as bankAccountNumber / bankIfscCode at root
            bankName: asDisplayText(d.bankName ?? d.bank),
            accountNumber: asDisplayText(d.bankAccountNumber ?? d.accountNumber),
            ifscCode: asDisplayText(d.bankIfscCode ?? d.ifscCode ?? d.ifsc),
            // Statutory — API stores as panNumber / aadhaarNumber / esiIpNumber
            pan: asDisplayText(d.panNumber ?? d.pan),
            aadhaar: asDisplayText(d.aadhaarNumber ?? d.aadhaar),
            uan: asDisplayText(d.uan ?? d.uanNumber),
            esiNumber: asDisplayText(d.esiIpNumber ?? d.esiNumber ?? d.esiNo),
            profilePhotoUrl: asDisplayText(d.profilePhotoUrl ?? d.photoUrl ?? d.photo),
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
            base64: true,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.base64) {
                const mimeType = asset.mimeType ?? 'image/jpeg';
                const photoUrl = `data:${mimeType};base64,${asset.base64}`;
                // Show immediately in UI without waiting for server round-trip
                setLocalPhotoUri(photoUrl);
                setIsUploadingPhoto(true);
                updateProfile.mutate({ profilePhotoUrl: photoUrl }, {
                    onSuccess: () => {
                        setIsUploadingPhoto(false);
                        showSuccess('Profile photo updated');
                    },
                    onError: () => {
                        setIsUploadingPhoto(false);
                        // Revert local preview on failure
                        setLocalPhotoUri(null);
                        showErrorMessage('Failed to update photo. Please try again.');
                    },
                });
            }
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
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={toggle} style={styles.hamburgerBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path d="M3 12h18M3 6h18M3 18h18" stroke={colors.primary[900]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </Svg>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">My Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
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
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={toggle} style={styles.hamburgerBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path d="M3 12h18M3 6h18M3 18h18" stroke={colors.primary[900]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </Svg>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">My Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
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
    // localPhotoUri gives instant feedback; falls back to server URL once refetched
    const photoUrl = localPhotoUri || profile?.profilePhotoUrl || undefined;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header — hamburger opens sidebar, title centred */}
            <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
                <Pressable onPress={toggle} style={styles.hamburgerBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M3 12h18M3 6h18M3 18h18" stroke={colors.primary[900]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">My Profile</Text>
                <View style={{ width: 40 }} />
            </View>

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
                    <Text className="mt-3 font-inter text-xl font-bold text-primary-950">{displayName}</Text>
                    {(profile?.designation || profile?.department) ? (
                        <Text className="mt-1 font-inter text-sm text-neutral-500">
                            {[profile.designation, profile.department].filter(Boolean).join(' \u2022 ')}
                        </Text>
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

                    {/* Personal Info */}
                    <SectionCard title="Personal Info">
                        <InfoRow label="Full Name" value={profile?.name ?? ''} />
                        <InfoRow label="Employee Code" value={profile?.employeeCode ?? ''} />
                        <InfoRow label="Designation" value={profile?.designation ?? ''} />
                        <InfoRow label="Department" value={profile?.department ?? ''} />
                    </SectionCard>

                    {/* Contact */}
                    <SectionCard title="Contact">
                        <InfoRow label="Official Email" value={profile?.email ?? ''} />
                        <InfoRow label="Phone" value={profile?.phone ?? ''} />
                        <InfoRow label="Address" value={profile?.address ?? ''} />
                        <InfoRow label="Emergency Contact" value={profile?.emergencyContact ?? ''} />
                        <InfoRow label="Emergency Phone" value={profile?.emergencyPhone ?? ''} />
                    </SectionCard>

                    {/* Employment */}
                    <SectionCard title="Employment Details">
                        <InfoRow label="Date of Joining" value={profile?.dateOfJoining ?? ''} />
                        <InfoRow label="Reporting To" value={profile?.reportingTo ?? ''} />
                        <InfoRow label="Employee Type" value={profile?.employeeType ?? ''} />
                    </SectionCard>

                    {/* Bank */}
                    <SectionCard title="Bank Details">
                        <InfoRow label="Bank Name" value={profile?.bankName ?? ''} />
                        <InfoRow label="Account No." value={maskValue(profile?.accountNumber ?? '')} />
                        <InfoRow label="IFSC Code" value={profile?.ifscCode ?? ''} />
                    </SectionCard>

                    {/* Statutory IDs */}
                    <SectionCard title="Statutory IDs">
                        <InfoRow label="PAN" value={profile?.pan ?? ''} />
                        <InfoRow label="Aadhaar" value={maskValue(profile?.aadhaar ?? '')} />
                        <InfoRow label="UAN" value={profile?.uan ?? ''} />
                        <InfoRow label="ESI Number" value={profile?.esiNumber ?? ''} />
                    </SectionCard>

                    {/* Edit & Save button — inside scroll so it is always rendered */}
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
                        <Text className="font-inter text-sm font-bold text-white">Edit &amp; Save Profile</Text>
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
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    scrollContent: { paddingHorizontal: 20 },

    // Profile header card
    profileHeaderCard: {
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 16,
        backgroundColor: colors.white,
        borderRadius: 24,
        marginBottom: 16,
        marginTop: 8,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.primary[50],
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
        backgroundColor: colors.primary[50],
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

    empCodeBadge: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[100],
    },

    // Section cards
    sectionCard: {
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
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },

    // Incomplete banner
    incompleteBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: colors.primary[50],
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.primary[100],
    },
    incompleteBannerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primary[100],
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

    // Modal form
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
    sectionDivider: {
        paddingVertical: 8,
        marginBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
        marginTop: 4,
    },
    fieldWrap: { marginBottom: 14 },
    inputWrap: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 48,
        justifyContent: 'center',
    },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
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
        flex: 2,
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },

    // Hamburger icon button
    hamburgerBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
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

// ============ EDIT PAGE STYLES ============

const editStyles = StyleSheet.create({
    // Top nav bar
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

    // Form layout
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

    // Marital status chips (no nested modal needed)
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

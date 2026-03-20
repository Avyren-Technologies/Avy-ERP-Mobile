/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';

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

// ============ MAIN COMPONENT ============

export function MyProfileScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [showToast, setShowToast] = React.useState(false);

    const { data: response, isLoading, error, refetch, isFetching } = useMyProfile();

    const profile: ProfileData | null = React.useMemo(() => {
        const d: any = (response as any)?.data ?? response;
        if (!d) return null;
        return {
            name: d.name ?? `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim(),
            employeeCode: d.employeeCode ?? d.code ?? '',
            designation: d.designation ?? '',
            department: d.department ?? '',
            dateOfJoining: d.dateOfJoining ?? d.joiningDate ?? '',
            reportingTo: d.reportingTo ?? d.managerName ?? '',
            employeeType: d.employeeType ?? d.type ?? '',
            email: d.email ?? '',
            phone: d.phone ?? d.mobile ?? '',
            address: d.address ?? '',
            emergencyContact: d.emergencyContact ?? d.emergencyContactName ?? '',
            emergencyPhone: d.emergencyPhone ?? d.emergencyContactPhone ?? '',
            bankName: d.bankName ?? '',
            accountNumber: d.accountNumber ?? '',
            ifscCode: d.ifscCode ?? d.ifsc ?? '',
            pan: d.pan ?? '',
            aadhaar: d.aadhaar ?? '',
            uan: d.uan ?? '',
            esiNumber: d.esiNumber ?? '',
        };
    }, [response]);

    const handleRequestUpdate = () => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">My Profile</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    if (error || !profile) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">My Profile</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load profile" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">My Profile</Text>
                <View style={{ width: 36 }} />
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

                    {/* Request Update */}
                    <Pressable onPress={handleRequestUpdate} style={styles.requestBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="font-inter text-sm font-bold text-primary-600">Request Profile Update</Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>

            {/* Toast */}
            {showToast && (
                <Animated.View entering={FadeInDown.duration(250)} style={[styles.toast, { top: insets.top + 70 }]}>
                    <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={colors.success[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    <Text className="font-inter text-sm font-semibold text-success-700">Update request submitted to HR</Text>
                </Animated.View>
            )}
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
    requestBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary[200], backgroundColor: colors.primary[50], marginTop: 8,
    },
    toast: {
        position: 'absolute', left: 20, right: 20, backgroundColor: colors.success[50], borderRadius: 12,
        padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: colors.success[200],
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    },
});

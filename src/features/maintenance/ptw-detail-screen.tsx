import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { SkeletonCard } from '@/components/ui/skeleton';
import { usePTW } from '@/features/maintenance/api/use-maintenance-queries';
import { useReviewPTW, useIssuePTW, useClosePTW, useRevokePTW } from '@/features/maintenance/api/use-maintenance-mutations';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

/* ── Class config ── */

const CLASS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    HOT_WORK: { label: 'Hot Work', bgColor: colors.danger[50], textColor: colors.danger[700] },
    CONFINED_SPACE: { label: 'Confined Space', bgColor: '#F5F3FF', textColor: '#6D28D9' },
    ELECTRICAL_ISOLATION: { label: 'Electrical', bgColor: colors.warning[50], textColor: colors.warning[700] },
    PRESSURE_RELEASE: { label: 'Pressure', bgColor: '#ECFEFF', textColor: '#0E7490' },
    GENERAL_WORK: { label: 'General', bgColor: colors.info[50], textColor: colors.info[700] },
};

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    REQUESTED: { label: 'Requested', bgColor: colors.info[50], textColor: colors.info[700] },
    UNDER_REVIEW: { label: 'Under Review', bgColor: colors.warning[50], textColor: colors.warning[700] },
    ISSUED: { label: 'Issued', bgColor: colors.success[50], textColor: colors.success[700] },
    ACTIVE: { label: 'Active', bgColor: '#ECFDF5', textColor: '#059669' },
    CLOSED: { label: 'Closed', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
    EXPIRED: { label: 'Expired', bgColor: colors.neutral[100], textColor: colors.neutral[500] },
    REVOKED: { label: 'Revoked', bgColor: colors.danger[50], textColor: colors.danger[700] },
};

/* ── Timeline events ── */

const TIMELINE_EVENTS: Record<string, { label: string; color: string }> = {
    REQUESTED: { label: 'Permit Requested', color: colors.info[500] },
    UNDER_REVIEW: { label: 'Sent for Review', color: colors.warning[500] },
    ISSUED: { label: 'Permit Issued', color: colors.success[500] },
    ACTIVE: { label: 'Work Started', color: '#059669' },
    CLOSED: { label: 'Permit Closed', color: colors.neutral[500] },
    EXPIRED: { label: 'Permit Expired', color: colors.neutral[400] },
    REVOKED: { label: 'Permit Revoked', color: colors.danger[500] },
};

/* ── Screen ── */

export function PTWDetailScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { data, isLoading, refetch, isRefetching } = usePTW(id ?? '');

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch]),
    );

    const permit: any = (data as any)?.data ?? {};

    const reviewMutation = useReviewPTW();
    const issueMutation = useIssuePTW();
    const closeMutation = useClosePTW();
    const revokeMutation = useRevokePTW();

    const [showRevokeModal, setShowRevokeModal] = React.useState(false);
    const [revokeReason, setRevokeReason] = React.useState('');

    const isPending = reviewMutation.isPending || issueMutation.isPending || closeMutation.isPending;

    const handleAction = async (action: 'review' | 'issue' | 'close') => {
        if (!id) return;
        try {
            if (action === 'review') await reviewMutation.mutateAsync({ id });
            else if (action === 'issue') await issueMutation.mutateAsync({ id });
            else await closeMutation.mutateAsync({ id });
        } catch (_err) { /* handled by mutation */ }
    };

    const handleRevoke = async () => {
        if (!id || !revokeReason.trim()) return;
        try {
            await revokeMutation.mutateAsync({ id, data: { revokeReason } });
            setShowRevokeModal(false);
            setRevokeReason('');
        } catch (_err) { /* handled */ }
    };

    const classCfg = CLASS_CONFIG[permit.ptwClass] ?? CLASS_CONFIG.GENERAL_WORK;
    const statusCfg = STATUS_CONFIG[permit.status] ?? STATUS_CONFIG.REQUESTED;

    const timeline: { status: string; date: string; by?: string }[] = permit.auditTrail ?? [];
    if (timeline.length === 0 && permit.status) {
        timeline.push({ status: permit.status, date: permit.createdAt ?? new Date().toISOString() });
    }

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <View style={{ padding: 24 }}><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            
            {/* Safe Top Header Bar */}
            <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }} hitSlop={12}>
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                        <Path
                            d="M19 12H5M12 19l-7-7 7-7"
                            stroke={colors.primary[600]}
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                    <Text className="font-inter text-sm font-bold text-primary-600">Back</Text>
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: insets.bottom + 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={refetch}
                        tintColor={colors.primary[600]}
                    />
                }
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
                        {permit.permitNumber ?? `PTW-${(id ?? '').slice(0, 6)}`}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <View style={[styles.badge, { backgroundColor: classCfg.bgColor }]}>
                            <Text className="font-inter" style={[styles.badgeText, { color: classCfg.textColor }]}>{classCfg.label}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: statusCfg.bgColor }]}>
                            <Text className="font-inter" style={[styles.badgeText, { color: statusCfg.textColor }]}>{statusCfg.label}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Info cards */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.cardsRow}>
                    {[
                        { label: 'Asset', value: permit.asset?.name ?? '---' },
                        { label: 'Requested By', value: permit.requestedBy?.name ?? '---' },
                        { label: 'Requested', value: permit.createdAt ? fmt.date(permit.createdAt) : '---' },
                        { label: 'Issued', value: permit.issuedAt ? fmt.dateTime(permit.issuedAt) : '---' },
                    ].map((c) => (
                        <View key={c.label} style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                            <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400">{c.label}</Text>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={2} style={{ marginTop: 4 }}>{c.value}</Text>
                        </View>
                    ))}
                </Animated.View>

                {/* Description */}
                {permit.description ? (
                    <Animated.View entering={FadeInUp.duration(400).delay(200)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400" style={{ marginBottom: 6 }}>Description</Text>
                        <Text className="font-inter text-sm text-neutral-700 dark:text-neutral-300">{permit.description}</Text>
                    </Animated.View>
                ) : null}

                {/* Hazards */}
                {permit.hazards ? (
                    <Animated.View entering={FadeInUp.duration(400).delay(250)} style={[styles.section, { backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : colors.danger[50], borderColor: isDark ? colors.danger[900] : colors.danger[100] }]}>
                        <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-danger-600" style={{ marginBottom: 6 }}>Hazards</Text>
                        <Text className="font-inter text-sm text-danger-800 dark:text-danger-300">{permit.hazards}</Text>
                    </Animated.View>
                ) : null}

                {/* Precautions */}
                {permit.precautions ? (
                    <Animated.View entering={FadeInUp.duration(400).delay(300)} style={[styles.section, { backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : colors.success[50], borderColor: isDark ? colors.success[900] : colors.success[100] }]}>
                        <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-success-600" style={{ marginBottom: 6 }}>Precautions</Text>
                        <Text className="font-inter text-sm text-success-800 dark:text-success-300">{permit.precautions}</Text>
                    </Animated.View>
                ) : null}

                {/* Emergency & Isolation */}
                {(permit.emergencyContact || permit.isolationDetails) ? (
                    <Animated.View entering={FadeInUp.duration(400).delay(350)} style={styles.cardsRow}>
                        {permit.emergencyContact ? (
                            <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400">Emergency Contact</Text>
                                <Text className="font-inter text-sm font-medium text-neutral-700 dark:text-neutral-300" style={{ marginTop: 4 }}>{permit.emergencyContact}</Text>
                            </View>
                        ) : null}
                        {permit.isolationDetails ? (
                            <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400">Isolation Details</Text>
                                <Text className="font-inter text-sm font-medium text-neutral-700 dark:text-neutral-300" style={{ marginTop: 4 }}>{permit.isolationDetails}</Text>
                            </View>
                        ) : null}
                    </Animated.View>
                ) : null}

                {/* Revoke reason */}
                {permit.status === 'REVOKED' && permit.revokeReason ? (
                    <Animated.View entering={FadeInUp.duration(400).delay(400)} style={[styles.section, { backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : colors.danger[50], borderColor: isDark ? colors.danger[900] : colors.danger[200] }]}>
                        <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-danger-600" style={{ marginBottom: 6 }}>Revocation Reason</Text>
                        <Text className="font-inter text-sm text-danger-800 dark:text-danger-300">{permit.revokeReason}</Text>
                    </Animated.View>
                ) : null}

                {/* Timeline */}
                <Animated.View entering={FadeInUp.duration(400).delay(450)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400" style={{ marginBottom: 12 }}>Status Timeline</Text>
                    {timeline.map((event, idx) => {
                        const evt = TIMELINE_EVENTS[event.status] ?? { label: event.status, color: colors.neutral[400] };
                        return (
                            <View key={idx} style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                <View style={{ alignItems: 'center' }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: evt.color }} />
                                    {idx < timeline.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200], marginTop: 4 }} />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{evt.label}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-500" style={{ marginTop: 2 }}>{event.date ? fmt.dateTime(event.date) : ''}</Text>
                                    {event.by ? <Text className="font-inter text-[10px] text-neutral-400" style={{ marginTop: 1 }}>by {event.by}</Text> : null}
                                </View>
                            </View>
                        );
                    })}
                </Animated.View>

                {/* Action buttons */}
                <Animated.View entering={FadeInUp.duration(400).delay(500)} style={{ marginTop: 16, gap: 10 }}>
                    {permit.status === 'REQUESTED' && (
                        <Pressable onPress={() => handleAction('review')} disabled={isPending} style={[styles.actionBtn, { backgroundColor: colors.warning[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Send for Review</Text>
                        </Pressable>
                    )}
                    {permit.status === 'UNDER_REVIEW' && (
                        <Pressable onPress={() => handleAction('issue')} disabled={isPending} style={[styles.actionBtn, { backgroundColor: colors.success[600] }]}>
                            <Text className="font-inter text-sm font-bold text-white">Issue Permit</Text>
                        </Pressable>
                    )}
                    {(permit.status === 'ISSUED' || permit.status === 'ACTIVE') && (
                        <>
                            <Pressable onPress={() => handleAction('close')} disabled={isPending} style={[styles.actionBtn, { backgroundColor: colors.neutral[600] }]}>
                                <Text className="font-inter text-sm font-bold text-white">Close Permit</Text>
                            </Pressable>
                            <Pressable onPress={() => setShowRevokeModal(true)} style={[styles.actionBtn, { backgroundColor: colors.danger[600] }]}>
                                <Text className="font-inter text-sm font-bold text-white">Revoke Permit</Text>
                            </Pressable>
                        </>
                    )}
                </Animated.View>
            </ScrollView>

            {/* ── Revoke Reason Modal Sheet ── */}
            <RNModal
                visible={showRevokeModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => { setShowRevokeModal(false); setRevokeReason(''); }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={[
                        revokeStyles.sheetContainer,
                        { backgroundColor: isDark ? '#1A1730' : colors.white, paddingTop: insets.top + 8 },
                    ]}>
                        {/* Sheet Header */}
                        <View style={[revokeStyles.sheetHeader, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                            <Pressable
                                onPress={() => { setShowRevokeModal(false); setRevokeReason(''); }}
                                hitSlop={12}
                            >
                                <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                            </Pressable>
                            <Text className="font-inter text-base font-bold text-danger-700">Revoke Permit</Text>
                            <View style={{ width: 52 }} />
                        </View>

                        {/* Sheet Body */}
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Warning banner */}
                            <View style={[revokeStyles.warningBanner, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : colors.danger[50], borderColor: isDark ? colors.danger[800] : colors.danger[200] }]}>
                                <Svg width={18} height={18} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                    <Path
                                        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                                        stroke={colors.danger[600]}
                                        strokeWidth="2"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                                <Text className="font-inter text-xs text-danger-700" style={{ flex: 1, lineHeight: 18 }}>
                                    This action is <Text className="font-inter text-xs font-bold text-danger-700">irreversible</Text>. Revoking will immediately invalidate this permit and notify all parties.
                                </Text>
                            </View>

                            {/* Reason input */}
                            <View style={{ marginTop: 20 }}>
                                <Text className="mb-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-500">Reason for Revocation *</Text>
                                <TextInput
                                    value={revokeReason}
                                    onChangeText={setRevokeReason}
                                    placeholder="Describe why this permit is being revoked..."
                                    placeholderTextColor={colors.neutral[400]}
                                    multiline
                                    numberOfLines={5}
                                    autoFocus
                                    style={[
                                        revokeStyles.reasonInput,
                                        {
                                            borderColor: revokeReason.trim()
                                                ? (isDark ? colors.danger[700] : colors.danger[400])
                                                : (isDark ? colors.neutral[700] : colors.neutral[200]),
                                            backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50],
                                            color: isDark ? colors.white : colors.neutral[900],
                                        },
                                    ]}
                                />
                                {!revokeReason.trim() && (
                                    <Text className="font-inter text-[10px] text-neutral-400" style={{ marginTop: 6 }}>
                                        A reason is required to proceed.
                                    </Text>
                                )}
                            </View>
                        </ScrollView>

                        {/* Sheet Footer */}
                        <View style={[revokeStyles.sheetFooter, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                            <Pressable
                                onPress={() => { setShowRevokeModal(false); setRevokeReason(''); }}
                                style={[revokeStyles.footerBtn, { backgroundColor: isDark ? '#252040' : colors.neutral[100] }]}
                            >
                                <Text className="font-inter text-sm font-bold text-neutral-600">Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleRevoke}
                                disabled={!revokeReason.trim() || revokeMutation.isPending}
                                style={[
                                    revokeStyles.footerBtn,
                                    { flex: 1.5, backgroundColor: colors.danger[600] },
                                    (!revokeReason.trim() || revokeMutation.isPending) && { opacity: 0.5 },
                                ]}
                            >
                                {revokeMutation.isPending ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text className="font-inter text-sm font-bold text-white">Confirm Revocation</Text>
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
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
    badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    infoCard: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    section: { borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    actionBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', opacity: 1 },
});

const revokeStyles = StyleSheet.create({
    sheetContainer: { flex: 1 },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
    },
    reasonInput: {
        borderWidth: 1.5,
        borderRadius: 14,
        padding: 14,
        fontSize: 14,
        minHeight: 130,
        textAlignVertical: 'top',
        lineHeight: 22,
    },
    sheetFooter: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 1,
    },
    footerBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

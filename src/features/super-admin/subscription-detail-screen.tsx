/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Modal as RNModal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInUp, SlideOutDown, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { showSuccess } from '@/components/ui/utils';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

import { USER_TIERS } from './tenant-onboarding/constants';

import {
    useSubscriptionDetail,
    useChangeBillingType,
    useChangeTier,
    useExtendTrial,
    useCancelSubscription,
    useReactivateSubscription,
} from '@/features/super-admin/api/use-subscription-queries';

import type {
    BillingType,
    SubscriptionStatus,
    AmcStatus,
    LocationCostBreakdown,
} from '@/lib/api/subscription';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ HELPERS ============

const BILLING_TYPE_LABELS: Record<BillingType, string> = {
    MONTHLY: 'Monthly',
    ANNUAL: 'Annual',
    ONE_TIME_AMC: 'One-Time + AMC',
};

function toStatusBadgeType(status: SubscriptionStatus): 'active' | 'trial' | 'suspended' | 'expired' | 'cancelled' {
    switch (status) {
        case 'TRIAL': return 'trial';
        case 'ACTIVE': return 'active';
        case 'SUSPENDED': return 'suspended';
        case 'CANCELLED': return 'cancelled';
        case 'EXPIRED': return 'expired';
    }
}

function amcStatusColor(status: AmcStatus): { bg: string; text: string } {
    switch (status) {
        case 'ACTIVE': return { bg: colors.success[50], text: colors.success[700] };
        case 'OVERDUE': return { bg: colors.warning[50], text: colors.warning[700] };
        case 'LAPSED': return { bg: colors.danger[50], text: colors.danger[700] };
        default: return { bg: colors.neutral[100], text: colors.neutral[500] };
    }
}

function formatCurrency(amount?: number): string {
    if (amount == null) return '--';
    return `₹${amount.toLocaleString('en-IN')}`;
}

// formatDate removed — use fmt.date() from useCompanyFormatter inside components

const isReactivatable = (status: SubscriptionStatus) =>
    status === 'SUSPENDED' || status === 'CANCELLED' || status === 'EXPIRED';

// ============ SUB-COMPONENTS ============

function BackButton({ onPress }: { onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={styles.backButton}>
            <ChevronLeft size={22} color={colors.white} strokeWidth={2} />
        </Pressable>
    );
}

function BillingTypeBadge({ type }: { type: BillingType }) {
    return (
        <View style={styles.billingBadge}>
            <Text className="font-inter text-[10px] font-bold text-primary-700">
                {BILLING_TYPE_LABELS[type]}
            </Text>
        </View>
    );
}

function TierBadge({ tier }: { tier: string }) {
    const tierMeta = USER_TIERS.find((t) => t.key === tier.toLowerCase());
    return (
        <View style={[styles.billingBadge, { backgroundColor: colors.accent[50] }]}>
            <Text className="font-inter text-[10px] font-bold text-accent-700">
                {tierMeta?.label ?? tier}
            </Text>
        </View>
    );
}

function AmcStatusBadge({ status }: { status: AmcStatus }) {
    const { bg, text } = amcStatusColor(status);
    return (
        <View style={[styles.billingBadge, { backgroundColor: bg }]}>
            <Text className="font-inter text-[10px] font-bold" style={{ color: text }}>
                AMC: {status}
            </Text>
        </View>
    );
}

function LocationCard({ location, index }: { location: LocationCostBreakdown; index: number }) {
    const fmt = useCompanyFormatter();
    const formatDate = (d?: string) => !d ? '--' : fmt.date(d);
    const showAmc = location.billingType === 'ONE_TIME_AMC' && location.endpointType === 'default';

    return (
        <Animated.View entering={FadeInDown.delay(index * 60).duration(300)} style={styles.locationCard}>
            {/* Header row */}
            <View style={styles.locationHeader}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                        {location.locationName}
                    </Text>
                    <Text className="font-inter text-xs text-neutral-400 mt-0.5">
                        {location.facilityType}
                    </Text>
                </View>
                <BillingTypeBadge type={location.billingType} />
            </View>

            {/* Badges row */}
            <View style={styles.badgesRow}>
                <TierBadge tier={location.userTier} />
                <View style={[styles.billingBadge, { backgroundColor: colors.neutral[100] }]}>
                    <Text className="font-inter text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                        {location.modulesCount} modules
                    </Text>
                </View>
                {showAmc && location.amcStatus && location.amcStatus !== 'NOT_APPLICABLE' && (
                    <AmcStatusBadge status={location.amcStatus} />
                )}
            </View>

            {/* Pricing hidden — uncomment when pricing is finalized
            <View style={styles.costSection}>
                {location.billingType === 'MONTHLY' && (
                    <View style={styles.costRow}>
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Monthly Cost</Text>
                        <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100">
                            {formatCurrency(location.monthlyCost)}/month
                        </Text>
                    </View>
                )}
                {location.billingType === 'ANNUAL' && (
                    <View style={styles.costRow}>
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Annual Cost</Text>
                        <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100">
                            {formatCurrency(location.annualCost)}/year
                        </Text>
                    </View>
                )}
                {location.billingType === 'ONE_TIME_AMC' && (
                    <>
                        <View style={styles.costRow}>
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">One-Time Cost</Text>
                            <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100">
                                {formatCurrency(location.oneTimeCost)} one-time
                            </Text>
                        </View>
                        {showAmc && location.amcCost != null && (
                            <View style={styles.costRow}>
                                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">AMC</Text>
                                <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100">
                                    {formatCurrency(location.amcCost)}/year
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </View>
            */}

            {/* Dates */}
            <View style={styles.datesRow}>
                {location.nextRenewalDate && (
                    <View style={styles.dateItem}>
                        <Text className="font-inter text-[10px] text-neutral-400">Next Renewal</Text>
                        <Text className="font-inter text-xs font-semibold text-neutral-700">
                            {formatDate(location.nextRenewalDate)}
                        </Text>
                    </View>
                )}
                {showAmc && location.amcDueDate && (
                    <View style={styles.dateItem}>
                        <Text className="font-inter text-[10px] text-neutral-400">AMC Due</Text>
                        <Text className="font-inter text-xs font-semibold text-neutral-700">
                            {formatDate(location.amcDueDate)}
                        </Text>
                    </View>
                )}
                {location.trialEndDate && (
                    <View style={styles.dateItem}>
                        <Text className="font-inter text-[10px] text-neutral-400">Trial Ends</Text>
                        <Text className="font-inter text-xs font-semibold text-neutral-700">
                            {formatDate(location.trialEndDate)}
                        </Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ ACTION MODALS ============

type ActionModal = 'billing' | 'tier' | 'trial' | 'cancel' | 'reactivate' | null;

function BillingTypeSelector({
    selected,
    onChange,
}: {
    selected: BillingType;
    onChange: (val: BillingType) => void;
}) {
    const options: BillingType[] = ['MONTHLY', 'ANNUAL', 'ONE_TIME_AMC'];
    return (
        <View style={{ gap: 8, marginTop: 12 }}>
            {options.map((opt) => (
                <Pressable
                    key={opt}
                    onPress={() => onChange(opt)}
                    style={[
                        styles.radioOption,
                        selected === opt && styles.radioOptionSelected,
                    ]}
                >
                    <View style={[styles.radioCircle, selected === opt && styles.radioCircleSelected]}>
                        {selected === opt && <View style={styles.radioInner} />}
                    </View>
                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                        {BILLING_TYPE_LABELS[opt]}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}

function TierSelector({
    selected,
    onChange,
}: {
    selected: string;
    onChange: (val: string) => void;
}) {
    return (
        <View style={{ gap: 8, marginTop: 12 }}>
            {USER_TIERS.map((tier) => (
                <Pressable
                    key={tier.key}
                    onPress={() => onChange(tier.key)}
                    style={[
                        styles.radioOption,
                        selected === tier.key && styles.radioOptionSelected,
                    ]}
                >
                    <View style={[styles.radioCircle, selected === tier.key && styles.radioCircleSelected]}>
                        {selected === tier.key && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                            {tier.label}
                        </Text>
                        <Text className="font-inter text-xs text-neutral-400">
                            Up to {tier.maxUsers} users
                            {/* Pricing hidden — uncomment when pricing is finalized
                            &middot; {formatCurrency(tier.basePrice)}/mo
                            */}
                        </Text>
                    </View>
                </Pressable>
            ))}
        </View>
    );
}

// ============ MAIN SCREEN ============

export function SubscriptionDetailScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const router = useRouter();
    const { companyId } = useLocalSearchParams<{ companyId: string }>();
    const insets = useSafeAreaInsets();
    const fmt = useCompanyFormatter();
    const formatDate = (d?: string) => !d ? '--' : fmt.date(d);

    // Data
    const { data: subResponse, isLoading, isError, refetch } = useSubscriptionDetail(companyId ?? '');
    const subscription = (subResponse as any)?.data ?? subResponse;

    // Mutations
    const changeBillingMutation = useChangeBillingType();
    const changeTierMutation = useChangeTier();
    const extendTrialMutation = useExtendTrial();
    const cancelMutation = useCancelSubscription();
    const reactivateMutation = useReactivateSubscription();

    // Action modal state
    const [activeModal, setActiveModal] = React.useState<ActionModal>(null);
    const [selectedBillingType, setSelectedBillingType] = React.useState<BillingType>('MONTHLY');
    const [selectedTier, setSelectedTier] = React.useState<string>('starter');
    const [trialDate, setTrialDate] = React.useState<string>('');

    // ConfirmModal for cancel + reactivate
    const confirmModal = useConfirmModal();

    const isMutating = changeBillingMutation.isPending || changeTierMutation.isPending
        || extendTrialMutation.isPending || cancelMutation.isPending || reactivateMutation.isPending;

    // Handlers
    const handleChangeBillingType = () => {
        if (!companyId) return;
        changeBillingMutation.mutate(
            { companyId, data: { billingType: selectedBillingType } },
            {
                onSuccess: () => {
                    showSuccess('Billing Type Updated');
                    setActiveModal(null);
                },
            },
        );
    };

    const handleChangeTier = () => {
        if (!companyId) return;
        changeTierMutation.mutate(
            { companyId, data: { newTier: selectedTier } },
            {
                onSuccess: () => {
                    showSuccess('Tier Updated');
                    setActiveModal(null);
                },
            },
        );
    };

    const handleExtendTrial = () => {
        if (!companyId || !trialDate) return;
        extendTrialMutation.mutate(
            { companyId, data: { newEndDate: trialDate } },
            {
                onSuccess: () => {
                    showSuccess('Trial Extended');
                    setActiveModal(null);
                },
            },
        );
    };

    const handleCancel = () => {
        if (!companyId) return;
        confirmModal.show({
            title: 'Cancel Subscription',
            message: 'This will cancel the subscription and set a 30-day export window. All data will be available for export during this period. This action cannot be easily undone.',
            variant: 'danger',
            confirmText: 'Cancel Subscription',
            onConfirm: () => {
                cancelMutation.mutate(companyId, {
                    onSuccess: () => showSuccess('Subscription Cancelled'),
                });
            },
        });
    };

    const handleReactivate = () => {
        if (!companyId) return;
        confirmModal.show({
            title: 'Reactivate Subscription',
            message: 'This will reactivate the subscription and restore access to all modules and features.',
            variant: 'primary',
            confirmText: 'Reactivate',
            onConfirm: () => {
                reactivateMutation.mutate(companyId, {
                    onSuccess: () => showSuccess('Subscription Reactivated'),
                });
            },
        });
    };

    // Open modal with defaults
    const openBillingModal = () => {
        setSelectedBillingType(subscription?.defaultBillingType ?? 'MONTHLY');
        setActiveModal('billing');
    };

    const openTierModal = () => {
        const firstTier = subscription?.locations?.[0]?.userTier ?? 'starter';
        setSelectedTier(firstTier.toLowerCase());
        setActiveModal('tier');
    };

    const openTrialModal = () => {
        setTrialDate('');
        setActiveModal('trial');
    };

    // ============ RENDER ============

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient
                    colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 20 }}>
                        <BackButton onPress={() => router.back()} />
                    </View>
                </LinearGradient>
                <View style={{ padding: 16, gap: 16 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    if (isError || !subscription) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient
                    colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 20 }}>
                        <BackButton onPress={() => router.back()} />
                    </View>
                </LinearGradient>
                <EmptyState
                    icon="error"
                    title="Subscription Not Found"
                    message="Could not load subscription details for this company."
                    action={{ label: 'Retry', onPress: () => refetch() }}
                />
            </View>
        );
    }

    const status = subscription.status as SubscriptionStatus;
    const locations = subscription.locations ?? [];

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ===== HEADER ===== */}
                <LinearGradient
                    colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 24 }}>
                        <BackButton onPress={() => router.back()} />

                        <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 16 }}>
                            <Text className="font-inter text-xl font-bold text-white" numberOfLines={1}>
                                {subscription.tenantName}
                            </Text>
                            <Text className="font-inter text-sm text-white/70 mt-1">
                                Subscription Detail
                            </Text>

                            <View style={styles.headerBadgesRow}>
                                <StatusBadge status={toStatusBadgeType(status)} size="sm" />
                                <BillingTypeBadge type={subscription.defaultBillingType} />
                            </View>

                            <Text className="font-inter text-xs text-white/60 mt-2">
                                Started {formatDate(subscription.startDate)}
                            </Text>
                        </Animated.View>
                    </View>
                </LinearGradient>

                {/* ===== LOCATION CARDS ===== */}
                <View style={styles.section}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-3">
                        Locations ({locations.length})
                    </Text>

                    {locations.length === 0 ? (
                        <EmptyState
                            icon="inbox"
                            title="No Locations"
                            message="No location cost breakdown available."
                        />
                    ) : (
                        locations.map((loc: LocationCostBreakdown, i: number) => (
                            <LocationCard key={loc.locationId} location={loc} index={i} />
                        ))
                    )}
                </View>

                {/* ===== ACTIONS ===== */}
                <View style={styles.section}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-3">
                        Actions
                    </Text>

                    <View style={styles.actionsGrid}>
                        <Pressable
                            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.8 }]}
                            onPress={openBillingModal}
                            disabled={isMutating}
                        >
                            <Text className="font-inter text-xs font-bold text-primary-600">
                                Change Billing Type
                            </Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.8 }]}
                            onPress={openTierModal}
                            disabled={isMutating}
                        >
                            <Text className="font-inter text-xs font-bold text-primary-600">
                                Change Tier
                            </Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.8 }]}
                            onPress={openTrialModal}
                            disabled={isMutating}
                        >
                            <Text className="font-inter text-xs font-bold text-primary-600">
                                Extend Trial
                            </Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [styles.actionButtonDanger, pressed && { opacity: 0.8 }]}
                            onPress={handleCancel}
                            disabled={isMutating}
                        >
                            <Text className="font-inter text-xs font-bold text-danger-600">
                                Cancel Subscription
                            </Text>
                        </Pressable>

                        {isReactivatable(status) && (
                            <Pressable
                                style={({ pressed }) => [styles.actionButtonSuccess, pressed && { opacity: 0.8 }]}
                                onPress={handleReactivate}
                                disabled={isMutating}
                            >
                                <Text className="font-inter text-xs font-bold text-success-700">
                                    Reactivate
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* ===== ACTION MODALS (custom bottom sheets with selectors) ===== */}

            {/* Change Billing Type */}
            <RNModal visible={activeModal === 'billing'} transparent animationType="none" statusBarTranslucent onRequestClose={() => setActiveModal(null)}>
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={styles.modalBackdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveModal(null)} />
                    <Animated.View entering={SlideInUp.duration(300).easing(Easing.out(Easing.cubic))} exiting={SlideOutDown.duration(250)} style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text className="text-center font-inter text-lg font-bold text-primary-950 dark:text-white">Change Billing Type</Text>
                        <Text className="mt-1 text-center font-inter text-sm text-neutral-500 dark:text-neutral-400">Select the new billing type.</Text>
                        <BillingTypeSelector selected={selectedBillingType} onChange={setSelectedBillingType} />
                        <View style={styles.modalActions}>
                            <Pressable style={({ pressed }) => [styles.modalCancelBtn, pressed && { opacity: 0.8 }]} onPress={() => setActiveModal(null)}>
                                <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                            </Pressable>
                            <Pressable style={({ pressed }) => [styles.modalConfirmBtn, pressed && { opacity: 0.85 }]} onPress={handleChangeBillingType}>
                                <Text className="font-inter text-sm font-bold text-white">
                                    {changeBillingMutation.isPending ? 'Updating...' : 'Update'}
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </Animated.View>
            </RNModal>

            {/* Change Tier */}
            <RNModal visible={activeModal === 'tier'} transparent animationType="none" statusBarTranslucent onRequestClose={() => setActiveModal(null)}>
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={styles.modalBackdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveModal(null)} />
                    <Animated.View entering={SlideInUp.duration(300).easing(Easing.out(Easing.cubic))} exiting={SlideOutDown.duration(250)} style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text className="text-center font-inter text-lg font-bold text-primary-950 dark:text-white">Change User Tier</Text>
                        <Text className="mt-1 text-center font-inter text-sm text-neutral-500 dark:text-neutral-400">Select the new tier.</Text>
                        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                            <TierSelector selected={selectedTier} onChange={setSelectedTier} />
                        </ScrollView>
                        <View style={styles.modalActions}>
                            <Pressable style={({ pressed }) => [styles.modalCancelBtn, pressed && { opacity: 0.8 }]} onPress={() => setActiveModal(null)}>
                                <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                            </Pressable>
                            <Pressable style={({ pressed }) => [styles.modalConfirmBtn, pressed && { opacity: 0.85 }]} onPress={handleChangeTier}>
                                <Text className="font-inter text-sm font-bold text-white">
                                    {changeTierMutation.isPending ? 'Updating...' : 'Update'}
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </Animated.View>
            </RNModal>

            {/* Extend Trial */}
            <RNModal visible={activeModal === 'trial'} transparent animationType="none" statusBarTranslucent onRequestClose={() => setActiveModal(null)}>
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={styles.modalBackdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveModal(null)} />
                    <Animated.View entering={SlideInUp.duration(300).easing(Easing.out(Easing.cubic))} exiting={SlideOutDown.duration(250)} style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text className="text-center font-inter text-lg font-bold text-primary-950 dark:text-white">Extend Trial Period</Text>
                        <Text className="mt-1 text-center font-inter text-sm text-neutral-500 dark:text-neutral-400">Enter the new trial end date (YYYY-MM-DD).</Text>
                        <TextInput
                            style={styles.dateInput}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.neutral[400]}
                            value={trialDate}
                            onChangeText={setTrialDate}
                            keyboardType="numbers-and-punctuation"
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={({ pressed }) => [styles.modalCancelBtn, pressed && { opacity: 0.8 }]} onPress={() => setActiveModal(null)}>
                                <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                            </Pressable>
                            <Pressable style={({ pressed }) => [styles.modalConfirmBtn, pressed && { opacity: 0.85 }]} onPress={handleExtendTrial}>
                                <Text className="font-inter text-sm font-bold text-white">
                                    {extendTrialMutation.isPending ? 'Extending...' : 'Extend'}
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </Animated.View>
            </RNModal>

            {/* Cancel / Reactivate uses ConfirmModal via hook */}
            <ConfirmModal {...confirmModal.modalProps} />

            {/* Global loading overlay */}
            {isMutating && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary[600]} />
                </View>
            )}
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    headerGradient: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBadgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
    },
    section: {
        paddingHorizontal: 16,
        marginTop: 20,
    },
    locationCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
    },
    billingBadge: {
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    costSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 6,
    },
    costRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    datesRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 10,
    },
    dateItem: {
        gap: 2,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        borderWidth: 1,
        borderColor: isDark ? colors.primary[800] : colors.primary[100],
    },
    actionButtonDanger: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.danger[50],
        borderWidth: 1,
        borderColor: colors.danger[100],
    },
    actionButtonSuccess: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.success[50],
        borderWidth: 1,
        borderColor: colors.success[100],
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 12,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderWidth: 1.5,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    radioOptionSelected: {
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        borderColor: colors.primary[400],
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.neutral[300],
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleSelected: {
        borderColor: colors.primary[600],
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary[600],
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral[300],
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    modalCancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    modalConfirmBtn: {
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
    dateInput: {
        marginTop: 12,
        borderWidth: 1.5,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Inter',
        color: colors.primary[950],
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
});
const styles = createStyles(false);

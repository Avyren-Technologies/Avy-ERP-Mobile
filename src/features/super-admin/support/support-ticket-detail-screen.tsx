/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';

import { usePlatformSupportTicket } from '@/features/super-admin/api/use-support-queries';
import {
    useApproveModuleChange,
    useRejectModuleChange,
    useReplySupportTicket,
    useUpdateTicketStatus,
} from '@/features/super-admin/api/use-support-mutations';
import { useTicketSocket } from '@/hooks/use-ticket-socket';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ CONSTANTS ============

const STATUS_TRANSITIONS: Record<string, string[]> = {
    OPEN: ['IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'],
    IN_PROGRESS: ['WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'],
    WAITING_ON_CUSTOMER: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    RESOLVED: ['CLOSED'],
    CLOSED: [],
};

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'] as const;

// ============ HELPERS ============

function getStatusColor(status: string) {
    switch (status) {
        case 'OPEN': return { bg: colors.info[50], text: colors.info[700], active: colors.info[500] };
        case 'IN_PROGRESS': return { bg: colors.warning[50], text: colors.warning[700], active: colors.warning[500] };
        case 'WAITING_ON_CUSTOMER': return { bg: colors.accent[50], text: colors.accent[700], active: colors.accent[500] };
        case 'RESOLVED': return { bg: colors.success[50], text: colors.success[700], active: colors.success[500] };
        case 'CLOSED': return { bg: colors.neutral[100], text: colors.neutral[600], active: colors.neutral[400] };
        default: return { bg: colors.neutral[100], text: colors.neutral[600], active: colors.neutral[400] };
    }
}

function formatStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// formatTime removed — use fmt.dateTime() from useCompanyFormatter inside components

// ============ ICONS ============

function BackIcon() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function SendIcon({ color }: { color: string }) {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

// ============ SUB-COMPONENTS ============

function ChatBubble({ message, isAdmin, isSystem }: { message: any; isAdmin: boolean; isSystem: boolean }) {
    const fmt = useCompanyFormatter();
    const formatTime = (d: string) => fmt.dateTime(d);
    if (isSystem) {
        return (
            <View style={{ alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20 }}>
                <Text className="font-inter text-xs italic text-neutral-400" style={{ textAlign: 'center' }}>
                    {message.body ?? message.content ?? message.text}
                </Text>
                <Text className="mt-1 font-inter text-[10px] text-neutral-300" style={{ textAlign: 'center' }}>
                    {formatTime(message.createdAt ?? message.timestamp)}
                </Text>
            </View>
        );
    }
    return (
        <View style={[styles.bubbleWrap, isAdmin ? styles.bubbleRight : styles.bubbleLeft]}>
            <View style={[styles.bubble, isAdmin ? styles.bubbleAdmin : styles.bubbleUser]}>
                <Text className="font-inter text-xs font-semibold" style={{ color: isAdmin ? colors.primary[200] : colors.neutral[500], marginBottom: 2 }}>
                    {message.senderName ?? (isAdmin ? 'Admin' : 'User')}
                </Text>
                <Text className="font-inter text-sm" style={{ color: isAdmin ? '#fff' : colors.neutral[800] }}>
                    {message.body ?? message.content ?? message.text}
                </Text>
                <Text className="font-inter text-[10px]" style={{ color: isAdmin ? 'rgba(255,255,255,0.6)' : colors.neutral[400], marginTop: 4, alignSelf: 'flex-end' }}>
                    {formatTime(message.createdAt ?? message.timestamp)}
                </Text>
            </View>
        </View>
    );
}

function StatusChips({
    current,
    onSelect,
    isUpdating,
}: {
    current: string;
    onSelect: (status: string) => void;
    isUpdating: boolean;
}) {
    return (
        <View style={styles.statusSection}>
            <Text className="font-inter text-xs font-semibold text-neutral-400" style={{ marginBottom: 6, letterSpacing: 1 }}>
                UPDATE STATUS
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChipRow}>
                {TICKET_STATUSES.map(status => {
                    const isActive = current === status;
                    const allowed = STATUS_TRANSITIONS[current] ?? [];
                    const isDisabled = isUpdating || isActive || !allowed.includes(status);
                    const style = getStatusColor(status);
                    return (
                        <Pressable
                            key={status}
                            disabled={isDisabled}
                            onPress={() => onSelect(status)}
                            style={[
                                styles.statusChip,
                                { backgroundColor: isActive ? style.active : style.bg, opacity: isDisabled ? 0.6 : 1 },
                            ]}
                        >
                            <Text
                                className="font-inter text-xs font-bold"
                                style={{ color: isActive ? '#fff' : style.text }}
                            >
                                {formatStatusLabel(status)}
                            </Text>
                        </Pressable>
                    );
                })}
                {isUpdating && <ActivityIndicator size="small" color={colors.primary[400]} />}
            </ScrollView>
        </View>
    );
}

function ModuleChangeActions({
    ticketId,
    onApprovePress,
    onRejectPress,
    isApproving,
    isRejecting,
}: {
    ticketId: string;
    onApprovePress: () => void;
    onRejectPress: () => void;
    isApproving: boolean;
    isRejecting: boolean;
}) {
    return (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.moduleActions}>
            <Text className="font-inter text-xs font-semibold text-neutral-400" style={{ marginBottom: 8, letterSpacing: 1 }}>
                {'\u26A1'} MODULE CHANGE REQUEST
            </Text>
            <View style={styles.moduleActionRow}>
                <Pressable
                    onPress={onApprovePress}
                    disabled={isApproving || isRejecting}
                    style={[styles.moduleBtn, styles.moduleBtnApprove, (isApproving || isRejecting) && { opacity: 0.6 }]}
                >
                    {isApproving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text className="font-inter text-sm font-bold text-white">Approve</Text>
                    )}
                </Pressable>
                <Pressable
                    onPress={onRejectPress}
                    disabled={isApproving || isRejecting}
                    style={[styles.moduleBtn, styles.moduleBtnReject, (isApproving || isRejecting) && { opacity: 0.6 }]}
                >
                    {isRejecting ? (
                        <ActivityIndicator size="small" color={colors.danger[600]} />
                    ) : (
                        <Text className="font-inter text-sm font-bold" style={{ color: colors.danger[600] }}>Reject</Text>
                    )}
                </Pressable>
            </View>
        </Animated.View>
    );
}

function RejectReasonInput({
    value,
    onChange,
    onSubmit,
    onCancel,
    isSubmitting,
}: {
    value: string;
    onChange: (text: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.rejectSection}>
            <Text className="font-inter text-xs font-semibold text-neutral-500 dark:text-neutral-400" style={{ marginBottom: 6 }}>
                Rejection Reason
            </Text>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Enter reason for rejection..."
                placeholderTextColor={colors.neutral[400]}
                multiline
                style={styles.rejectInput}
            />
            <View style={styles.rejectBtnRow}>
                <Pressable onPress={onCancel} style={styles.rejectCancelBtn}>
                    <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-400">Cancel</Text>
                </Pressable>
                <Pressable
                    onPress={onSubmit}
                    disabled={!value.trim() || isSubmitting}
                    style={[styles.rejectSubmitBtn, (!value.trim() || isSubmitting) && { opacity: 0.5 }]}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text className="font-inter text-sm font-bold text-white">Submit Rejection</Text>
                    )}
                </Pressable>
            </View>
        </Animated.View>
    );
}

// ============ MAIN SCREEN ============

export function SupportTicketDetailScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const ticketQuery = usePlatformSupportTicket(id ?? '');
    const replyMutation = useReplySupportTicket();
    const statusMutation = useUpdateTicketStatus();
    const approveMutation = useApproveModuleChange();
    const rejectMutation = useRejectModuleChange();

    const confirmModal = useConfirmModal();

    const [messageText, setMessageText] = React.useState('');
    const [showRejectInput, setShowRejectInput] = React.useState(false);
    const [rejectReason, setRejectReason] = React.useState('');
    const flatListRef = React.useRef<FlashListRef<any>>(null);

    const ticket = ticketQuery.data?.data ?? ticketQuery.data ?? null;
    const messages = ticket?.messages ?? ticket?.conversation ?? [];
    const messageList = Array.isArray(messages) ? messages : [];
    const isModuleChange = ticket?.category === 'MODULE_CHANGE';
    const currentStatus = ticket?.status ?? 'OPEN';

    const handleSend = React.useCallback(() => {
        if (!messageText.trim() || !id) return;
        replyMutation.mutate(
            { id, body: messageText.trim() },
            {
                onSuccess: () => {
                    setMessageText('');
                    ticketQuery.refetch();
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
                },
            },
        );
    }, [messageText, id, replyMutation, ticketQuery]);

    const handleStatusChange = React.useCallback(
        (status: string) => {
            if (!id) return;
            statusMutation.mutate(
                { id, status },
                { onSuccess: () => ticketQuery.refetch() },
            );
        },
        [id, statusMutation, ticketQuery],
    );

    const handleApprove = React.useCallback(() => {
        confirmModal.show({
            title: 'Approve Module Change',
            message: 'Are you sure you want to approve this module change request? This will apply the changes to the tenant.',
            variant: 'primary',
            confirmText: 'Approve',
            onConfirm: () => {
                if (!id) return;
                approveMutation.mutate(id, {
                    onSuccess: () => ticketQuery.refetch(),
                });
            },
        });
    }, [id, confirmModal, approveMutation, ticketQuery]);

    const handleRejectPress = React.useCallback(() => {
        setShowRejectInput(true);
        setRejectReason('');
    }, []);

    const handleRejectSubmit = React.useCallback(() => {
        if (!id || !rejectReason.trim()) return;
        rejectMutation.mutate(
            { id, reason: rejectReason.trim() },
            {
                onSuccess: () => {
                    setShowRejectInput(false);
                    setRejectReason('');
                    ticketQuery.refetch();
                },
            },
        );
    }, [id, rejectReason, rejectMutation, ticketQuery]);

    useTicketSocket(id as string, undefined, true);

    const renderMessage = React.useCallback(
        ({ item }: { item: any }) => {
            const isSystem = item.senderRole === 'SYSTEM' || item.isSystemMessage === true;
            const isAdmin = item.senderRole === 'SUPER_ADMIN' || item.senderRole === 'PLATFORM_ADMIN' || item.senderRole === 'admin';
            return <ChatBubble message={item} isAdmin={isAdmin} isSystem={isSystem} />;
        },
        [],
    );

    if (ticketQuery.isLoading) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color={colors.primary[500]} />
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            {/* Header */}
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 8 }]}
            >
                <View style={styles.headerRow}>
                    <Pressable onPress={() => router.back()} hitSlop={12}>
                        <BackIcon />
                    </Pressable>
                    <View style={styles.headerTitleWrap}>
                        <Text className="font-inter text-base font-bold text-white" numberOfLines={1}>
                            {ticket?.subject ?? 'Ticket Detail'}
                        </Text>
                        <Text className="font-inter text-xs text-white/70">
                            {ticket?.companyName ?? ticket?.company?.name ?? ''}
                        </Text>
                    </View>
                    <View style={[styles.headerStatusBadge, { backgroundColor: getStatusColor(currentStatus).bg }]}>
                        <Text
                            className="font-inter text-[10px] font-bold"
                            style={{ color: getStatusColor(currentStatus).text }}
                        >
                            {formatStatusLabel(currentStatus)}
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Admin controls */}
            <StatusChips
                current={currentStatus}
                onSelect={handleStatusChange}
                isUpdating={statusMutation.isPending}
            />

            {isModuleChange && !showRejectInput && (
                <ModuleChangeActions
                    ticketId={id ?? ''}
                    onApprovePress={handleApprove}
                    onRejectPress={handleRejectPress}
                    isApproving={approveMutation.isPending}
                    isRejecting={rejectMutation.isPending}
                />
            )}

            {showRejectInput && (
                <RejectReasonInput
                    value={rejectReason}
                    onChange={setRejectReason}
                    onSubmit={handleRejectSubmit}
                    onCancel={() => setShowRejectInput(false)}
                    isSubmitting={rejectMutation.isPending}
                />
            )}

            {/* Chat messages */}
            <FlashList
                ref={flatListRef}
                data={messageList}
                keyExtractor={(item, i) => item.id ?? String(i)}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingVertical: 40, flex: 1, justifyContent: 'center' }}>
                        <Text className="font-inter text-sm text-neutral-400">
                            No messages yet
                        </Text>
                    </View>
                }
            />

            {/* Input bar */}
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                {currentStatus === 'CLOSED' ? (
                    <View style={{ alignItems: 'center', paddingVertical: 12, flex: 1 }}>
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                            Ticket Closed
                        </Text>
                    </View>
                ) : (
                    <>
                        <TextInput
                            value={messageText}
                            onChangeText={setMessageText}
                            placeholder="Type a reply..."
                            placeholderTextColor={colors.neutral[400]}
                            multiline
                            style={styles.inputField}
                        />
                        <Pressable
                            onPress={handleSend}
                            disabled={!messageText.trim() || replyMutation.isPending}
                            style={[styles.sendBtn, (!messageText.trim() || replyMutation.isPending) && { opacity: 0.4 }]}
                        >
                            {replyMutation.isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <SendIcon color="#fff" />
                            )}
                        </Pressable>
                    </>
                )}
            </View>

            <ConfirmModal {...confirmModal.modalProps} />
        </KeyboardAvoidingView>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    header: {
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitleWrap: {
        flex: 1,
    },
    headerStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusSection: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 4,
        backgroundColor: isDark ? '#1A1730' : '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    statusChipRow: {
        gap: 8,
        paddingBottom: 10,
    },
    statusChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    moduleActions: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: isDark ? '#1A1730' : '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    moduleActionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    moduleBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moduleBtnApprove: {
        backgroundColor: colors.success[600],
    },
    moduleBtnReject: {
        backgroundColor: colors.danger[50],
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    rejectSection: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: isDark ? '#1A1730' : '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    rejectInput: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        padding: 12,
        minHeight: 60,
        fontSize: 14,
        color: colors.neutral[800],
        textAlignVertical: 'top',
    },
    rejectBtnRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 10,
    },
    rejectCancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    rejectSubmitBtn: {
        backgroundColor: colors.danger[600],
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    chatContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexGrow: 1,
    },
    bubbleWrap: {
        marginBottom: 10,
    },
    bubbleLeft: {
        alignItems: 'flex-start',
    },
    bubbleRight: {
        alignItems: 'flex-end',
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 14,
    },
    bubbleUser: {
        backgroundColor: isDark ? '#1A1730' : '#fff',
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        borderBottomLeftRadius: 4,
    },
    bubbleAdmin: {
        backgroundColor: colors.primary[600],
        borderBottomRightRadius: 4,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 10,
        backgroundColor: isDark ? '#1A1730' : '#fff',
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 10,
    },
    inputField: {
        flex: 1,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 14,
        color: colors.neutral[800],
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    sendBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.primary[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
const styles = createStyles(false);

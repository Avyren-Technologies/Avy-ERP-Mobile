/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { useSidebar } from '@/components/ui/sidebar';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { useSupportTicket } from '@/features/company-admin/api/use-company-admin-queries';
import {
    useCloseSupportTicket,
    useSendSupportMessage,
} from '@/features/company-admin/api/use-company-admin-mutations';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useTicketSocket } from '@/hooks/use-ticket-socket';

// ============ TYPES ============

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type TicketCategory = 'GENERAL' | 'BILLING' | 'TECHNICAL' | 'MODULE_CHANGE';

interface Message {
    id: string;
    body: string;
    senderUserId: string;
    senderName?: string;
    senderRole?: string;
    isSystemMessage?: boolean;
    createdAt: string;
}

interface ModuleChangeRequest {
    moduleName?: string;
    locationName?: string;
    changeType?: string;
    status?: string;
}

// ============ CONSTANTS ============

const STATUS_STYLES: Record<TicketStatus, { bg: string; text: string }> = {
    OPEN: { bg: colors.info[100], text: colors.info[700] },
    IN_PROGRESS: { bg: colors.warning[100], text: colors.warning[700] },
    RESOLVED: { bg: colors.success[100], text: colors.success[700] },
    CLOSED: { bg: colors.neutral[100], text: colors.neutral[500] },
};

const STATUS_LABELS: Record<string, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
};

const CATEGORY_LABELS: Record<string, string> = {
    GENERAL: 'General',
    BILLING: 'Billing',
    TECHNICAL: 'Technical',
    MODULE_CHANGE: 'Module Change',
};

const CATEGORY_STYLES: Record<TicketCategory, { bg: string; text: string }> = {
    GENERAL: { bg: colors.neutral[100], text: colors.neutral[600] },
    BILLING: { bg: colors.warning[50], text: colors.warning[700] },
    TECHNICAL: { bg: colors.info[50], text: colors.info[700] },
    MODULE_CHANGE: { bg: colors.accent[50], text: colors.accent[700] },
};

// ============ ICONS ============

function CloseTicketIcon() {
    return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={10} stroke="#fff" strokeWidth="1.5" />
            <Path
                d="M9 12l2 2 4-4"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

function SendIcon() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

// ============ HELPERS ============

// formatTime and formatDate removed — use fmt from useCompanyFormatter inside components

// ============ MESSAGE BUBBLE ============

function MessageBubble({
    message,
    isOwn,
    isSystem,
}: {
    message: Message;
    isOwn: boolean;
    isSystem: boolean;
}) {
    const fmt = useCompanyFormatter();
    const formatTime = (dateStr: string) => fmt.time(dateStr);
    if (isSystem) {
        return (
            <View style={s.systemMsg}>
                <Text className="font-inter text-xs italic text-neutral-400" style={{ textAlign: 'center' }}>
                    {message.body}
                </Text>
                <Text className="mt-1 font-inter text-[10px] text-neutral-300" style={{ textAlign: 'center' }}>
                    {formatTime(message.createdAt)}
                </Text>
            </View>
        );
    }

    return (
        <View style={[s.bubbleRow, isOwn ? s.bubbleRowRight : s.bubbleRowLeft]}>
            <View style={[s.bubble, isOwn ? s.bubbleOwn : s.bubbleOther]}>
                <Text
                    className="font-inter text-sm"
                    style={{ color: isOwn ? '#fff' : colors.neutral[800] }}
                >
                    {message.body}
                </Text>
            </View>
            <View style={[s.bubbleMeta, isOwn ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                <Text className="font-inter text-[10px] text-neutral-400">
                    {message.senderName ?? (isOwn ? 'You' : 'Support')} {' \u00B7 '} {formatTime(message.createdAt)}
                </Text>
            </View>
        </View>
    );
}

// ============ MODULE CHANGE CARD ============

function ModuleChangeCard({ request }: { request: ModuleChangeRequest }) {
    return (
        <View style={s.moduleCard}>
            <Text className="mb-2 font-inter text-xs font-bold text-accent-700">
                Module Change Request
            </Text>
            {request.moduleName && (
                <View style={s.moduleRow}>
                    <Text className="font-inter text-xs text-neutral-500">Module</Text>
                    <Text className="font-inter text-xs font-semibold text-neutral-800">{request.moduleName}</Text>
                </View>
            )}
            {request.locationName && (
                <View style={s.moduleRow}>
                    <Text className="font-inter text-xs text-neutral-500">Location</Text>
                    <Text className="font-inter text-xs font-semibold text-neutral-800">{request.locationName}</Text>
                </View>
            )}
            {request.changeType && (
                <View style={s.moduleRow}>
                    <Text className="font-inter text-xs text-neutral-500">Type</Text>
                    <Text className="font-inter text-xs font-semibold text-neutral-800">{request.changeType}</Text>
                </View>
            )}
            {request.status && (
                <View style={s.moduleRow}>
                    <Text className="font-inter text-xs text-neutral-500">Status</Text>
                    <Text className="font-inter text-xs font-semibold text-neutral-800">{request.status}</Text>
                </View>
            )}
        </View>
    );
}

// ============ MAIN SCREEN ============

export function TicketChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const user = useAuthStore.use.user();
    const fmt = useCompanyFormatter();
    const formatDate = (dateStr: string) => fmt.relativeDate(dateStr);

    const { data, isLoading } = useSupportTicket(id ?? '');
    const sendMutation = useSendSupportMessage();
    const closeMutation = useCloseSupportTicket();
    const confirmModal = useConfirmModal();

    const [inputText, setInputText] = React.useState('');
    const flatListRef = React.useRef<FlatList>(null);

    const ticket = React.useMemo(() => {
        const raw = data?.data ?? data;
        return raw ?? null;
    }, [data]);

    const messages: Message[] = React.useMemo(() => {
        const raw = ticket?.messages ?? [];
        if (!Array.isArray(raw)) return [];
        // Reverse for inverted FlatList (newest at bottom)
        return [...raw].reverse();
    }, [ticket]);

    const status: TicketStatus = ticket?.status ?? 'OPEN';
    const category: TicketCategory = ticket?.category ?? 'GENERAL';
    const isClosed = status === 'CLOSED';

    const moduleChangeRequest: ModuleChangeRequest | null = React.useMemo(() => {
        if (category !== 'MODULE_CHANGE') return null;
        const meta = ticket?.metadata ?? ticket?.moduleChangeRequest;
        if (!meta) return null;
        return meta as ModuleChangeRequest;
    }, [category, ticket]);

    const handleSend = () => {
        const text = inputText.trim();
        if (!text || !id) return;
        sendMutation.mutate(
            { id, body: text },
            { onSuccess: () => setInputText('') },
        );
    };

    const handleCloseTicket = () => {
        confirmModal.show({
            title: 'Close Ticket',
            message: 'Are you sure you want to close this ticket? This action cannot be undone.',
            variant: 'warning',
            confirmText: 'Close Ticket',
            onConfirm: () => {
                if (!id) return;
                closeMutation.mutate(id);
            },
        });
    };

    useTicketSocket(id as string, ticket?.companyId);

    const renderMessage = React.useCallback(
        ({ item, index }: { item: Message; index: number }) => {
            const isOwn = item.senderUserId === user?.id;
            const isSystem = item.senderRole === 'SYSTEM' || item.isSystemMessage === true;

            // Date separator (inverted list — index 0 is newest)
            const currentDate = new Date(item.createdAt).toDateString();
            const nextItem = messages[index + 1];
            const prevDate = nextItem ? new Date(nextItem.createdAt).toDateString() : null;
            const showDateSep = !prevDate || prevDate !== currentDate;

            return (
                <>
                    <MessageBubble message={item} isOwn={isOwn} isSystem={isSystem} />
                    {showDateSep && (
                        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                            <Text className="font-inter text-[10px] font-semibold text-neutral-400">
                                {formatDate(item.createdAt)}
                            </Text>
                        </View>
                    )}
                </>
            );
        },
        [user?.id, messages],
    );

    const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.OPEN;
    const categoryStyle = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.GENERAL;

    if (isLoading) {
        return (
            <View style={s.container}>
                <AppTopHeader title="Loading..." onMenuPress={toggle} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary[500]} />
                </View>
            </View>
        );
    }

    return (
        <View style={s.container}>
            <AppTopHeader
                title={ticket?.subject ?? 'Ticket'}
                onMenuPress={toggle}
                rightSlot={
                    !isClosed ? (
                        <Pressable onPress={handleCloseTicket} style={s.closeButton}>
                            <CloseTicketIcon />
                        </Pressable>
                    ) : undefined
                }
            />
            <View style={s.headerBadges}>
                <View style={[s.headerBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text className="font-inter" style={[s.headerBadgeText, { color: statusStyle.text }]}>
                        {STATUS_LABELS[status] ?? status}
                    </Text>
                </View>
                <View style={[s.headerBadge, { backgroundColor: categoryStyle.bg }]}>
                    <Text className="font-inter" style={[s.headerBadgeText, { color: categoryStyle.text }]}>
                        {CATEGORY_LABELS[category] ?? category}
                    </Text>
                </View>
            </View>

            {/* Module Change Request Card */}
            {moduleChangeRequest && (
                <Animated.View entering={FadeInDown.duration(300)}>
                    <ModuleChangeCard request={moduleChangeRequest} />
                </Animated.View>
            )}

            {/* Messages */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    inverted
                    contentContainerStyle={s.messagesList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                            <Text className="font-inter text-sm text-neutral-400">
                                No messages yet
                            </Text>
                        </View>
                    }
                />

                {/* Input Bar */}
                <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    {isClosed ? (
                        <View style={s.closedBanner}>
                            <Text className="font-inter text-xs text-neutral-500">
                                This ticket is closed. You cannot send messages.
                            </Text>
                        </View>
                    ) : (
                        <View style={s.inputRow}>
                            <TextInput
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Type a message..."
                                placeholderTextColor={colors.neutral[400]}
                                style={s.textInput}
                                multiline
                                maxLength={2000}
                            />
                            <Pressable
                                onPress={handleSend}
                                disabled={sendMutation.isPending || !inputText.trim()}
                                style={[
                                    s.sendButton,
                                    (!inputText.trim() || sendMutation.isPending) && { opacity: 0.4 },
                                ]}
                            >
                                {sendMutation.isPending ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <SendIcon />
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

// ============ STYLES ============

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBadges: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        marginLeft: 16,
        marginRight: 16,
    },
    headerBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    headerBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    // Module change card
    moduleCard: {
        margin: 12,
        backgroundColor: colors.accent[50],
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.accent[200],
    },
    moduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    // Messages
    messagesList: {
        padding: 16,
        gap: 8,
    },
    bubbleRow: {
        marginBottom: 4,
    },
    bubbleRowRight: {
        alignItems: 'flex-end',
    },
    bubbleRowLeft: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        borderRadius: 16,
        padding: 12,
    },
    bubbleOwn: {
        backgroundColor: colors.primary[600],
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: colors.neutral[100],
        borderBottomLeftRadius: 4,
    },
    bubbleMeta: {
        marginTop: 4,
        paddingHorizontal: 4,
    },
    systemMsg: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    // Input
    inputBar: {
        borderTopWidth: 1,
        borderTopColor: colors.neutral[200],
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingTop: 10,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        color: colors.neutral[800],
        maxHeight: 100,
        backgroundColor: colors.neutral[50],
    },
    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.primary[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    closedBanner: {
        alignItems: 'center',
        paddingVertical: 12,
    },
});

/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
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
import { useSidebar } from '@/components/ui/sidebar';

import { useEscalateConversation, useSendChatbotMessage, useStartConversation } from '@/features/company-admin/api/use-chatbot-mutations';
import { useChatbotMessages } from '@/features/company-admin/api/use-chatbot-queries';

// ============ TYPES ============

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

const QUICK_ACTIONS = [
    { label: 'Leave Balance', icon: '🏖️' },
    { label: 'My Payslip', icon: '💰' },
    { label: 'Attendance', icon: '📋' },
    { label: 'Holidays', icon: '🎉' },
    { label: 'Talk to HR', icon: '🧑‍💼' },
];

// ============ TYPING INDICATOR ============

function TypingIndicator() {
    return (
        <Animated.View entering={FadeInUp.duration(200)} style={styles.typingWrap}>
            <View style={styles.avatarBot}>
                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 8V4m0 4a4 4 0 100 8 4 4 0 000-8zM6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={colors.neutral[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </View>
            <View style={styles.typingBubble}>
                <View style={[styles.dot, { backgroundColor: colors.neutral[400] }]} />
                <View style={[styles.dot, { backgroundColor: colors.neutral[400] }]} />
                <View style={[styles.dot, { backgroundColor: colors.neutral[400] }]} />
            </View>
        </Animated.View>
    );
}

// ============ MESSAGE BUBBLE ============

function MessageBubble({ message, index }: { message: ChatMessage; index: number }) {
    const isUser = message.role === 'user';
    return (
        <Animated.View entering={FadeInUp.duration(300).delay(50 + index * 30)} style={[styles.messageRow, isUser && styles.messageRowUser]}>
            {!isUser && (
                <View style={styles.avatarBot}>
                    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 8V4m0 4a4 4 0 100 8 4 4 0 000-8zM6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={colors.neutral[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </View>
            )}
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text className={`font-inter text-sm leading-5 ${isUser ? 'text-white' : 'text-primary-950'}`}>{message.content}</Text>
                <Text className={`font-inter text-[10px] mt-1 ${isUser ? 'text-primary-200 text-right' : 'text-neutral-400'}`}>
                    {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
            </View>
            {isUser && (
                <View style={styles.avatarUser}>
                    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z" stroke={colors.white} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </View>
            )}
        </Animated.View>
    );
}

// ============ QUICK ACTIONS ============

function QuickActions({ onSelect, disabled }: { onSelect: (label: string) => void; disabled: boolean }) {
    return (
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.quickWrap}>
            {QUICK_ACTIONS.map((action) => (
                <Pressable key={action.label} onPress={() => onSelect(action.label)} disabled={disabled} style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}>
                    <Text className="font-inter text-xs">{action.icon}</Text>
                    <Text className="font-inter text-xs font-semibold text-neutral-700">{action.label}</Text>
                </Pressable>
            ))}
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function ChatbotScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const flatListRef = React.useRef<FlatList>(null);

    const [input, setInput] = React.useState('');
    const [conversationId, setConversationId] = React.useState<string | null>(null);

    const startConversation = useStartConversation();
    const sendMessage = useSendChatbotMessage();
    const { data: historyData, isLoading: historyLoading } = useChatbotMessages(conversationId ?? '');
    const escalateChat = useEscalateConversation();

    const messages: ChatMessage[] = React.useMemo(() => {
        const raw = (historyData as any)?.data ?? historyData ?? [];
        if (!Array.isArray(raw)) return [];
        return raw;
    }, [historyData]);

    // Auto-start conversation
    React.useEffect(() => {
        if (!conversationId) {
            startConversation.mutate({} as any, {
                onSuccess: (res: any) => {
                    setConversationId(res?.data?.id ?? res?.id ?? null);
                },
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Scroll to bottom on new messages
    React.useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages.length]);

    const handleSend = () => {
        if (!input.trim() || !conversationId) return;
        const msg = input.trim();
        setInput('');
        sendMessage.mutate({ conversationId, message: msg } as any);
    };

    const handleQuickAction = (label: string) => {
        if (!conversationId) return;
        sendMessage.mutate({ conversationId, message: label } as any);
    };

    const handleEscalate = () => {
        if (!conversationId) return;
        escalateChat.mutate({ conversationId } as any);
    };

    const isSending = sendMessage.isPending;

    const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => (
        <MessageBubble message={item} index={index} />
    );

    const renderEmpty = () => {
        if (historyLoading) return null;
        return (
            <View style={styles.emptyWrap}>
                <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyContent}>
                    <View style={styles.emptyIcon}>
                        <Svg width={32} height={32} viewBox="0 0 24 24"><Path d="M12 8V4m0 4a4 4 0 100 8 4 4 0 000-8zM6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={colors.primary[500]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </View>
                    <Text className="font-inter text-lg font-bold text-primary-950">HR Assistant</Text>
                    <Text className="font-inter text-sm text-neutral-500 text-center mt-1" style={{ maxWidth: 260 }}>
                        Ask about leave, payslips, attendance & more. Try a quick action below!
                    </Text>
                </Animated.View>
            </View>
        );
    };

    const renderFooter = () => {
        if (isSending) return <TypingIndicator />;
        return null;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <AppTopHeader
                title="HR Assistant"
                subtitle={escalateChat.isSuccess ? 'Escalated' : 'Online'}
                onMenuPress={toggle}
                rightSlot={(
                    <Pressable
                        onPress={handleEscalate}
                        disabled={!conversationId || escalateChat.isPending || escalateChat.isSuccess}
                        style={[styles.escalateBtn, escalateChat.isSuccess && { opacity: 0.5 }]}
                    >
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={colors.warning[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /><Path d="M12 9v4M12 17h.01" stroke={colors.warning[600]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                )}
            />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={[styles.listContent, { paddingBottom: 12 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                />

                {/* Quick Actions */}
                {messages.length <= 2 && <QuickActions onSelect={handleQuickAction} disabled={!conversationId || isSending} />}

                {/* Input Bar */}
                <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type your question..."
                            placeholderTextColor={colors.neutral[400]}
                            value={input}
                            onChangeText={setInput}
                            onSubmitEditing={handleSend}
                            returnKeyType="send"
                            multiline={false}
                        />
                    </View>
                    <Pressable onPress={handleSend} disabled={!input.trim() || isSending || !conversationId} style={[styles.sendBtn, (!input.trim() || isSending) && { opacity: 0.5 }]}>
                        <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    escalateBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.warning[50], justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 16, paddingTop: 16 },
    messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, maxWidth: '85%' },
    messageRowUser: { alignSelf: 'flex-end', flexDirection: 'row' },
    avatarBot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' },
    avatarUser: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center' },
    bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
    bubbleUser: { backgroundColor: colors.primary[600], borderBottomRightRadius: 6 },
    bubbleAssistant: { backgroundColor: colors.white, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.neutral[200] },
    typingWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, paddingHorizontal: 16 },
    typingBubble: { flexDirection: 'row', gap: 4, backgroundColor: colors.white, borderRadius: 18, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    dot: { width: 6, height: 6, borderRadius: 3 },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyContent: { alignItems: 'center' },
    emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
    quickChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100], backgroundColor: colors.white },
    inputWrap: { flex: 1, backgroundColor: colors.neutral[50], borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, minHeight: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    sendBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

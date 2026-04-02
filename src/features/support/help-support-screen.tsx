/* eslint-disable better-tailwindcss/no-unknown-classes */
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useSupportTickets } from '@/features/company-admin/api/use-company-admin-queries';
import { useCreateSupportTicket } from '@/features/company-admin/api/use-company-admin-mutations';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

// ============ CONSTANTS ============

const TABS = ['My Tickets', 'Help Center'] as const;
type Tab = (typeof TABS)[number];

const STATUS_OPTIONS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const CATEGORY_OPTIONS = ['ALL', 'GENERAL', 'BILLING', 'TECHNICAL', 'MODULE_CHANGE', 'BUG_REPORT', 'FEATURE_REQUEST'] as const;

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type TicketCategory = 'GENERAL' | 'BILLING' | 'TECHNICAL' | 'MODULE_CHANGE' | 'BUG_REPORT' | 'FEATURE_REQUEST';

const STATUS_STYLES: Record<TicketStatus, { bg: string; text: string }> = {
    OPEN: { bg: colors.info[100], text: colors.info[700] },
    IN_PROGRESS: { bg: colors.warning[100], text: colors.warning[700] },
    RESOLVED: { bg: colors.success[100], text: colors.success[700] },
    CLOSED: { bg: colors.neutral[100], text: colors.neutral[500] },
};

const CATEGORY_STYLES: Record<TicketCategory, { bg: string; text: string }> = {
    GENERAL: { bg: colors.neutral[100], text: colors.neutral[600] },
    BILLING: { bg: colors.warning[50], text: colors.warning[700] },
    TECHNICAL: { bg: colors.info[50], text: colors.info[700] },
    MODULE_CHANGE: { bg: colors.accent[50], text: colors.accent[700] },
    BUG_REPORT: { bg: colors.danger[50], text: colors.danger[700] },
    FEATURE_REQUEST: { bg: colors.success[50], text: colors.success[700] },
};

const CATEGORY_LABELS: Record<string, string> = {
    ALL: 'All',
    GENERAL: 'General',
    BILLING: 'Billing',
    TECHNICAL: 'Technical',
    MODULE_CHANGE: 'Module Change',
    BUG_REPORT: 'Bug Report',
    FEATURE_REQUEST: 'Feature Request',
};

const STATUS_LABELS: Record<string, string> = {
    ALL: 'All',
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
};

interface FAQ {
    question: string;
    answer: string;
}

const FAQ_ITEMS: FAQ[] = [
    {
        question: 'How do I manage modules for my company?',
        answer: 'Navigate to Configuration > Module Catalogue from the sidebar. You can view available modules, request activation or deactivation. Module changes require admin approval and may affect billing.',
    },
    {
        question: 'How do I add new users?',
        answer: 'Go to People & Access > Users from the sidebar. Tap the + button to invite a new user. Fill in their details, assign a role, and they will receive an email invitation to set up their account.',
    },
    {
        question: 'How do I contact support?',
        answer: 'You can create a support ticket from the "My Tickets" tab by tapping the + button. Describe your issue, select a category, and our team will respond promptly. You can also track the status of your tickets here.',
    },
    {
        question: 'How do I update company information?',
        answer: 'Go to Company > Profile from the sidebar. You can update basic company details, statutory information, and address. Some fields may be read-only and require support assistance to change.',
    },
    {
        question: 'How do I manage shifts and work schedules?',
        answer: 'Navigate to Company > Shifts from the sidebar. You can create, edit, and delete shifts. Each shift includes start/end times and optional downtime slots for breaks and maintenance.',
    },
    {
        question: 'What should I do if I encounter a bug?',
        answer: 'Create a support ticket with the category "Bug Report". Include steps to reproduce the issue, expected behavior, and any screenshots. Our technical team will investigate and provide updates via the ticket chat.',
    },
];

// ============ ICONS ============

function TicketIcon({ color }: { color: string }) {
    return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

function HelpIcon({ color }: { color: string }) {
    return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth="1.5" />
            <Path
                d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
    return (
        <Svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        >
            <Path
                d="M6 9l6 6 6-6"
                stroke={colors.neutral[500]}
                strokeWidth="2"
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

// ============ HELPER ============

function formatRelativeTime(dateStr: string, fmtDate: (iso: string) => string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return fmtDate(dateStr);
}

// ============ SUB-COMPONENTS ============

function StatusBadge({ status }: { status: TicketStatus }) {
    const style = STATUS_STYLES[status] ?? STATUS_STYLES.OPEN;
    return (
        <View style={[s.badge, { backgroundColor: style.bg }]}>
            <Text className="font-inter" style={[s.badgeText, { color: style.text }]}>
                {STATUS_LABELS[status] ?? status}
            </Text>
        </View>
    );
}

function CategoryChip({ category }: { category: TicketCategory }) {
    const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.GENERAL;
    return (
        <View style={[s.badge, { backgroundColor: style.bg }]}>
            <Text className="font-inter" style={[s.badgeText, { color: style.text }]}>
                {CATEGORY_LABELS[category] ?? category}
            </Text>
        </View>
    );
}

function FilterChip({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[s.filterChip, active && s.filterChipActive]}
        >
            <Text
                className="font-inter"
                style={[s.filterChipText, active && s.filterChipTextActive]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

// ============ TICKET CARD ============

interface Ticket {
    id: string;
    subject: string;
    status: TicketStatus;
    category: TicketCategory;
    lastMessage?: string;
    updatedAt: string;
    createdAt: string;
}

function TicketCard({ ticket, onPress }: { ticket: Ticket; onPress: () => void }) {
    const fmt = useCompanyFormatter();
    return (
        <Pressable onPress={onPress} style={s.ticketCard}>
            <View style={s.ticketCardHeader}>
                <Text
                    className="font-inter text-sm font-bold text-primary-950"
                    numberOfLines={1}
                    style={{ flex: 1 }}
                >
                    {ticket.subject}
                </Text>
                <StatusBadge status={ticket.status} />
            </View>

            <View style={s.ticketCardMeta}>
                <CategoryChip category={ticket.category} />
                <Text className="font-inter text-xs text-neutral-400">
                    {formatRelativeTime(ticket.updatedAt || ticket.createdAt, fmt.date)}
                </Text>
            </View>

            {ticket.lastMessage ? (
                <Text
                    className="font-inter text-xs text-neutral-500"
                    numberOfLines={2}
                    style={{ marginTop: 6 }}
                >
                    {ticket.lastMessage}
                </Text>
            ) : null}
        </Pressable>
    );
}

// ============ FAQ ITEM ============

function FAQItem({ faq }: { faq: FAQ }) {
    const [expanded, setExpanded] = React.useState(false);
    return (
        <View style={s.faqItem}>
            <Pressable
                onPress={() => setExpanded(!expanded)}
                style={s.faqHeader}
            >
                <Text
                    className="font-inter text-sm font-semibold text-primary-900"
                    style={{ flex: 1, marginRight: 8 }}
                >
                    {faq.question}
                </Text>
                <ChevronIcon expanded={expanded} />
            </Pressable>
            {expanded && (
                <Animated.View entering={FadeInDown.duration(200)}>
                    <Text className="font-inter text-xs text-neutral-600" style={s.faqBody}>
                        {faq.answer}
                    </Text>
                </Animated.View>
            )}
        </View>
    );
}

// ============ CREATE TICKET SHEET ============

function CreateTicketSheet({
    sheetRef,
}: {
    sheetRef: React.RefObject<BottomSheet | null>;
}) {
    const [subject, setSubject] = React.useState('');
    const [category, setCategory] = React.useState<TicketCategory>('GENERAL');
    const [message, setMessage] = React.useState('');
    const createMutation = useCreateSupportTicket();

    const snapPoints = React.useMemo(() => ['75%'], []);

    const renderBackdrop = React.useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        [],
    );

    const handleSubmit = () => {
        if (!subject.trim() || !message.trim()) return;
        createMutation.mutate(
            { subject: subject.trim(), category, message: message.trim() },
            {
                onSuccess: () => {
                    setSubject('');
                    setCategory('GENERAL');
                    setMessage('');
                    sheetRef.current?.close();
                },
            },
        );
    };

    const categories: TicketCategory[] = ['GENERAL', 'BILLING', 'TECHNICAL', 'MODULE_CHANGE', 'BUG_REPORT', 'FEATURE_REQUEST'];

    return (
        <BottomSheet
            ref={sheetRef}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={s.sheetBg}
            handleIndicatorStyle={s.sheetHandle}
        >
            <BottomSheetScrollView
                contentContainerStyle={s.sheetContent}
                showsVerticalScrollIndicator={false}
            >
                <Text className="mb-4 font-inter text-lg font-bold text-primary-950">
                    Create Support Ticket
                </Text>

                {/* Subject */}
                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                    Subject
                </Text>
                <TextInput
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="Brief description of your issue"
                    placeholderTextColor={colors.neutral[400]}
                    style={s.textInput}
                />

                {/* Category */}
                <Text className="mb-1.5 mt-4 font-inter text-xs font-bold text-primary-900">
                    Category
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <View style={s.chipRow}>
                        {categories.map((cat) => (
                            <Pressable
                                key={cat}
                                onPress={() => setCategory(cat)}
                                style={[
                                    s.filterChip,
                                    category === cat && s.filterChipActive,
                                ]}
                            >
                                <Text
                                    className="font-inter"
                                    style={[
                                        s.filterChipText,
                                        category === cat && s.filterChipTextActive,
                                    ]}
                                >
                                    {CATEGORY_LABELS[cat]}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>

                {/* Message */}
                <Text className="mb-1.5 mt-4 font-inter text-xs font-bold text-primary-900">
                    Message
                </Text>
                <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Describe your issue in detail..."
                    placeholderTextColor={colors.neutral[400]}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    style={[s.textInput, { minHeight: 120 }]}
                />

                {/* Submit */}
                <Pressable
                    onPress={handleSubmit}
                    disabled={createMutation.isPending || !subject.trim() || !message.trim()}
                    style={[
                        s.submitButton,
                        (createMutation.isPending || !subject.trim() || !message.trim()) && { opacity: 0.5 },
                    ]}
                >
                    <LinearGradient
                        colors={[colors.gradient.start, colors.gradient.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.submitGradient}
                    >
                        {createMutation.isPending ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text className="font-inter text-sm font-bold text-white">
                                Submit Ticket
                            </Text>
                        )}
                    </LinearGradient>
                </Pressable>
            </BottomSheetScrollView>
        </BottomSheet>
    );
}

// ============ MAIN SCREEN ============

export function HelpSupportScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const sheetRef = React.useRef<BottomSheet>(null);

    const [activeTab, setActiveTab] = React.useState<Tab>('My Tickets');
    const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = React.useState<string>('ALL');

    const queryParams = React.useMemo(() => {
        const params: Record<string, string> = {};
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (categoryFilter !== 'ALL') params.category = categoryFilter;
        return Object.keys(params).length > 0 ? params : undefined;
    }, [statusFilter, categoryFilter]);

    const { data, isLoading, refetch, isRefetching } = useSupportTickets(queryParams);

    const tickets: Ticket[] = React.useMemo(() => {
        const raw = data?.data?.tickets ?? data?.data ?? (data as any)?.tickets ?? [];
        if (!Array.isArray(raw)) return [];
        return raw;
    }, [data]);

    const renderTicket = React.useCallback(
        ({ item, index }: { item: Ticket; index: number }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
                <TicketCard
                    ticket={item}
                    onPress={() => router.push(`/support/ticket/${item.id}` as any)}
                />
            </Animated.View>
        ),
        [router],
    );

    return (
        <View style={[s.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.header}
            >
                <Animated.View entering={FadeInUp.duration(400)}>
                    <Text className="font-inter text-xl font-bold text-white">
                        Help & Support
                    </Text>
                    <Text className="mt-1 font-inter text-xs text-white/70">
                        Get help or track your support tickets
                    </Text>
                </Animated.View>
            </LinearGradient>

            {/* Tabs */}
            <View style={s.tabRow}>
                {TABS.map((tab) => (
                    <Pressable
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[s.tabButton, activeTab === tab && s.tabButtonActive]}
                    >
                        {tab === 'My Tickets' ? (
                            <TicketIcon color={activeTab === tab ? '#fff' : colors.neutral[500]} />
                        ) : (
                            <HelpIcon color={activeTab === tab ? '#fff' : colors.neutral[500]} />
                        )}
                        <Text
                            className="font-inter"
                            style={[s.tabText, activeTab === tab && s.tabTextActive]}
                        >
                            {tab}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Tab Content */}
            {activeTab === 'My Tickets' ? (
                <View style={{ flex: 1 }}>
                    {/* Filters */}
                    <View style={s.filterSection}>
                        <Text className="mb-1.5 font-inter text-xs font-semibold text-neutral-500">
                            Status
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 8 }}
                        >
                            <View style={s.chipRow}>
                                {STATUS_OPTIONS.map((opt) => (
                                    <FilterChip
                                        key={opt}
                                        label={STATUS_LABELS[opt]}
                                        active={statusFilter === opt}
                                        onPress={() => setStatusFilter(opt)}
                                    />
                                ))}
                            </View>
                        </ScrollView>

                        <Text className="mb-1.5 font-inter text-xs font-semibold text-neutral-500">
                            Category
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        >
                            <View style={s.chipRow}>
                                {CATEGORY_OPTIONS.map((opt) => (
                                    <FilterChip
                                        key={opt}
                                        label={CATEGORY_LABELS[opt]}
                                        active={categoryFilter === opt}
                                        onPress={() => setCategoryFilter(opt)}
                                    />
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Ticket List */}
                    {isLoading ? (
                        <View style={{ padding: 16, gap: 12 }}>
                            {[1, 2, 3].map((i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </View>
                    ) : tickets.length === 0 ? (
                        <EmptyState
                            icon="inbox"
                            title="No tickets yet"
                            message="Tap the + button to create your first support ticket"
                        />
                    ) : (
                        <LayoutAnimationConfig skipEntering>
                            <FlatList
                                data={tickets}
                                keyExtractor={(item) => item.id}
                                renderItem={renderTicket}
                                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={isRefetching}
                                        onRefresh={refetch}
                                        tintColor={colors.primary[500]}
                                    />
                                }
                                showsVerticalScrollIndicator={false}
                            />
                        </LayoutAnimationConfig>
                    )}

                    {/* FAB */}
                    <FAB onPress={() => sheetRef.current?.snapToIndex(0)} />
                </View>
            ) : (
                /* Help Center Tab */
                <ScrollView
                    contentContainerStyle={s.helpContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View entering={FadeInDown.duration(300)}>
                        <View style={s.helpHeader}>
                            <HelpIcon color={colors.primary[600]} />
                            <Text className="ml-2 font-inter text-base font-bold text-primary-900">
                                Frequently Asked Questions
                            </Text>
                        </View>
                        {FAQ_ITEMS.map((faq, index) => (
                            <FAQItem key={index} faq={faq} />
                        ))}
                    </Animated.View>

                    <View style={s.contactSection}>
                        <Text className="font-inter text-sm font-bold text-primary-900">
                            Still need help?
                        </Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">
                            Create a support ticket and our team will get back to you within 24 hours.
                        </Text>
                        <Pressable
                            onPress={() => {
                                setActiveTab('My Tickets');
                                setTimeout(() => sheetRef.current?.snapToIndex(0), 300);
                            }}
                            style={s.contactButton}
                        >
                            <Text className="font-inter text-sm font-semibold text-primary-600">
                                Create a Ticket
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            )}

            {/* Create Ticket Bottom Sheet */}
            <CreateTicketSheet sheetRef={sheetRef} />
        </View>
    );
}

// ============ STYLES ============

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: 16,
    },
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.neutral[100],
    },
    tabButtonActive: {
        backgroundColor: colors.primary[600],
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.neutral[500],
    },
    tabTextActive: {
        color: '#fff',
    },
    filterSection: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 6,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.neutral[100],
    },
    filterChipActive: {
        backgroundColor: colors.primary[600],
    },
    filterChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.neutral[500],
    },
    filterChipTextActive: {
        color: '#fff',
    },
    ticketCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    ticketCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ticketCardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    // FAQ
    helpContent: {
        padding: 16,
        paddingBottom: 40,
    },
    helpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    faqItem: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 8,
        overflow: 'hidden',
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    faqBody: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        lineHeight: 20,
    },
    contactSection: {
        marginTop: 24,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    contactButton: {
        marginTop: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary[200],
        backgroundColor: colors.primary[50],
    },
    // Bottom Sheet
    sheetBg: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    sheetHandle: {
        backgroundColor: colors.neutral[300],
        width: 40,
    },
    sheetContent: {
        padding: 20,
        paddingBottom: 40,
    },
    textInput: {
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.neutral[800],
        backgroundColor: '#fff',
    },
    submitButton: {
        marginTop: 20,
        borderRadius: 12,
        overflow: 'hidden',
    },
    submitGradient: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
});

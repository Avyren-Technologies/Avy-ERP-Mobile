/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    Modal as RNModal,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
    useCreateChecklistTemplate,
    useDeleteChecklistTemplate,
} from '@/features/maintenance/api/use-maintenance-mutations';
import {
    useChecklistTemplate,
    useChecklistTemplates,
} from '@/features/maintenance/api/use-maintenance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TEMPLATE CARD ============

function TemplateCard({
    item,
    index,
    isDark,
    onPress,
    onDelete,
}: {
    item: any;
    index: number;
    isDark: boolean;
    onPress: () => void;
    onDelete: () => void;
}) {
    const isActive = item.isActive !== false;
    const sectionCount = item.sections?.length ?? item._count?.sections ?? 0;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable
                onPress={onPress}
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.primary[900] : colors.primary[50],
                    },
                ]}
            >
                <View style={cardStyles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                            {item.name}
                        </Text>
                        {item.description ? (
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2} style={{ marginTop: 2 }}>
                                {item.description}
                            </Text>
                        ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Pressable onPress={onDelete} style={[cardStyles.actionBtn, { backgroundColor: isDark ? colors.danger[900] : colors.danger[50] }]} hitSlop={8}>
                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" stroke={colors.danger[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M9 18l6-6-6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </View>
                </View>

                <View style={cardStyles.detailsRow}>
                    <View style={[cardStyles.tagBadge, { backgroundColor: isDark ? colors.info[900] : colors.info[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-info-700">
                            {sectionCount} section{sectionCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    {item.version ? (
                        <View style={[cardStyles.tagBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-accent-700">v{item.version}</Text>
                        </View>
                    ) : null}
                    <View style={[cardStyles.statusBadge, { backgroundColor: isActive ? colors.success[50] : colors.neutral[100] }]}>
                        <View style={[cardStyles.statusDot, { backgroundColor: isActive ? colors.success[500] : colors.neutral[400] }]} />
                        <Text className={`font-inter text-[10px] font-bold ${isActive ? 'text-success-700' : 'text-neutral-500'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ DETAIL SHEET ============

function TemplateDetailSheet({
    visible,
    onClose,
    templateId,
}: {
    visible: boolean;
    onClose: () => void;
    templateId: string;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const { data: response, isLoading } = useChecklistTemplate(templateId);
    const template: any = (response as any)?.data ?? null;

    return (
        <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[sheetStyles.container, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                    <Pressable onPress={onClose}>
                        <Text className="font-inter text-sm font-semibold text-neutral-500">Close</Text>
                    </Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                        {template?.name ?? 'Template'}
                    </Text>
                    <View style={{ width: 52 }} />
                </View>

                {isLoading ? (
                    <View style={{ padding: 24 }}>
                        <SkeletonCard />
                        <SkeletonCard />
                    </View>
                ) : template ? (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
                        {template.description ? (
                            <Text className="mb-4 font-inter text-sm text-neutral-600 dark:text-neutral-300">{template.description}</Text>
                        ) : null}

                        <Text className="mb-2 font-inter text-xs font-bold uppercase text-neutral-400">Sections managed on web</Text>

                        {(template.sections ?? []).map((section: any, sIdx: number) => (
                            <View key={section.id ?? sIdx} style={[detailStyles.section, { backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50] }]}>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{section.name}</Text>
                                {section.description ? (
                                    <Text className="mt-1 font-inter text-xs text-neutral-500">{section.description}</Text>
                                ) : null}

                                {(section.fields ?? []).map((field: any, fIdx: number) => (
                                    <View key={field.id ?? fIdx} style={detailStyles.fieldRow}>
                                        <View style={[detailStyles.fieldDot, { backgroundColor: field.isMandatory ? colors.danger[400] : colors.neutral[300] }]} />
                                        <Text className="flex-1 font-inter text-xs text-primary-950 dark:text-white" numberOfLines={1}>{field.label}</Text>
                                        <View style={[detailStyles.fieldType, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                                            <Text className="font-inter text-[9px] font-bold text-primary-600">{(field.fieldType ?? '').replace(/_/g, ' ')}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={{ paddingTop: 60 }}>
                        <EmptyState icon="error" title="Not found" message="Template details could not be loaded." />
                    </View>
                )}
            </View>
        </RNModal>
    );
}

// ============ CREATE FORM SHEET ============

function CreateFormSheet({
    visible,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description?: string }) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [nameError, setNameError] = React.useState('');

    React.useEffect(() => {
        if (visible) { setName(''); setDescription(''); setNameError(''); }
    }, [visible]);

    const handleSubmit = () => {
        if (!name.trim()) { setNameError('Name is required'); return; }
        const data: { name: string; description?: string } = { name: name.trim() };
        if (description.trim()) data.description = description.trim();
        onSubmit(data);
    };

    return (
        <RNModal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={[sheetStyles.container, { paddingTop: Math.max(insets.top, 24), backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                        <Pressable onPress={onClose}>
                            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">New Checklist</Text>
                        <View style={{ width: 52 }} />
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
                        <View style={sheetStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Name <Text className="text-danger-500">*</Text>
                            </Text>
                            <TextInput
                                style={[sheetStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }, nameError ? { borderColor: colors.danger[400], borderWidth: 1.5 } : undefined]}
                                placeholder="Checklist name"
                                placeholderTextColor={colors.neutral[400]}
                                value={name}
                                onChangeText={(v) => { setName(v); if (nameError) setNameError(''); }}
                            />
                            {nameError ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{nameError}</Text> : null}
                        </View>

                        <View style={sheetStyles.field}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Description</Text>
                            <TextInput
                                style={[sheetStyles.input, { height: 80, textAlignVertical: 'top', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200], color: isDark ? colors.white : colors.primary[950] }]}
                                placeholder="Description"
                                placeholderTextColor={colors.neutral[400]}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                        </View>

                        <View style={[sheetStyles.infoBox, { backgroundColor: isDark ? '#0F0D1A' : colors.info[50] }]}>
                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                <Path d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01" stroke={colors.info[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text className="flex-1 font-inter text-xs text-info-700">
                                Sections and fields can be managed from the web app after creation.
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <Pressable
                            style={({ pressed }) => [sheetStyles.submitBtn, pressed && { opacity: 0.85 }, isSubmitting && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : (
                                <Text className="font-inter text-base font-bold text-white">Create</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

// ============ MAIN ============

export function ChecklistTemplatesScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const confirmModal = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [createVisible, setCreateVisible] = React.useState(false);
    const [detailId, setDetailId] = React.useState('');

    const { data: response, isLoading, error, refetch, isFetching } = useChecklistTemplates({
        search: search.trim() || undefined,
    });

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const createMutation = useCreateChecklistTemplate();
    const deleteMutation = useDeleteChecklistTemplate();

    const handleDelete = (item: any) => {
        confirmModal.show({
            title: 'Delete Checklist',
            message: `Delete "${item.name}"? This cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                deleteMutation.mutate(item.id, { onSuccess: () => refetch(), onError: () => showErrorMessage('Failed to delete') });
            },
        });
    };

    const handleCreate = (data: { name: string; description?: string }) => {
        // The API requires sections, but for mobile we create with a placeholder section
        const payload = {
            ...data,
            sections: [
                {
                    name: 'General',
                    sortOrder: 0,
                    fields: [{ label: 'Check item', fieldType: 'YES_NO', sortOrder: 0 }],
                },
            ],
        };
        createMutation.mutate(payload, {
            onSuccess: () => { setCreateVisible(false); showSuccess('Checklist created'); refetch(); },
            onError: () => showErrorMessage('Failed to create'),
        });
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <TemplateCard
            item={item}
            index={index}
            isDark={isDark}
            onPress={() => setDetailId(item.id)}
            onDelete={() => handleDelete(item)}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader title="Checklists" subtitle={`${totalCount} template${totalCount !== 1 ? 's' : ''}`} onMenuPress={toggle} />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search checklists..." />
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40 }}><EmptyState icon="error" title="Failed to load" message="Check connection and retry." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <EmptyState icon="search" title="No checklists found" message="Create a checklist template to get started." />;
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <FlashList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}

                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />

            <FAB onPress={() => setCreateVisible(true)} />

            <CreateFormSheet
                visible={createVisible}
                onClose={() => setCreateVisible(false)}
                onSubmit={handleCreate}
                isSubmitting={createMutation.isPending}
            />

            {detailId ? (
                <TemplateDetailSheet
                    visible={!!detailId}
                    onClose={() => setDetailId('')}
                    templateId={detailId}
                />
            ) : null}

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

// ============ STYLES ============

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 8,
    },
    tagBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4,
        marginLeft: 'auto',
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const sheetStyles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    field: { marginBottom: 20 },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        marginTop: 8,
    },
    submitContainer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    submitBtn: {
        backgroundColor: colors.primary[600],
        borderRadius: 14,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});

const detailStyles = StyleSheet.create({
    section: {
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    fieldDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    fieldType: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
});

/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { DatePickerField } from '@/components/ui/date-picker';
import { FAB } from '@/components/ui/fab';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage } from '@/components/ui/utils';
import { useUploadMyDocument } from '@/features/company-admin/api/use-ess-mutations';
import { useMyDocuments } from '@/features/company-admin/api/use-ess-queries';

const DOCUMENT_TYPES = [
    'Aadhaar',
    'PAN',
    'Passport',
    'Driving License',
    'Voter ID',
    'Education Certificate',
    'Experience Letter',
    'Other',
] as const;

// ── Upload Form (inline page) ─────────────────────────────────────

function UploadForm({
    onClose, onSave, isSaving,
}: {
    onClose: () => void;
    onSave: (data: { documentType: string; documentNumber: string; expiryDate: string; fileUrl: string; fileName: string }) => void;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [documentType, setDocumentType] = React.useState('');
    const [documentNumber, setDocumentNumber] = React.useState('');
    const [expiryDate, setExpiryDate] = React.useState('');
    const [fileUrl, setFileUrl] = React.useState('');
    const [fileName, setFileName] = React.useState('');

    const isValid = documentType && documentNumber.trim() && fileName.trim();

    return (
        <Animated.View entering={FadeInRight.duration(300)} style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.formHeader}>
                <Pressable onPress={onClose} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M15 18l-6-6 6-6" stroke={colors.primary[700]} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
                <Text className="font-inter text-base font-bold text-primary-950">Upload Document</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 100 }]}
            >
                {/* Document Type — chip selector */}
                <View style={styles.fieldWrap}>
                    <Text className="mb-2 font-inter text-xs font-bold text-primary-900">
                        Document Type <Text className="text-danger-500">*</Text>
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {DOCUMENT_TYPES.map(opt => (
                            <Pressable
                                key={opt}
                                onPress={() => setDocumentType(opt)}
                                style={[styles.chip, documentType === opt && styles.chipActive]}
                            >
                                <Text className={`font-inter text-xs font-semibold ${documentType === opt ? 'text-white' : 'text-neutral-600'}`}>
                                    {opt}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Document Number */}
                <View style={styles.fieldWrap}>
                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                        Document Number <Text className="text-danger-500">*</Text>
                    </Text>
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter document number..."
                            placeholderTextColor={colors.neutral[400]}
                            value={documentNumber}
                            onChangeText={setDocumentNumber}
                            autoCapitalize="characters"
                        />
                    </View>
                </View>

                {/* Expiry Date */}
                <DatePickerField
                    label="Expiry Date"
                    value={expiryDate}
                    onChange={setExpiryDate}
                    hint="Optional"
                />

                {/* File URL */}
                <View style={styles.fieldWrap}>
                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">File URL</Text>
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="https://... (optional)"
                            placeholderTextColor={colors.neutral[400]}
                            value={fileUrl}
                            onChangeText={setFileUrl}
                            autoCapitalize="none"
                            keyboardType="url"
                        />
                    </View>
                </View>

                {/* File Name */}
                <View style={styles.fieldWrap}>
                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                        File Name <Text className="text-danger-500">*</Text>
                    </Text>
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. aadhaar-card.pdf"
                            placeholderTextColor={colors.neutral[400]}
                            value={fileName}
                            onChangeText={setFileName}
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <Pressable onPress={onClose} style={styles.cancelBtn}>
                        <Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => onSave({ documentType, documentNumber: documentNumber.trim(), expiryDate: expiryDate.trim(), fileUrl: fileUrl.trim(), fileName: fileName.trim() })}
                        disabled={!isValid || isSaving}
                        style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}
                    >
                        <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Uploading...' : 'Upload Document'}</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </Animated.View>
    );
}

// ── Main Screen ──────────────────────────────────────────────────

export function MyDocumentsScreen() {
    const insets = useSafeAreaInsets();
    const { open } = useSidebar();

    const { data, isLoading, refetch } = useMyDocuments();
    const uploadDoc = useUploadMyDocument();

    const [showForm, setShowForm] = React.useState(false);

    const documents = React.useMemo(() => {
        const raw = data as any;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
    }, [data]);

    const handleUpload = (formData: { documentType: string; documentNumber: string; expiryDate: string; fileUrl: string; fileName: string }) => {
        uploadDoc.mutate(formData, {
            onSuccess: () => setShowForm(false),
            onError: (err: any) => showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to upload document'),
        });
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                {/* Doc icon */}
                <View style={styles.docIcon}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={colors.primary[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={colors.primary[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text className="font-inter text-sm font-bold text-primary-950">{item.fileName ?? item.documentNumber ?? '--'}</Text>
                        {item.documentType && (
                            <View style={[styles.typeBadge, { backgroundColor: colors.accent[50] }]}>
                                <Text style={{ color: colors.accent[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.documentType}</Text>
                            </View>
                        )}
                    </View>
                    {item.documentNumber && <Text className="font-inter text-xs text-neutral-500 mt-0.5">No: {item.documentNumber}</Text>}
                    {item.expiryDate && <Text className="font-inter text-xs text-warning-600 mt-0.5">Expires: {item.expiryDate.split('T')[0]}</Text>}
                    {item.createdAt && <Text className="font-inter text-[10px] text-neutral-400 mt-1">Uploaded: {item.createdAt.split('T')[0]}</Text>}
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title={showForm ? 'Upload Document' : 'My Documents'} onMenuPress={open} />

            {showForm ? (
                <UploadForm
                    onClose={() => setShowForm(false)}
                    onSave={handleUpload}
                    isSaving={uploadDoc.isPending}
                />
            ) : (
                <>
                    <FlatList
                        data={documents}
                        keyExtractor={(item) => item.id ?? String(Math.random())}
                        renderItem={renderItem}
                        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
                        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
                        ListHeaderComponent={
                            documents.length > 0 ? (
                                <View style={{ marginBottom: 12 }}>
                                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                                        {documents.length} Document{documents.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            isLoading ? (
                                <View><SkeletonCard /><SkeletonCard /></View>
                            ) : (
                                <View style={{ alignItems: 'center', paddingTop: 80 }}>
                                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                        <Svg width={28} height={28} viewBox="0 0 24 24">
                                            <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={colors.primary[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                    </View>
                                    <Text className="font-inter text-sm font-bold text-primary-950 mb-1">No Documents Yet</Text>
                                    <Text className="font-inter text-xs text-neutral-400 text-center" style={{ maxWidth: 220 }}>
                                        Tap the + button to upload your first document.
                                    </Text>
                                </View>
                            )
                        }
                    />
                    <FAB onPress={() => setShowForm(true)} />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    formContent: { paddingHorizontal: 20, paddingTop: 20 },
    card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    docIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    empty: { alignItems: 'center', paddingTop: 60 },
    fieldWrap: { marginBottom: 16 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

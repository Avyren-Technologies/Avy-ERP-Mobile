/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
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
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { DatePickerField } from '@/components/ui/date-picker';
import { FAB } from '@/components/ui/fab';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage } from '@/components/ui/utils';
import { useDeleteMyDocument, useUploadMyDocument } from '@/features/company-admin/api/use-ess-mutations';
import { useMyDocuments } from '@/features/company-admin/api/use-ess-queries';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useFileUrl } from '@/hooks/use-file-url';
import { useIsDark } from '@/hooks/use-is-dark';

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

// ── Document Viewer Button ───────────────────────────────────────

function ViewDocumentButton({ fileKey }: { fileKey: string | null | undefined }) {
    const { url, isLoading } = useFileUrl({ key: fileKey });

    const handleView = () => {
        if (url) {
            Linking.openURL(url).catch(() => showErrorMessage('Could not open document'));
        }
    };

    if (!fileKey) return null;

    return (
        <Pressable onPress={handleView} disabled={isLoading} style={styles.viewBtn}>
            {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary[600]} />
            ) : (
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            )}
        </Pressable>
    );
}

// ── Upload Form (inline page) ─────────────────────────────────────

function UploadForm({
    onClose, onSave, isSaving,
}: {
    onClose: () => void;
    onSave: (data: { documentType: string; documentNumber: string; expiryDate: string; fileKey: string; fileName: string }) => void;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [documentType, setDocumentType] = React.useState('');
    const [documentNumber, setDocumentNumber] = React.useState('');
    const [expiryDate, setExpiryDate] = React.useState('');
    const [fileName, setFileName] = React.useState('');
    const [fileKey, setFileKey] = React.useState('');

    const { upload, isUploading } = useFileUpload({
        category: 'employee-document',
        entityId: 'self',
        onSuccess: (key) => setFileKey(key),
    });

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            setFileName(asset.name);
            await upload({
                uri: asset.uri,
                name: asset.name,
                type: asset.mimeType ?? 'application/octet-stream',
                size: asset.size ?? 0,
            });
        } catch {
            showErrorMessage('Failed to pick file');
        }
    };

    const isValid = documentType && fileKey && fileName.trim();

    return (
        <Animated.View entering={FadeInRight.duration(300)} style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.formHeader}>
                <Pressable onPress={onClose} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M15 18l-6-6 6-6" stroke={colors.primary[700]} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Upload Document</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 100 }]}
            >
                {/* Document Type — chip selector */}
                <View style={styles.fieldWrap}>
                    <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                        Document Type <Text className="text-danger-500">*</Text>
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {DOCUMENT_TYPES.map(opt => (
                            <Pressable
                                key={opt}
                                onPress={() => setDocumentType(opt)}
                                style={[styles.chip, documentType === opt && styles.chipActive]}
                            >
                                <Text className={`font-inter text-xs font-semibold ${documentType === opt ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                    {opt}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Document Number */}
                <View style={styles.fieldWrap}>
                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
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

                {/* File Upload */}
                <View style={styles.fieldWrap}>
                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                        Attach File <Text className="text-danger-500">*</Text>
                    </Text>
                    <Pressable onPress={handlePickFile} disabled={isUploading} style={[styles.uploadBtn, isUploading && { opacity: 0.6 }]}>
                        {isUploading ? (
                            <ActivityIndicator size="small" color={colors.primary[600]} />
                        ) : (
                            <Svg width={20} height={20} viewBox="0 0 24 24">
                                <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        )}
                        <Text className="font-inter text-sm font-semibold text-primary-600 ml-2">
                            {isUploading ? 'Uploading...' : fileName ? fileName : 'Choose File'}
                        </Text>
                    </Pressable>
                    {fileKey ? (
                        <Text className="font-inter text-[10px] text-success-600 mt-1">File uploaded successfully</Text>
                    ) : null}
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <Pressable onPress={onClose} style={styles.cancelBtn}>
                        <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => onSave({ documentType, documentNumber: documentNumber.trim(), expiryDate: expiryDate.trim(), fileKey, fileName: fileName.trim() })}
                        disabled={!isValid || isSaving || isUploading}
                        style={[styles.saveBtn, (!isValid || isSaving || isUploading) && { opacity: 0.5 }]}
                    >
                        <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Upload Document'}</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </Animated.View>
    );
}

// ── Main Screen ──────────────────────────────────────────────────

export function MyDocumentsScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data, isLoading, refetch } = useMyDocuments();
    const uploadDoc = useUploadMyDocument();
    const deleteMutation = useDeleteMyDocument();

    const [showForm, setShowForm] = React.useState(false);

    const documents = React.useMemo(() => {
        const raw = data as any;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
    }, [data]);

    const handleUpload = (formData: { documentType: string; documentNumber: string; expiryDate: string; fileKey: string; fileName: string }) => {
        // Backend validator expects `fileUrl` (stores R2 key), not `fileKey`
        const payload: any = {
            documentType: formData.documentType,
            fileName: formData.fileName,
            fileUrl: formData.fileKey, // R2 key maps to fileUrl in backend schema
        };
        if (formData.documentNumber) payload.documentNumber = formData.documentNumber;
        if (formData.expiryDate) payload.expiryDate = formData.expiryDate;
        uploadDoc.mutate(payload, {
            onSuccess: () => setShowForm(false),
        });
    };

    const handleDelete = (item: any) => {
        showConfirm({
            title: 'Delete Document',
            message: `Are you sure you want to delete "${item.fileName ?? item.documentType ?? 'this document'}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => deleteMutation.mutate(item.id),
        });
    };

    const handleView = (item: any) => {
        if (item.fileUrl) {
            Linking.openURL(item.fileUrl).catch(() => showErrorMessage('Could not open document'));
        }
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
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{item.fileName ?? item.documentNumber ?? '--'}</Text>
                        {item.documentType && (
                            <View style={[styles.typeBadge, { backgroundColor: colors.accent[50] }]}>
                                <Text style={{ color: colors.accent[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.documentType}</Text>
                            </View>
                        )}
                    </View>
                    {item.documentNumber && <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">No: {item.documentNumber}</Text>}
                    {item.expiryDate && <Text className="font-inter text-xs text-warning-600 mt-0.5">Expires: {item.expiryDate.split('T')[0]}</Text>}
                    {item.createdAt && <Text className="font-inter text-[10px] text-neutral-400 mt-1">Uploaded: {item.createdAt.split('T')[0]}</Text>}
                </View>
            </View>
            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                {/* View button — fileUrl stores R2 key, use ViewDocumentButton for pre-signed URL */}
                {item.fileUrl ? (
                    <ViewDocumentButton fileKey={item.fileUrl} />
                ) : null}
                {/* Delete button */}
                <Pressable onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={colors.danger[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
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
                                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                        <Svg width={28} height={28} viewBox="0 0 24 24">
                                            <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={colors.primary[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                    </View>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-1">No Documents Yet</Text>
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
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
    formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    formContent: { paddingHorizontal: 20, paddingTop: 20 },
    card: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    docIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    empty: { alignItems: 'center', paddingTop: 60 },
    fieldWrap: { marginBottom: 16 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary[200], borderStyle: 'dashed', paddingVertical: 16 },
    viewBtn: { padding: 8, borderRadius: 8, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderWidth: 1, borderColor: isDark ? colors.primary[800] : colors.primary[100] },
    deleteBtn: { padding: 8, borderRadius: 8, backgroundColor: colors.danger[50], borderWidth: 1, borderColor: colors.danger[100] },
});
const styles = createStyles(false);

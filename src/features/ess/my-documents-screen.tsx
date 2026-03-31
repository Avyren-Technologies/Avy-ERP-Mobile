/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { FAB } from '@/components/ui/fab';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage } from '@/components/ui/utils';
import { useMyDocuments } from '@/features/company-admin/api/use-ess-queries';
import { useUploadMyDocument } from '@/features/company-admin/api/use-ess-mutations';

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

// ── Upload Document Modal ────────────────────────────────────────

function UploadDocumentModal({
    visible, onClose, onSave, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: { documentType: string; documentNumber: string; expiryDate: string; fileUrl: string; fileName: string }) => void;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [documentType, setDocumentType] = React.useState('');
    const [documentNumber, setDocumentNumber] = React.useState('');
    const [expiryDate, setExpiryDate] = React.useState('');
    const [fileUrl, setFileUrl] = React.useState('');
    const [fileName, setFileName] = React.useState('');
    const [typePickerVisible, setTypePickerVisible] = React.useState(false);

    React.useEffect(() => {
        if (visible) { setDocumentType(''); setDocumentNumber(''); setExpiryDate(''); setFileUrl(''); setFileName(''); }
    }, [visible]);

    const isValid = documentType && documentNumber.trim() && fileName.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Upload Document</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
                        {/* Document Type Picker */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Document Type <Text className="text-danger-500">*</Text>
                            </Text>
                            <Pressable onPress={() => setTypePickerVisible(true)} style={styles.dropdownBtn}>
                                <Text className={`font-inter text-sm ${documentType ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                                    {documentType || 'Select document type...'}
                                </Text>
                                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Modal visible={typePickerVisible} transparent animationType="slide" onRequestClose={() => setTypePickerVisible(false)}>
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setTypePickerVisible(false)} />
                                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                                        <View style={styles.sheetHandle} />
                                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">Document Type</Text>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {DOCUMENT_TYPES.map(opt => (
                                                <Pressable key={opt} onPress={() => { setDocumentType(opt); setTypePickerVisible(false); }}
                                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt === documentType ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                                    <Text className={`font-inter text-sm ${opt === documentType ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
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
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Expiry Date
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="YYYY-MM-DD (optional)"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={expiryDate}
                                    onChangeText={setExpiryDate}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* File URL */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                File URL
                            </Text>
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
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
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
                </View>
            </View>
        </Modal>
    );
}

// ── Main Screen ──────────────────────────────────────────────────

export function MyDocumentsScreen() {
    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data, isLoading, refetch } = useMyDocuments();
    const uploadDoc = useUploadMyDocument();

    const [formVisible, setFormVisible] = React.useState(false);

    const documents = (data as any)?.data ?? [];

    const handleUpload = (formData: { documentType: string; documentNumber: string; expiryDate: string; fileUrl: string; fileName: string }) => {
        showConfirm({
            title: 'Upload Document',
            message: 'Are you sure you want to upload this document?',
            confirmText: 'Upload',
            variant: 'primary',
            onConfirm: () => {
                uploadDoc.mutate(formData, {
                    onSuccess: () => setFormVisible(false),
                    onError: (err: any) => showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to upload document'),
                });
            },
        });
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.typeBadge, { backgroundColor: colors.accent[50] }]}>
                            <Text style={{ color: colors.accent[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.documentType ?? 'Document'}</Text>
                        </View>
                    </View>
                    <Text className="font-inter text-sm font-bold text-primary-950 mt-2">{item.fileName ?? item.documentNumber ?? '--'}</Text>
                    {item.documentNumber && <Text className="font-inter text-xs text-neutral-500 mt-0.5">No: {item.documentNumber}</Text>}
                </View>
            </View>
            {item.expiryDate && <Text className="font-inter text-xs text-neutral-500 mt-1">Expires: {item.expiryDate}</Text>}
            {item.createdAt && <Text className="font-inter text-[10px] text-neutral-400 mt-1">Uploaded: {item.createdAt}</Text>}
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={open} />
                    <Text className="font-inter text-lg font-bold text-white ml-3">My Documents</Text>
                </View>
            </LinearGradient>
            <FlatList
                data={documents}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text className="font-inter text-sm text-neutral-400">No documents uploaded</Text></View> : null}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <UploadDocumentModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleUpload}
                isSaving={uploadDoc.isPending}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingBottom: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    empty: { alignItems: 'center', paddingTop: 60 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

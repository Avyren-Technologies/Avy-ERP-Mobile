/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useUpdateBankConfig } from '@/features/company-admin/api/use-payroll-mutations';
import { useBankConfig } from '@/features/company-admin/api/use-payroll-queries';

// ============ TYPES ============

type PaymentMode = 'NEFT' | 'RTGS' | 'IMPS';

interface BankConfigForm {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    paymentMode: PaymentMode;
    fileFormat: string;
    autoPushOnApproval: boolean;
}

const DEFAULT_FORM: BankConfigForm = {
    bankName: '', accountNumber: '', ifscCode: '', branchName: '',
    paymentMode: 'NEFT', fileFormat: '', autoPushOnApproval: false,
};

const PAYMENT_MODES: PaymentMode[] = ['NEFT', 'RTGS', 'IMPS'];

// ============ SHARED ATOMS ============

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Text className="mb-1 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</Text>
            {subtitle && <Text className="mb-3 font-inter text-xs text-neutral-500 leading-relaxed">{subtitle}</Text>}
            {!subtitle && <View style={{ height: 8 }} />}
            {children}
        </View>
    );
}

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function ToggleRow({ label, subtitle, value, onToggle }: { label: string; subtitle?: string; value: boolean; onToggle: (v: boolean) => void }) {
    return (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500">{subtitle}</Text>}
            </View>
            <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={value ? colors.primary[600] : colors.neutral[300]} />
        </View>
    );
}

// ============ MAIN ============

export function BankConfigScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { data: response, isLoading, error, refetch } = useBankConfig();
    const updateMutation = useUpdateBankConfig();

    const [form, setForm] = React.useState<BankConfigForm>(DEFAULT_FORM);
    const [hasChanges, setHasChanges] = React.useState(false);

    React.useEffect(() => {
        if (response) {
            const d = (response as any)?.data ?? response;
            if (d && typeof d === 'object') {
                setForm({
                    bankName: d.bankName ?? '',
                    accountNumber: d.accountNumber ?? '',
                    ifscCode: d.ifscCode ?? '',
                    branchName: d.branchName ?? '',
                    paymentMode: d.paymentMode ?? 'NEFT',
                    fileFormat: d.fileFormat ?? '',
                    autoPushOnApproval: d.autoPushOnApproval ?? false,
                });
                setHasChanges(false);
            }
        }
    }, [response]);

    const updateForm = (updates: Partial<BankConfigForm>) => {
        setForm(prev => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    const handleSave = () => {
        updateMutation.mutate(form as unknown as Record<string, unknown>, {
            onSuccess: () => setHasChanges(false),
        });
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="Bank Configuration" onMenuPress={toggle} />
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="Bank Configuration" onMenuPress={toggle} />
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Bank Configuration" onMenuPress={toggle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    <SectionCard title="Bank Details" subtitle="Primary bank account for salary payments">
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Bank Name</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "HDFC Bank"' placeholderTextColor={colors.neutral[400]} value={form.bankName} onChangeText={v => updateForm({ bankName: v })} autoCapitalize="words" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Account Number</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Enter account number" placeholderTextColor={colors.neutral[400]} value={form.accountNumber} onChangeText={v => updateForm({ accountNumber: v })} keyboardType="number-pad" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">IFSC Code</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "HDFC0001234"' placeholderTextColor={colors.neutral[400]} value={form.ifscCode} onChangeText={v => updateForm({ ifscCode: v.toUpperCase() })} autoCapitalize="characters" /></View>
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">Auto-lookup will verify IFSC code</Text>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Branch Name</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Branch name" placeholderTextColor={colors.neutral[400]} value={form.branchName} onChangeText={v => updateForm({ branchName: v })} autoCapitalize="words" /></View>
                        </View>
                    </SectionCard>

                    <SectionCard title="Payment Settings" subtitle="How salaries are disbursed">
                        <ChipSelector label="Payment Mode" options={PAYMENT_MODES} value={form.paymentMode} onSelect={v => updateForm({ paymentMode: v as PaymentMode })} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">File Format</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Bank-specific file format identifier" placeholderTextColor={colors.neutral[400]} value={form.fileFormat} onChangeText={v => updateForm({ fileFormat: v })} /></View>
                        </View>
                        <ToggleRow label="Auto-Push on Approval" subtitle="Automatically initiate payment when payroll is approved" value={form.autoPushOnApproval} onToggle={v => updateForm({ autoPushOnApproval: v })} />
                    </SectionCard>
                </Animated.View>
            </ScrollView>

            {/* Save bar */}
            <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable onPress={handleSave} disabled={!hasChanges || updateMutation.isPending} style={[styles.saveBtnFull, (!hasChanges || updateMutation.isPending) && { opacity: 0.5 }]}>
                    {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">{hasChanges ? 'Save Changes' : 'No Changes'}</Text>}
                </Pressable>
            </View>
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    scrollContent: { paddingHorizontal: 24 },
    sectionCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    fieldWrap: { marginTop: 12, marginBottom: 4 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    saveBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12,
        backgroundColor: 'rgba(248, 247, 255, 0.95)', borderTopWidth: 1, borderTopColor: colors.neutral[100],
    },
    saveBtnFull: {
        height: 56, borderRadius: 16, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
});

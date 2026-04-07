/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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

import {
    useCreateITDeclaration,
    useLockITDeclaration,
    useSubmitITDeclaration,
    useVerifyITDeclaration,
} from '@/features/company-admin/api/use-ess-mutations';
import { useITDeclarations } from '@/features/company-admin/api/use-ess-queries';
import { useCanPerform } from '@/hooks/use-can-perform';

// ============ TYPES ============

type DeclarationStatus = 'Draft' | 'Submitted' | 'Verified' | 'Locked';
type TaxRegime = 'Old' | 'New';

interface DeclarationItem {
    id: string;
    employeeName: string;
    financialYear: string;
    regime: TaxRegime;
    totalDeclared: number;
    status: DeclarationStatus;
}

interface DeclarationForm {
    employeeName: string;
    financialYear: string;
    regime: TaxRegime;
    // Section 80C
    lic: string; ppf: string; elss: string; nsc: string; homeLoanPrincipal: string; schoolFees: string;
    // Section 80CCD
    npsEmployee: string; npsAdditional: string;
    // Section 80D
    selfHealthPremium: string; parentPremium: string; seniorCitizen: boolean;
    // Section 80E, 80G, 80GG, 80TTA
    educationLoanInterest: string; donations: string; rentPaid80GG: string; savingsInterest: string;
    // HRA
    hraRent: string; landlordPan: string; landlordName: string; cityType: string;
    // LTA
    travelCost: string;
    // Home Loan Interest
    homeLoanInterest: string; lenderName: string; lenderPan: string;
    // Other Income
    interestIncome: string; rentalIncome: string; otherSources: string;
}

// ============ CONSTANTS ============

const STATUS_COLORS: Record<DeclarationStatus, { bg: string; text: string; dot: string }> = {
    Draft: { bg: colors.neutral[100], text: colors.neutral[700], dot: colors.neutral[400] },
    Submitted: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    Verified: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    Locked: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
};

const REGIME_COLORS: Record<TaxRegime, { bg: string; text: string }> = {
    Old: { bg: colors.warning[50], text: colors.warning[700] },
    New: { bg: colors.success[50], text: colors.success[700] },
};

const SEC_80C_CAP = 150000;

const DEFAULT_FORM: DeclarationForm = {
    employeeName: '', financialYear: '2025-26', regime: 'Old',
    lic: '', ppf: '', elss: '', nsc: '', homeLoanPrincipal: '', schoolFees: '',
    npsEmployee: '', npsAdditional: '',
    selfHealthPremium: '', parentPremium: '', seniorCitizen: false,
    educationLoanInterest: '', donations: '', rentPaid80GG: '', savingsInterest: '',
    hraRent: '', landlordPan: '', landlordName: '', cityType: 'Metro',
    travelCost: '',
    homeLoanInterest: '', lenderName: '', lenderPan: '',
    interestIncome: '', rentalIncome: '', otherSources: '',
};

// ============ HELPERS ============

function num(v: string): number { return Number(v) || 0; }

function formatCurrency(n: number): string {
    return `₹${  n.toLocaleString('en-IN')}`;
}

function normalizeDeclarationStatus(value: unknown): DeclarationStatus {
    const raw = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    switch (raw) {
        case 'submitted':
            return 'Submitted';
        case 'verified':
            return 'Verified';
        case 'locked':
            return 'Locked';
        case 'draft':
        default:
            return 'Draft';
    }
}

function normalizeTaxRegime(value: unknown): TaxRegime {
    const raw = String(value ?? '').trim().toLowerCase();
    return raw === 'new' ? 'New' : 'Old';
}

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: string }) {
    const normalizedStatus = normalizeDeclarationStatus(status);
    const s = STATUS_COLORS[normalizedStatus];
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{normalizedStatus}</Text>
        </View>
    );
}

function RegimeBadge({ regime }: { regime: TaxRegime }) {
    const c = REGIME_COLORS[regime];
    return (
        <View style={[styles.regimeBadge, { backgroundColor: c.bg }]}>
            <Text style={{ color: c.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{regime} Regime</Text>
        </View>
    );
}

function SectionCard({ title, subtitle, collapsed, onToggle, children }: { title: string; subtitle?: string; collapsed: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Pressable onPress={onToggle} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</Text>
                    {subtitle && <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">{subtitle}</Text>}
                </View>
                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d={collapsed ? 'M6 9l6 6 6-6' : 'M18 15l-6-6-6 6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            {!collapsed && <View style={{ marginTop: 12 }}>{children}</View>}
        </View>
    );
}

function AmountField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                <Text className="mr-2 font-inter text-sm text-neutral-400">{'₹'}</Text>
                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder={placeholder ?? '0'} placeholderTextColor={colors.neutral[400]} value={value} onChangeText={onChange} keyboardType="number-pad" />
            </View>
        </View>
    );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder={placeholder ?? ''} placeholderTextColor={colors.neutral[400]} value={value} onChangeText={onChange} /></View>
        </View>
    );
}

// ============ DECLARATION FORM MODAL ============

function DeclarationFormModal({
    visible, onClose, onSave, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<DeclarationForm>(DEFAULT_FORM);
    const [collapsed, setCollapsed] = React.useState({
        s80c: false, s80ccd: true, s80d: true, s80e: true, hra: true, lta: true, homeLoan: true, otherIncome: true,
    });

    React.useEffect(() => {
        if (visible) setForm(DEFAULT_FORM);
    }, [visible]);

    const update = (patch: Partial<DeclarationForm>) => setForm(prev => ({ ...prev, ...patch }));
    const toggle = (key: keyof typeof collapsed) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    // Calculate totals
    const sec80CTotal = Math.min(num(form.lic) + num(form.ppf) + num(form.elss) + num(form.nsc) + num(form.homeLoanPrincipal) + num(form.schoolFees), SEC_80C_CAP);
    const sec80CCDTotal = num(form.npsEmployee) + Math.min(num(form.npsAdditional), 50000);
    const sec80DTotal = num(form.selfHealthPremium) + num(form.parentPremium);
    const otherDeductions = num(form.educationLoanInterest) + num(form.donations) + num(form.rentPaid80GG) + num(form.savingsInterest);
    const hraTotal = num(form.hraRent);
    const ltaTotal = num(form.travelCost);
    const homeLoanTotal = num(form.homeLoanInterest);
    const totalDeductions = sec80CTotal + sec80CCDTotal + sec80DTotal + otherDeductions + hraTotal + ltaTotal + homeLoanTotal;
    const otherIncome = num(form.interestIncome) + num(form.rentalIncome) + num(form.otherSources);

    const isValid = form.financialYear.trim();

    const handleSave = () => {
        if (!isValid) return;
        // Build backend-compatible payload with section objects
        const payload: Record<string, unknown> = {
            financialYear: form.financialYear,
            regime: form.regime === 'Old' ? 'OLD' : 'NEW',
            section80C: {
                lifeInsurance: num(form.lic), ppf: num(form.ppf), elss: num(form.elss),
                nsc: num(form.nsc), homeLoanPrincipal: num(form.homeLoanPrincipal), tuitionFees: num(form.schoolFees),
            },
            section80CCD: { npsEmployee: num(form.npsEmployee), npsAdditional: num(form.npsAdditional) },
            section80D: { selfFamilyPremium: num(form.selfHealthPremium), parentsPremium: num(form.parentPremium) },
            section80E: { educationLoanInterest: num(form.educationLoanInterest) },
            section80G: { donations: num(form.donations) },
            section80GG: { rentPaid: num(form.rentPaid80GG) },
            section80TTA: { savingsInterest: num(form.savingsInterest) },
            hraExemption: { rentPaid: num(form.hraRent), landlordPan: form.landlordPan, landlordName: form.landlordName, cityType: form.cityType },
            ltaExemption: { travelCost: num(form.travelCost) },
            homeLoanInterest: { interestAmount: num(form.homeLoanInterest), lenderName: form.lenderName, lenderPan: form.lenderPan },
            otherIncome: { interestIncome: num(form.interestIncome), rentalIncome: num(form.rentalIncome), otherSources: num(form.otherSources) },
        };
        // employeeName is kept for HR display; backend uses employeeId (auto-set for non-HR)
        if (form.employeeName.trim()) payload.employeeName = form.employeeName;
        onSave(payload);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.fullFormSheet, { paddingBottom: insets.bottom + 20, marginTop: insets.top + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">New IT Declaration (Form 12BB)</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                        {/* Basic Info */}
                        <TextField label="Employee Name" value={form.employeeName} onChange={v => update({ employeeName: v })} placeholder="Search employee..." />
                        <TextField label="Financial Year" value={form.financialYear} onChange={v => update({ financialYear: v })} placeholder="2025-26" />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Tax Regime</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {(['Old', 'New'] as TaxRegime[]).map(r => {
                                    const sel = r === form.regime;
                                    return (
                                        <Pressable key={r} onPress={() => update({ regime: r })} style={[styles.chip, sel && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{r} Regime</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Section 80C */}
                        <SectionCard title="Section 80C" subtitle={`Cap: ${formatCurrency(SEC_80C_CAP)} | Total: ${formatCurrency(sec80CTotal)}`} collapsed={collapsed.s80c} onToggle={() => toggle('s80c')}>
                            <AmountField label="LIC Premium" value={form.lic} onChange={v => update({ lic: v })} />
                            <AmountField label="PPF" value={form.ppf} onChange={v => update({ ppf: v })} />
                            <AmountField label="ELSS" value={form.elss} onChange={v => update({ elss: v })} />
                            <AmountField label="NSC" value={form.nsc} onChange={v => update({ nsc: v })} />
                            <AmountField label="Home Loan Principal" value={form.homeLoanPrincipal} onChange={v => update({ homeLoanPrincipal: v })} />
                            <AmountField label="School Fees" value={form.schoolFees} onChange={v => update({ schoolFees: v })} />
                        </SectionCard>

                        {/* Section 80CCD */}
                        <SectionCard title="Section 80CCD" subtitle={`NPS | Total: ${formatCurrency(sec80CCDTotal)}`} collapsed={collapsed.s80ccd} onToggle={() => toggle('s80ccd')}>
                            <AmountField label="NPS Employee Contribution" value={form.npsEmployee} onChange={v => update({ npsEmployee: v })} />
                            <AmountField label="NPS Additional (max 50,000)" value={form.npsAdditional} onChange={v => update({ npsAdditional: v })} />
                        </SectionCard>

                        {/* Section 80D */}
                        <SectionCard title="Section 80D" subtitle={`Health Insurance | Total: ${formatCurrency(sec80DTotal)}`} collapsed={collapsed.s80d} onToggle={() => toggle('s80d')}>
                            <AmountField label="Self / Family Health Premium" value={form.selfHealthPremium} onChange={v => update({ selfHealthPremium: v })} />
                            <AmountField label="Parent Health Premium" value={form.parentPremium} onChange={v => update({ parentPremium: v })} />
                            <View style={styles.toggleRow}>
                                <Text className="font-inter text-sm font-semibold text-primary-950" style={{ flex: 1 }}>Senior Citizen Parent</Text>
                                <Pressable onPress={() => update({ seniorCitizen: !form.seniorCitizen })} style={[styles.miniToggle, form.seniorCitizen && styles.miniToggleActive]}>
                                    <Text className={`font-inter text-xs font-semibold ${form.seniorCitizen ? 'text-white' : 'text-neutral-500'}`}>{form.seniorCitizen ? 'Yes' : 'No'}</Text>
                                </Pressable>
                            </View>
                        </SectionCard>

                        {/* Section 80E, 80G, 80GG, 80TTA */}
                        <SectionCard title="Other Deductions" subtitle={`80E, 80G, 80GG, 80TTA | Total: ${formatCurrency(otherDeductions)}`} collapsed={collapsed.s80e} onToggle={() => toggle('s80e')}>
                            <AmountField label="Education Loan Interest (80E)" value={form.educationLoanInterest} onChange={v => update({ educationLoanInterest: v })} />
                            <AmountField label="Donations (80G)" value={form.donations} onChange={v => update({ donations: v })} />
                            <AmountField label="Rent Paid (80GG)" value={form.rentPaid80GG} onChange={v => update({ rentPaid80GG: v })} />
                            <AmountField label="Savings Interest (80TTA)" value={form.savingsInterest} onChange={v => update({ savingsInterest: v })} />
                        </SectionCard>

                        {/* HRA Exemption */}
                        <SectionCard title="HRA Exemption" subtitle={`Rent: ${formatCurrency(hraTotal)}`} collapsed={collapsed.hra} onToggle={() => toggle('hra')}>
                            <AmountField label="Rent Paid" value={form.hraRent} onChange={v => update({ hraRent: v })} />
                            <TextField label="Landlord PAN" value={form.landlordPan} onChange={v => update({ landlordPan: v })} placeholder="ABCDE1234F" />
                            <TextField label="Landlord Name" value={form.landlordName} onChange={v => update({ landlordName: v })} />
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">City Type</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {['Metro', 'Non-Metro'].map(c => {
                                        const sel = c === form.cityType;
                                        return (
                                            <Pressable key={c} onPress={() => update({ cityType: c })} style={[styles.chip, sel && styles.chipActive]}>
                                                <Text className={`font-inter text-xs font-semibold ${sel ? 'text-white' : 'text-neutral-600'}`}>{c}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        </SectionCard>

                        {/* LTA */}
                        <SectionCard title="LTA Exemption" subtitle={`Travel: ${formatCurrency(ltaTotal)}`} collapsed={collapsed.lta} onToggle={() => toggle('lta')}>
                            <AmountField label="Travel Cost" value={form.travelCost} onChange={v => update({ travelCost: v })} />
                        </SectionCard>

                        {/* Home Loan Interest */}
                        <SectionCard title="Home Loan Interest" subtitle={`Interest: ${formatCurrency(homeLoanTotal)}`} collapsed={collapsed.homeLoan} onToggle={() => toggle('homeLoan')}>
                            <AmountField label="Interest Amount" value={form.homeLoanInterest} onChange={v => update({ homeLoanInterest: v })} />
                            <TextField label="Lender Name" value={form.lenderName} onChange={v => update({ lenderName: v })} />
                            <TextField label="Lender PAN" value={form.lenderPan} onChange={v => update({ lenderPan: v })} placeholder="ABCDE1234F" />
                        </SectionCard>

                        {/* Other Income */}
                        <SectionCard title="Other Income" subtitle={`Total: ${formatCurrency(otherIncome)}`} collapsed={collapsed.otherIncome} onToggle={() => toggle('otherIncome')}>
                            <AmountField label="Interest Income" value={form.interestIncome} onChange={v => update({ interestIncome: v })} />
                            <AmountField label="Rental Income" value={form.rentalIncome} onChange={v => update({ rentalIncome: v })} />
                            <AmountField label="Other Sources" value={form.otherSources} onChange={v => update({ otherSources: v })} />
                        </SectionCard>

                        {/* Summary */}
                        <View style={styles.summaryCard}>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Summary</Text>
                            <View style={styles.summaryRow}><Text className="font-inter text-sm text-neutral-600">Total Deductions</Text><Text className="font-inter text-sm font-bold text-primary-700">{formatCurrency(totalDeductions)}</Text></View>
                            <View style={styles.summaryRow}><Text className="font-inter text-sm text-neutral-600">Other Income</Text><Text className="font-inter text-sm font-bold text-warning-700">{formatCurrency(otherIncome)}</Text></View>
                            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.neutral[200], paddingTop: 8, marginTop: 4 }]}>
                                <Text className="font-inter text-sm font-bold text-primary-950">Estimated Tax Savings</Text>
                                <Text className="font-inter text-sm font-bold text-success-600">{formatCurrency(Math.round(totalDeductions * 0.3))}</Text>
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Save as Draft'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ DECLARATION CARD ============

function DeclarationCard({ item, index, onSubmit, onVerify, onLock, canVerify, canLock }: {
    item: DeclarationItem; index: number;
    onSubmit: () => void; onVerify: () => void; onLock: () => void;
    canVerify: boolean; canLock: boolean;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500">FY {item.financialYear}</Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <RegimeBadge regime={item.regime} />
                    <Text className="font-inter text-sm font-bold text-primary-700">{formatCurrency(item.totalDeclared)}</Text>
                </View>
                {/* Status Actions */}
                {item.status === 'Draft' && (
                    <Pressable onPress={onSubmit} style={[styles.actionBtn, { backgroundColor: colors.info[600] }]}>
                        <Text className="font-inter text-xs font-bold text-white">Submit</Text>
                    </Pressable>
                )}
                {canVerify && item.status === 'Submitted' && (
                    <Pressable onPress={onVerify} style={[styles.actionBtn, { backgroundColor: colors.success[600] }]}>
                        <Text className="font-inter text-xs font-bold text-white">Verify</Text>
                    </Pressable>
                )}
                {canLock && item.status === 'Verified' && (
                    <Pressable onPress={onLock} style={[styles.actionBtn, { backgroundColor: colors.primary[600] }]}>
                        <Text className="font-inter text-xs font-bold text-white">Lock</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function ITDeclarationScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
    const canVerify = useCanPerform('hr:approve') || useCanPerform('company:configure');
    const canLock = useCanPerform('hr:approve') || useCanPerform('company:configure');
    const isHrAdmin = useCanPerform('hr:approve') || useCanPerform('hr:configure') || useCanPerform('company:configure');

    const { data: response, isLoading, error, refetch, isFetching } = useITDeclarations();
    const createMutation = useCreateITDeclaration();
    const submitMutation = useSubmitITDeclaration();
    const verifyMutation = useVerifyITDeclaration();
    const lockMutation = useLockITDeclaration();

    const [formVisible, setFormVisible] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const declarations: DeclarationItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => {
            // Map nested employee object to flat name
            const emp = item.employee ?? {};
            const empName = item.employeeName
                || [emp.firstName, emp.lastName].filter(Boolean).join(' ')
                || emp.employeeId || '—';
            // Compute total from section data if not provided
            let totalDeclared = item.totalDeclared ?? 0;
            if (!totalDeclared) {
                const sumObj = (obj: any) => {
                    if (!obj || typeof obj !== 'object') return 0;
                    return Object.values(obj).reduce((s: number, v) => s + (Number(v) || 0), 0);
                };
                totalDeclared += Math.min(sumObj(item.section80C), 150000);
                const ccd = item.section80CCD;
                if (ccd) totalDeclared += (Number(ccd.npsEmployee) || 0) + Math.min(Number(ccd.npsAdditional) || 0, 50000);
                totalDeclared += sumObj(item.section80D);
                for (const key of ['section80E', 'section80G', 'section80GG', 'section80TTA', 'hraExemption', 'ltaExemption', 'homeLoanInterest']) {
                    totalDeclared += sumObj(item[key]);
                }
            }
            return {
                id: item.id ?? '',
                employeeName: empName,
                financialYear: item.financialYear ?? '',
                regime: normalizeTaxRegime(item.regime),
                totalDeclared,
                status: normalizeDeclarationStatus(item.status),
            };
        });
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return declarations;
        const q = search.toLowerCase();
        return declarations.filter(d => d.employeeName.toLowerCase().includes(q) || d.financialYear.includes(q));
    }, [declarations, search]);

    const handleSubmitDecl = (item: DeclarationItem) => {
        showConfirm({
            title: 'Submit Declaration', message: `Submit IT declaration for ${item.employeeName} (FY ${item.financialYear})?`,
            confirmText: 'Submit', variant: 'primary', onConfirm: () => submitMutation.mutate(item.id),
        });
    };

    const handleVerify = (item: DeclarationItem) => {
        showConfirm({
            title: 'Verify Declaration', message: `Verify IT declaration for ${item.employeeName}?`,
            confirmText: 'Verify', variant: 'primary', onConfirm: () => verifyMutation.mutate(item.id),
        });
    };

    const handleLock = (item: DeclarationItem) => {
        showConfirm({
            title: 'Lock Declaration', message: `Lock IT declaration for ${item.employeeName}? This cannot be undone.`,
            confirmText: 'Lock', variant: 'warning', onConfirm: () => lockMutation.mutate(item.id),
        });
    };

    const handleCreateSave = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const renderItem = ({ item, index }: { item: DeclarationItem; index: number }) => (
        <DeclarationCard item={item} index={index} onSubmit={() => handleSubmitDecl(item)} onVerify={() => handleVerify(item)} onLock={() => handleLock(item)} canVerify={canVerify} canLock={canLock} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">IT Declarations</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">
                {isHrAdmin ? `${declarations.length} declaration${declarations.length !== 1 ? 's' : ''}` : 'Your income tax declarations'}
            </Text>
            <View style={{ marginTop: 14 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee or FY..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No declarations" message="Create the first IT declaration." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="IT Declarations" onMenuPress={toggle} />
            <FlashList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <DeclarationFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleCreateSave} isSaving={createMutation.isPending} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    regimeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    actionBtn: { marginTop: 10, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    sectionCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    summaryCard: {
        backgroundColor: colors.primary[50], borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: colors.primary[100],
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    fullFormSheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 12 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    miniToggle: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200] },
    miniToggleActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

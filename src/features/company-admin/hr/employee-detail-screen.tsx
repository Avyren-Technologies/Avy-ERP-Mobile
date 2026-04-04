/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { storage } from '@/lib/storage';
import { computeProbationEndIsoFromMasters } from '@/lib/probation-end-date';
import { resolveCostCentreIdForDepartment } from '@/lib/employee-org-defaults';

import {
    useCreateEmployee,
    useDeleteEmployee,
    useUpdateEmployee,
    useUpdateEmployeeStatus,
} from '@/features/company-admin/api/use-hr-mutations';
import {
    useCostCentres,
    useDepartments,
    useDesignations,
    useEmployee,
    useEmployeeDocuments,
    useEmployeeTimeline,
    useEmployeeTypes,
    useEmployees,
    useGrades,
} from '@/features/company-admin/api/use-hr-queries';
import { useRbacRoles, useCompanyLocations, useCompanyShifts } from '@/features/company-admin/api/use-company-admin-queries';

// ============ TYPES ============

type EmployeeStatus = 'Active' | 'Probation' | 'Confirmed' | 'On Notice' | 'Suspended' | 'Exited';
type TabKey = 'personal' | 'professional' | 'salary' | 'bank' | 'documents' | 'timeline';

interface PersonalForm {
    firstName: string;
    middleName: string;
    lastName: string;
    dob: string;
    gender: string;
    maritalStatus: string;
    bloodGroup: string;
    fatherName: string;
    motherName: string;
    nationality: string;
    religion: string;
    category: string;
    personalMobile: string;
    alternativeMobile: string;
    personalEmail: string;
    officialEmail: string;
    currentLine1: string;
    currentLine2: string;
    currentCity: string;
    currentState: string;
    currentPin: string;
    currentCountry: string;
    sameAsCurrent: boolean;
    permanentLine1: string;
    permanentLine2: string;
    permanentCity: string;
    permanentState: string;
    permanentPin: string;
    permanentCountry: string;
    emergencyName: string;
    emergencyRelation: string;
    emergencyMobile: string;
}

interface ProfessionalForm {
    joiningDate: string;
    employeeTypeId: string;
    departmentId: string;
    designationId: string;
    gradeId: string;
    reportingManagerId: string;
    functionalManagerId: string;
    workType: string;
    shiftId: string;
    locationId: string;
    costCentreId: string;
    noticePeriodDays: string;
    probationEndDate: string;
}

interface SalaryForm {
    annualCtc: string;
    paymentMode: string;
    salaryStructure: string;
}

interface BankForm {
    ifscCode: string;
    bankName: string;
    bankBranch: string;
    accountNumber: string;
    confirmAccountNumber: string;
    accountType: string;
}

interface DocumentsForm {
    pan: string;
    aadhaar: string;
    uan: string;
    esiIpNumber: string;
    passport: string;
    dl: string;
    voterId: string;
}

interface TimelineEvent {
    id: string;
    eventType: string;
    title: string;
    description: string;
    timestamp: string;
    performedBy: string;
}

interface DocItem {
    id: string;
    type: string;
    fileName: string;
    uploadDate: string;
}

const INITIAL_PERSONAL: PersonalForm = {
    firstName: '', middleName: '', lastName: '', dob: '', gender: '',
    maritalStatus: '', bloodGroup: '', fatherName: '', motherName: '',
    nationality: 'Indian', religion: '', category: '', personalMobile: '',
    alternativeMobile: '', personalEmail: '', officialEmail: '', currentLine1: '', currentLine2: '',
    currentCity: '', currentState: '', currentPin: '', currentCountry: 'India',
    sameAsCurrent: true, permanentLine1: '', permanentLine2: '', permanentCity: '',
    permanentState: '', permanentPin: '', permanentCountry: 'India',
    emergencyName: '', emergencyRelation: '', emergencyMobile: '',
};

const INITIAL_PROFESSIONAL: ProfessionalForm = {
    joiningDate: '', employeeTypeId: '', departmentId: '', designationId: '',
    gradeId: '', reportingManagerId: '', functionalManagerId: '', workType: '',
    shiftId: '', locationId: '', costCentreId: '', noticePeriodDays: '',
    probationEndDate: '',
};

const INITIAL_SALARY: SalaryForm = {
    annualCtc: '', paymentMode: '', salaryStructure: '',
};

const INITIAL_BANK: BankForm = {
    ifscCode: '', bankName: '', bankBranch: '', accountNumber: '',
    confirmAccountNumber: '', accountType: '',
};

const INITIAL_DOCUMENTS: DocumentsForm = {
    pan: '', aadhaar: '', uan: '', esiIpNumber: '',
    passport: '', dl: '', voterId: '',
};

const DRAFT_KEY = 'employee_form_draft';

// ============ HELPERS ============

function getInitials(first: string, last: string): string {
    const f = first?.trim()?.[0] ?? '';
    const l = last?.trim()?.[0] ?? '';
    if (f && l) return (f + l).toUpperCase();
    if (f) return f.toUpperCase();
    return '??';
}

function statusBadge(status: EmployeeStatus) {
    switch (status) {
        case 'Active': return { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] };
        case 'Probation': return { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] };
        case 'Confirmed': return { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] };
        case 'On Notice': return { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[600] };
        case 'Suspended': return { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[400] };
        case 'Exited': return { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] };
        default: return { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] };
    }
}

function maskAadhaar(value: string): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return 'XXXX-XXXX-' + digits.slice(-4);
}

function formatCurrency(value: string): string {
    if (!value) return '';
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return value;
    return num.toLocaleString('en-IN');
}

function timelineIcon(eventType: string) {
    switch (eventType) {
        case 'JOINED': return { color: colors.success[500], icon: 'join' };
        case 'PROMOTED': return { color: colors.info[500], icon: 'promote' };
        case 'TRANSFERRED': return { color: colors.primary[500], icon: 'transfer' };
        case 'SALARY_REVISED': return { color: colors.warning[500], icon: 'salary' };
        case 'CONFIRMED': return { color: colors.success[500], icon: 'confirm' };
        case 'RESIGNED': return { color: colors.danger[500], icon: 'resign' };
        case 'TERMINATED': return { color: colors.danger[600], icon: 'terminate' };
        default: return { color: colors.neutral[400], icon: 'default' };
    }
}

// ============ SUB-COMPONENTS ============

function FormField({
    label,
    value,
    onChangeText,
    placeholder,
    required,
    keyboardType,
    autoCapitalize,
    editable = true,
    multiline,
    error,
    secureTextEntry,
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'numeric';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    editable?: boolean;
    multiline?: boolean;
    error?: string;
    secureTextEntry?: boolean;
}) {
    return (
        <View style={st.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                {label}{required ? <Text className="text-danger-500"> *</Text> : null}
            </Text>
            <TextInput
                style={[
                    st.input,
                    !editable && st.inputReadOnly,
                    error && st.inputError,
                    multiline && { height: 80, textAlignVertical: 'top' },
                ]}
                placeholder={placeholder}
                placeholderTextColor={colors.neutral[400]}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType as any}
                autoCapitalize={autoCapitalize}
                editable={editable}
                multiline={multiline}
                secureTextEntry={secureTextEntry}
            />
            {error ? (
                <Text className="mt-1 font-inter text-[10px] text-danger-600">{error}</Text>
            ) : null}
        </View>
    );
}

function ChipSelect({
    label,
    options,
    selected,
    onSelect,
    required,
}: {
    label: string;
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
    required?: boolean;
}) {
    return (
        <View style={st.field}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900">
                {label}{required ? <Text className="text-danger-500"> *</Text> : null}
            </Text>
            <View style={st.chipRow}>
                {options.map((opt) => {
                    const isActive = selected === opt;
                    return (
                        <Pressable
                            key={opt}
                            onPress={() => onSelect(opt)}
                            style={[st.chip, isActive && st.chipActive]}
                        >
                            <Text
                                className={`font-inter text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-600'}`}
                            >
                                {opt}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function DropdownField({
    label,
    options,
    selected,
    onSelect,
    required,
    placeholder = 'Select...',
    createRoute,
}: {
    label: string;
    options: { id: string; name: string }[];
    selected: string;
    onSelect: (id: string) => void;
    required?: boolean;
    placeholder?: string;
    createRoute?: { route: string; label: string };
}) {
    const [open, setOpen] = React.useState(false);
    const selectedItem = options.find((o) => o.id === selected);
    const router = useRouter();

    return (
        <View style={[st.field, { zIndex: open ? 100 : 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text className="font-inter text-xs font-bold text-primary-900">
                    {label}{required ? <Text className="text-danger-500"> *</Text> : null}
                </Text>
                {createRoute && (
                    <Pressable onPress={() => router.push(createRoute.route as any)} hitSlop={8}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                <Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth={2} strokeLinecap="round" />
                            </Svg>
                            <Text className="font-inter text-[11px] font-bold text-primary-600">Create</Text>
                        </View>
                    </Pressable>
                )}
            </View>
            <Pressable
                onPress={() => setOpen((v) => !v)}
                style={[st.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            >
                <Text
                    className={`font-inter text-sm ${selectedItem ? 'text-primary-950' : 'text-neutral-400'}`}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                >
                    {selectedItem?.name ?? placeholder}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path
                        d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                        stroke={colors.neutral[400]}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Pressable>
            {open && (
                <View style={st.dropdown}>
                    {options.length === 0 ? (
                        <Text className="font-inter text-sm text-neutral-400 py-3 text-center">
                            No {label.toLowerCase()}s available
                        </Text>
                    ) : (
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                            {options.map((opt, idx) => {
                                const isActive = opt.id === selected;
                                return (
                                    <Pressable
                                        key={opt.id}
                                        onPress={() => { onSelect(opt.id); setOpen(false); }}
                                        style={[
                                            st.dropdownItem,
                                            isActive && { backgroundColor: colors.primary[50] },
                                            idx > 0 && { borderTopWidth: 1, borderTopColor: colors.neutral[100] },
                                        ]}
                                    >
                                        <Text
                                            className={`font-inter text-sm ${isActive ? 'font-semibold text-primary-700' : 'text-primary-950'}`}
                                            numberOfLines={1}
                                            style={{ flex: 1 }}
                                        >
                                            {opt.name}
                                        </Text>
                                        {isActive && (
                                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                                <Path d="M5 12l5 5L20 7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
            )}
        </View>
    );
}

function SectionTitle({ title }: { title: string }) {
    return (
        <Text className="mb-3 mt-4 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
            {title}
        </Text>
    );
}

function RoleChipSelectWithCreate({
    dynamicRoles,
    userRole,
    onUserRoleChange,
}: {
    dynamicRoles: { id: string; name: string; isActive?: boolean }[];
    userRole: string;
    onUserRoleChange?: (v: string) => void;
}) {
    const router = useRouter();
    return (
        <View style={st.field}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text className="font-inter text-xs font-bold text-primary-900">Role</Text>
                <Pressable onPress={() => router.push('/company/roles' as any)} hitSlop={8}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                            <Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth={2} strokeLinecap="round" />
                        </Svg>
                        <Text className="font-inter text-[11px] font-bold text-primary-600">Create</Text>
                    </View>
                </Pressable>
            </View>
            <View style={st.chipRow}>
                {dynamicRoles.length === 0 ? (
                    <Text className="font-inter text-sm text-neutral-400 py-1">No roles available</Text>
                ) : (
                    dynamicRoles.map((r) => {
                        const isActive = r.id === userRole;
                        return (
                            <Pressable
                                key={r.id}
                                onPress={() => onUserRoleChange?.(r.id)}
                                style={[st.chip, isActive && st.chipActive]}
                            >
                                <Text
                                    className={`font-inter text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-600'}`}
                                >
                                    {r.name}
                                </Text>
                            </Pressable>
                        );
                    })
                )}
            </View>
        </View>
    );
}

// ============ TAB BAR ============

const TABS: { key: TabKey; label: string }[] = [
    { key: 'personal', label: 'Personal' },
    { key: 'professional', label: 'Professional' },
    { key: 'salary', label: 'Salary' },
    { key: 'bank', label: 'Bank' },
    { key: 'documents', label: 'Documents' },
    { key: 'timeline', label: 'Timeline' },
];

function TabBar({
    active,
    onSelect,
    isCreateMode,
}: {
    active: TabKey;
    onSelect: (key: TabKey) => void;
    isCreateMode?: boolean;
}) {
    const visibleTabs = isCreateMode ? TABS.filter((t) => t.key !== 'timeline') : TABS;
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.tabBarContent}
            style={st.tabBar}
        >
            {visibleTabs.map((tab) => {
                const isActive = active === tab.key;
                return (
                    <Pressable
                        key={tab.key}
                        onPress={() => onSelect(tab.key)}
                        style={[st.tab, isActive && st.tabActive]}
                    >
                        <Text
                            className={`font-inter text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-600'}`}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

// ============ TAB CONTENT COMPONENTS ============

function PersonalTab({
    form,
    onChange,
    isCreateMode,
    createUserAccount,
    onCreateUserAccountChange,
    userPassword,
    onUserPasswordChange,
    confirmPassword,
    onConfirmPasswordChange,
    userRole,
    onUserRoleChange,
    dynamicRoles,
    rolesError,
    rolesLoading,
}: {
    form: PersonalForm;
    onChange: (updates: Partial<PersonalForm>) => void;
    isCreateMode?: boolean;
    createUserAccount?: boolean;
    onCreateUserAccountChange?: (v: boolean) => void;
    userPassword?: string;
    onUserPasswordChange?: (v: string) => void;
    confirmPassword?: string;
    onConfirmPasswordChange?: (v: string) => void;
    userRole?: string;
    onUserRoleChange?: (v: string) => void;
    dynamicRoles?: { id: string; name: string; isActive?: boolean }[];
    rolesError?: boolean;
    rolesLoading?: boolean;
}) {
    const [showPwd, setShowPwd] = React.useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = React.useState(false);
    return (
        <Animated.View entering={FadeIn.duration(300)}>
            <SectionTitle title="Basic Details" />
            <FormField label="First Name" value={form.firstName} onChangeText={(v) => onChange({ firstName: v })} placeholder="e.g. Rahul" required autoCapitalize="words" />
            <FormField label="Middle Name" value={form.middleName} onChangeText={(v) => onChange({ middleName: v })} placeholder="e.g. Kumar" autoCapitalize="words" />
            <FormField label="Last Name" value={form.lastName} onChangeText={(v) => onChange({ lastName: v })} placeholder="e.g. Sharma" required autoCapitalize="words" />
            <FormField label="Date of Birth" value={form.dob} onChangeText={(v) => onChange({ dob: v })} placeholder="YYYY-MM-DD" />
            <ChipSelect label="Gender" options={['Male', 'Female', 'Non-Binary', 'Prefer not to say']} selected={form.gender} onSelect={(v) => onChange({ gender: v })} />
            <ChipSelect label="Marital Status" options={['Single', 'Married', 'Divorced', 'Widowed']} selected={form.maritalStatus} onSelect={(v) => onChange({ maritalStatus: v })} />
            <FormField label="Blood Group" value={form.bloodGroup} onChangeText={(v) => onChange({ bloodGroup: v })} placeholder="e.g. O+" />
            <FormField label="Father's Name" value={form.fatherName} onChangeText={(v) => onChange({ fatherName: v })} autoCapitalize="words" />
            <FormField label="Mother's Name" value={form.motherName} onChangeText={(v) => onChange({ motherName: v })} autoCapitalize="words" />
            <FormField label="Nationality" value={form.nationality} onChangeText={(v) => onChange({ nationality: v })} autoCapitalize="words" />
            <FormField label="Religion" value={form.religion} onChangeText={(v) => onChange({ religion: v })} autoCapitalize="words" />
            <FormField label="Category" value={form.category} onChangeText={(v) => onChange({ category: v })} autoCapitalize="words" />

            <SectionTitle title="Contact" />
            <FormField label="Personal Mobile" value={form.personalMobile} onChangeText={(v) => onChange({ personalMobile: v })} placeholder="+91 98765 43210" keyboardType="phone-pad" required />
            <FormField label="Alternative Mobile" value={form.alternativeMobile} onChangeText={(v) => onChange({ alternativeMobile: v })} keyboardType="phone-pad" />
            <FormField label="Personal Email" value={form.personalEmail} onChangeText={(v) => onChange({ personalEmail: v })} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" required />
            <FormField label="Official Email" value={form.officialEmail} onChangeText={(v) => onChange({ officialEmail: v })} placeholder="name@company.com" keyboardType="email-address" autoCapitalize="none" />

            <SectionTitle title="Current Address" />
            <FormField label="Address Line 1" value={form.currentLine1} onChangeText={(v) => onChange({ currentLine1: v })} placeholder="Street, building" />
            <FormField label="Address Line 2" value={form.currentLine2} onChangeText={(v) => onChange({ currentLine2: v })} placeholder="Area, landmark" />
            <FormField label="City" value={form.currentCity} onChangeText={(v) => onChange({ currentCity: v })} autoCapitalize="words" />
            <FormField label="State" value={form.currentState} onChangeText={(v) => onChange({ currentState: v })} autoCapitalize="words" />
            <FormField label="PIN Code" value={form.currentPin} onChangeText={(v) => onChange({ currentPin: v })} keyboardType="number-pad" />
            <FormField label="Country" value={form.currentCountry} onChangeText={(v) => onChange({ currentCountry: v })} autoCapitalize="words" />

            <SectionTitle title="Permanent Address" />
            <View style={st.toggleRow}>
                <Text className="font-inter text-sm font-medium text-primary-900">Same as Current Address</Text>
                <Switch
                    value={form.sameAsCurrent}
                    onValueChange={(v) => onChange({ sameAsCurrent: v })}
                    trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                    thumbColor={form.sameAsCurrent ? colors.white : colors.neutral[100]}
                />
            </View>
            {!form.sameAsCurrent && (
                <>
                    <FormField label="Address Line 1" value={form.permanentLine1} onChangeText={(v) => onChange({ permanentLine1: v })} />
                    <FormField label="Address Line 2" value={form.permanentLine2} onChangeText={(v) => onChange({ permanentLine2: v })} />
                    <FormField label="City" value={form.permanentCity} onChangeText={(v) => onChange({ permanentCity: v })} autoCapitalize="words" />
                    <FormField label="State" value={form.permanentState} onChangeText={(v) => onChange({ permanentState: v })} autoCapitalize="words" />
                    <FormField label="PIN Code" value={form.permanentPin} onChangeText={(v) => onChange({ permanentPin: v })} keyboardType="number-pad" />
                    <FormField label="Country" value={form.permanentCountry} onChangeText={(v) => onChange({ permanentCountry: v })} autoCapitalize="words" />
                </>
            )}

            <SectionTitle title="Emergency Contact" />
            <FormField label="Contact Name" value={form.emergencyName} onChangeText={(v) => onChange({ emergencyName: v })} autoCapitalize="words" required />
            <FormField label="Relation" value={form.emergencyRelation} onChangeText={(v) => onChange({ emergencyRelation: v })} autoCapitalize="words" required />
            <FormField label="Mobile" value={form.emergencyMobile} onChangeText={(v) => onChange({ emergencyMobile: v })} keyboardType="phone-pad" required />

            {/* Create Login Account — only for new employees */}
            {isCreateMode && (
                <>
                    <SectionTitle title="Create Login Account" />
                    <View style={st.loginAccountCard}>
                        <View style={st.toggleRow}>
                            <Text className="font-inter text-sm font-medium text-primary-900">Enable login for this employee</Text>
                            <Switch
                                value={createUserAccount ?? false}
                                onValueChange={(v) => onCreateUserAccountChange?.(v)}
                                trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                                thumbColor={createUserAccount ? colors.white : colors.neutral[100]}
                            />
                        </View>
                        {createUserAccount && !form.officialEmail && (
                            <View style={st.loginWarning}>
                                <Text className="font-inter text-[11px] font-semibold text-warning-700">
                                    Official Email (above) is required to create a login account.
                                </Text>
                            </View>
                        )}
                        {createUserAccount && (
                            <>
                                <View style={st.passwordFieldWrap}>
                                    <FormField
                                        label="Password"
                                        value={userPassword ?? ''}
                                        onChangeText={(v) => onUserPasswordChange?.(v)}
                                        placeholder="Min 6 characters"
                                        secureTextEntry={!showPwd}
                                    />
                                    <Pressable onPress={() => setShowPwd((v) => !v)} style={st.eyeBtn}>
                                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                            {showPwd ? (
                                                <>
                                                    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke={colors.neutral[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                                    <Path d="M1 1l22 22" stroke={colors.neutral[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                                </>
                                            ) : (
                                                <>
                                                    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={colors.neutral[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                                    <Circle cx={12} cy={12} r={3} stroke={colors.neutral[400]} strokeWidth={2} />
                                                </>
                                            )}
                                        </Svg>
                                    </Pressable>
                                </View>
                                <View style={st.passwordFieldWrap}>
                                    <FormField
                                        label="Confirm Password"
                                        value={confirmPassword ?? ''}
                                        onChangeText={(v) => onConfirmPasswordChange?.(v)}
                                        placeholder="Re-enter password"
                                        secureTextEntry={!showConfirmPwd}
                                    />
                                    <Pressable onPress={() => setShowConfirmPwd((v) => !v)} style={st.eyeBtn}>
                                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                            {showConfirmPwd ? (
                                                <>
                                                    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke={colors.neutral[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                                    <Path d="M1 1l22 22" stroke={colors.neutral[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                                </>
                                            ) : (
                                                <>
                                                    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={colors.neutral[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                                    <Circle cx={12} cy={12} r={3} stroke={colors.neutral[400]} strokeWidth={2} />
                                                </>
                                            )}
                                        </Svg>
                                    </Pressable>
                                </View>
                                {rolesError ? (
                                    <Text className="font-inter text-[10px] font-semibold text-danger-600 mt-2">Failed to load roles. Check permissions or try again.</Text>
                                ) : rolesLoading ? (
                                    <Text className="font-inter text-[10px] text-neutral-500 mt-2">Loading roles...</Text>
                                ) : (
                                    <RoleChipSelectWithCreate
                                        dynamicRoles={dynamicRoles || []}
                                        userRole={userRole || ''}
                                        onUserRoleChange={onUserRoleChange}
                                    />
                                )}
                                {(confirmPassword ?? '').length > 0 && userPassword !== confirmPassword && (
                                    <Text className="font-inter text-[10px] font-semibold text-danger-600">Passwords do not match.</Text>
                                )}
                                {(userPassword ?? '').length > 0 && (userPassword ?? '').length < 6 && (
                                    <Text className="font-inter text-[10px] font-semibold text-danger-600">Password must be at least 6 characters.</Text>
                                )}
                            </>
                        )}
                    </View>
                </>
            )}
        </Animated.View>
    );
}

function ProfessionalTab({
    form,
    onChange,
    departments,
    designations,
    employeeTypes,
    grades,
    costCentres,
    employees,
    locations,
    shifts,
}: {
    form: ProfessionalForm;
    onChange: (updates: Partial<ProfessionalForm>) => void;
    departments: { id: string; name: string }[];
    designations: { id: string; name: string }[];
    employeeTypes: { id: string; name: string }[];
    grades: { id: string; name: string }[];
    costCentres: { id: string; name: string }[];
    employees: { id: string; name: string }[];
    locations?: { id: string; name: string }[];
    shifts?: { id: string; name: string }[];
}) {
    return (
        <Animated.View entering={FadeIn.duration(300)}>
            <SectionTitle title="Employment" />
            <FormField label="Joining Date" value={form.joiningDate} onChangeText={(v) => onChange({ joiningDate: v })} placeholder="YYYY-MM-DD" required />
            <DropdownField label="Employee Type" options={employeeTypes} selected={form.employeeTypeId} onSelect={(v) => onChange({ employeeTypeId: v })} required createRoute={{ route: '/company/hr/employee-types', label: 'Create Employee Type' }} />
            <DropdownField label="Designation" options={designations} selected={form.designationId} onSelect={(v) => onChange({ designationId: v })} required createRoute={{ route: '/company/hr/designations', label: 'Create Designation' }} />
            <DropdownField label="Department" options={departments} selected={form.departmentId} onSelect={(v) => onChange({ departmentId: v })} required createRoute={{ route: '/company/hr/departments', label: 'Create Department' }} />
            <DropdownField label="Grade" options={grades} selected={form.gradeId} onSelect={(v) => onChange({ gradeId: v })} createRoute={{ route: '/company/hr/grades', label: 'Create Grade' }} />

            <SectionTitle title="Reporting" />
            <DropdownField label="Reporting Manager" options={employees} selected={form.reportingManagerId} onSelect={(v) => onChange({ reportingManagerId: v })} placeholder="Search manager..." />
            <DropdownField label="Functional Manager" options={employees} selected={form.functionalManagerId} onSelect={(v) => onChange({ functionalManagerId: v })} placeholder="Search manager..." />

            <SectionTitle title="Work Setup" />
            <DropdownField label="Location" options={locations || []} selected={form.locationId} onSelect={(v) => onChange({ locationId: v })} placeholder="Select location..." createRoute={{ route: '/company/locations', label: 'Create Location' }} />
            <DropdownField label="Shift" options={shifts || []} selected={form.shiftId} onSelect={(v) => onChange({ shiftId: v })} placeholder="Select shift..." createRoute={{ route: '/company/shifts', label: 'Create Shift' }} />
            <ChipSelect label="Work Type" options={['On-site', 'Remote', 'Hybrid']} selected={form.workType} onSelect={(v) => onChange({ workType: v })} />
            <DropdownField label="Cost Centre" options={costCentres} selected={form.costCentreId} onSelect={(v) => onChange({ costCentreId: v })} createRoute={{ route: '/company/hr/cost-centres', label: 'Create Cost Centre' }} />
            <FormField label="Notice Period (Days)" value={form.noticePeriodDays} onChangeText={(v) => onChange({ noticePeriodDays: v })} keyboardType="number-pad" placeholder="e.g. 90" />
            <Text className="font-inter -mt-2 mb-1 text-[10px] leading-4 text-neutral-500">
                Defaults from the grade (Grade master). You can override per employee.
            </Text>
            <FormField label="Probation End Date" value={form.probationEndDate} onChangeText={(v) => onChange({ probationEndDate: v })} placeholder="YYYY-MM-DD" editable={false} />
            <Text className="font-inter mt-1 text-[10px] leading-4 text-neutral-500">
                Auto: designation probation days if set, else grade probation months (same rules as the server).
            </Text>
        </Animated.View>
    );
}

function SalaryTab({
    form,
    onChange,
}: {
    form: SalaryForm;
    onChange: (updates: Partial<SalaryForm>) => void;
}) {
    return (
        <Animated.View entering={FadeIn.duration(300)}>
            <SectionTitle title="Compensation" />
            <View style={st.field}>
                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                    Annual CTC
                </Text>
                <View style={[st.input, { flexDirection: 'row', alignItems: 'center' }]}>
                    <Text className="mr-2 font-inter text-sm font-semibold text-neutral-500">INR</Text>
                    <TextInput
                        style={[st.textInner, { flex: 1 }]}
                        placeholder="e.g. 12,00,000"
                        placeholderTextColor={colors.neutral[400]}
                        value={form.annualCtc}
                        onChangeText={(v) => onChange({ annualCtc: v.replace(/[^0-9]/g, '') })}
                        keyboardType="number-pad"
                    />
                </View>
                {form.annualCtc ? (
                    <Text className="mt-1 font-inter text-[10px] text-neutral-500">
                        INR {formatCurrency(form.annualCtc)} per annum
                    </Text>
                ) : null}
            </View>
            <ChipSelect label="Payment Mode" options={['NEFT', 'IMPS', 'Cheque']} selected={form.paymentMode} onSelect={(v) => onChange({ paymentMode: v })} />

            <SectionTitle title="Salary Structure" />
            <View style={st.readOnlyCard}>
                <Text className="font-inter text-xs text-neutral-500">
                    {form.salaryStructure || 'Salary structure will be configured in Phase 4 (Payroll module). Currently read-only.'}
                </Text>
            </View>
        </Animated.View>
    );
}

function BankTab({
    form,
    onChange,
}: {
    form: BankForm;
    onChange: (updates: Partial<BankForm>) => void;
}) {
    const accountMismatch = form.accountNumber && form.confirmAccountNumber && form.accountNumber !== form.confirmAccountNumber;
    return (
        <Animated.View entering={FadeIn.duration(300)}>
            <SectionTitle title="Bank Account" />
            <FormField label="IFSC Code" value={form.ifscCode} onChangeText={(v) => onChange({ ifscCode: v.toUpperCase() })} placeholder="e.g. SBIN0001234" autoCapitalize="characters" />
            <FormField label="Bank Name" value={form.bankName} onChangeText={(v) => onChange({ bankName: v })} placeholder="Auto-filled from IFSC" editable={!form.ifscCode} />
            <FormField label="Bank Branch" value={form.bankBranch} onChangeText={(v) => onChange({ bankBranch: v })} placeholder="Auto-filled from IFSC" editable={!form.ifscCode} />
            <FormField label="Account Number" value={form.accountNumber} onChangeText={(v) => onChange({ accountNumber: v })} keyboardType="number-pad" placeholder="Enter account number" />
            <FormField
                label="Confirm Account Number"
                value={form.confirmAccountNumber}
                onChangeText={(v) => onChange({ confirmAccountNumber: v })}
                keyboardType="number-pad"
                placeholder="Re-enter account number"
                error={accountMismatch ? 'Account numbers do not match' : undefined}
            />
            <ChipSelect label="Account Type" options={['Savings', 'Current']} selected={form.accountType} onSelect={(v) => onChange({ accountType: v })} />
        </Animated.View>
    );
}

function DocumentsTab({
    form,
    onChange,
    docs,
    employeeId,
}: {
    form: DocumentsForm;
    onChange: (updates: Partial<DocumentsForm>) => void;
    docs: DocItem[];
    employeeId: string;
}) {
    return (
        <Animated.View entering={FadeIn.duration(300)}>
            <SectionTitle title="Statutory IDs" />
            <FormField label="PAN" value={form.pan} onChangeText={(v) => onChange({ pan: v.toUpperCase() })} placeholder="ABCDE1234F" autoCapitalize="characters" />
            <View style={st.field}>
                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Aadhaar</Text>
                <TextInput
                    style={st.input}
                    placeholder="1234 5678 9012"
                    placeholderTextColor={colors.neutral[400]}
                    value={form.aadhaar}
                    onChangeText={(v) => onChange({ aadhaar: v.replace(/\D/g, '').slice(0, 12) })}
                    keyboardType="number-pad"
                />
                {form.aadhaar.length >= 4 ? (
                    <Text className="mt-1 font-inter text-[10px] text-neutral-500">
                        Masked: {maskAadhaar(form.aadhaar)}
                    </Text>
                ) : null}
            </View>
            <FormField label="UAN" value={form.uan} onChangeText={(v) => onChange({ uan: v })} placeholder="Universal Account Number" keyboardType="number-pad" />
            <FormField label="ESI IP Number" value={form.esiIpNumber} onChangeText={(v) => onChange({ esiIpNumber: v })} placeholder="ESI Insurance Point Number" />
            <FormField label="Passport Number" value={form.passport} onChangeText={(v) => onChange({ passport: v.toUpperCase() })} autoCapitalize="characters" />
            <FormField label="Driving Licence" value={form.dl} onChangeText={(v) => onChange({ dl: v.toUpperCase() })} autoCapitalize="characters" />
            <FormField label="Voter ID" value={form.voterId} onChangeText={(v) => onChange({ voterId: v.toUpperCase() })} autoCapitalize="characters" />

            <SectionTitle title="Uploaded Documents" />
            {docs.length === 0 ? (
                <View style={st.readOnlyCard}>
                    <Text className="font-inter text-xs text-neutral-500">
                        No documents uploaded yet.
                    </Text>
                </View>
            ) : (
                docs.map((doc) => (
                    <View key={doc.id} style={st.docCard}>
                        <View style={st.docTypeBadge}>
                            <Text className="font-inter text-[10px] font-bold text-primary-700">
                                {doc.type}
                            </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text className="font-inter text-xs font-semibold text-primary-950" numberOfLines={1}>
                                {doc.fileName}
                            </Text>
                            <Text className="font-inter text-[10px] text-neutral-400">
                                {doc.uploadDate}
                            </Text>
                        </View>
                    </View>
                ))
            )}

            {/* Upload placeholder button */}
            <Pressable style={st.uploadBtn}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={colors.primary[500]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text className="font-inter text-sm font-semibold text-primary-600">
                    Upload Document
                </Text>
            </Pressable>
        </Animated.View>
    );
}

function TimelineTab({
    events,
    isLoading: loading,
}: {
    events: TimelineEvent[];
    isLoading: boolean;
}) {
    if (loading) {
        return (
            <View style={{ paddingTop: 20 }}>
                <Skeleton isLoading layout={[
                    { key: 't1', width: '100%', height: 60, borderRadius: 12, marginBottom: 12 },
                    { key: 't2', width: '100%', height: 60, borderRadius: 12, marginBottom: 12 },
                    { key: 't3', width: '100%', height: 60, borderRadius: 12 },
                ]}>
                    <View />
                </Skeleton>
            </View>
        );
    }

    if (events.length === 0) {
        return (
            <View style={st.readOnlyCard}>
                <Text className="font-inter text-xs text-neutral-500">
                    No timeline events yet.
                </Text>
            </View>
        );
    }

    return (
        <Animated.View entering={FadeIn.duration(300)}>
            <SectionTitle title="Employee Timeline" />
            {events.map((evt, idx) => {
                const iconInfo = timelineIcon(evt.eventType);
                const isLast = idx === events.length - 1;
                return (
                    <View key={evt.id} style={st.timelineRow}>
                        {/* Line + Dot */}
                        <View style={st.timelineLine}>
                            <View style={[st.timelineDot, { backgroundColor: iconInfo.color }]} />
                            {!isLast && <View style={st.timelineConnector} />}
                        </View>
                        {/* Content */}
                        <View style={st.timelineContent}>
                            <Text className="font-inter text-xs font-bold text-primary-950">
                                {evt.title}
                            </Text>
                            {evt.description ? (
                                <Text className="mt-0.5 font-inter text-[11px] text-neutral-600">
                                    {evt.description}
                                </Text>
                            ) : null}
                            <View style={st.timelineMeta}>
                                <Text className="font-inter text-[10px] text-neutral-400">
                                    {evt.timestamp}
                                </Text>
                                {evt.performedBy ? (
                                    <Text className="font-inter text-[10px] text-neutral-400">
                                        by {evt.performedBy}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    </View>
                );
            })}
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function EmployeeDetailScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();
    const params = useLocalSearchParams<{ id?: string; mode?: string }>();

    const isCreateMode = params.mode === 'create' || !params.id;
    const employeeId = params.id ?? '';

    // Tabs
    const [activeTab, setActiveTab] = React.useState<TabKey>('personal');

    // Form state
    const [personal, setPersonal] = React.useState<PersonalForm>(INITIAL_PERSONAL);
    const [professional, setProfessional] = React.useState<ProfessionalForm>(INITIAL_PROFESSIONAL);
    const [salary, setSalary] = React.useState<SalaryForm>(INITIAL_SALARY);
    const [bank, setBank] = React.useState<BankForm>(INITIAL_BANK);
    const [documents, setDocuments] = React.useState<DocumentsForm>(INITIAL_DOCUMENTS);
    const [profilePhotoUrl, setProfilePhotoUrl] = React.useState<string | null>(null);
    const [employeeStatus, setEmployeeStatus] = React.useState<EmployeeStatus>('Active');

    // Login account state (only for new employees)
    const [createUserAccount, setCreateUserAccount] = React.useState(false);
    const [userPassword, setUserPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [userRole, setUserRole] = React.useState('');
    const [employeeName, setEmployeeName] = React.useState('');

    const prevDeptIdRef = React.useRef<string | null>(null);
    const prevGradeIdRef = React.useRef<string | null>(null);
    const lastProbationKeyRef = React.useRef<string | null>(null);

    // Data queries
    const { data: employeeData, isLoading: employeeLoading } = useEmployee(employeeId);
    const listParams = React.useMemo(() => ({ limit: 500, page: 1 }), []);
    const { data: deptResponse } = useDepartments(listParams);
    const { data: desigResponse } = useDesignations(listParams);
    const { data: empTypeResponse } = useEmployeeTypes(listParams);
    const { data: gradeResponse } = useGrades(listParams);
    const { data: costCentreResponse } = useCostCentres(listParams);
    const { data: rbacRolesResponse, isError: rolesError, isLoading: rolesLoading } = useRbacRoles();
    const { data: locationResponse } = useCompanyLocations();
    const { data: shiftResponse } = useCompanyShifts();
    const { data: empListResponse } = useEmployees({ limit: 100 });
    const { data: docsResponse } = useEmployeeDocuments(employeeId);
    const { data: timelineResponse, isLoading: timelineLoading } = useEmployeeTimeline(employeeId);

    // Mutations
    const createMutation = useCreateEmployee();
    const updateMutation = useUpdateEmployee();
    const statusMutation = useUpdateEmployeeStatus();
    const deleteMutation = useDeleteEmployee();
    const confirmModal = useConfirmModal();
    const resetConfirmModal = useConfirmModal();
    const deactivateModal = useConfirmModal();
    const [draftRestored, setDraftRestored] = React.useState(false);

    // Exit form state (for deactivate flow)
    const [showExitForm, setShowExitForm] = React.useState(false);
    const [exitReason, setExitReason] = React.useState('');
    const [lastWorkingDate, setLastWorkingDate] = React.useState(
        new Date().toISOString().split('T')[0],
    );

    // Load draft on mount (create mode only)
    React.useEffect(() => {
        if (!isCreateMode) return;
        try {
            const raw = storage.getString(DRAFT_KEY);
            if (raw) {
                const draft = JSON.parse(raw);
                if (draft.personal) setPersonal((p) => ({ ...p, ...draft.personal }));
                if (draft.professional) setProfessional((p) => ({ ...p, ...draft.professional }));
                if (draft.salary) setSalary((p) => ({ ...p, ...draft.salary }));
                if (draft.bank) setBank((p) => ({ ...p, ...draft.bank }));
                if (draft.documents) setDocuments((p) => ({ ...p, ...draft.documents }));
                if (draft.profilePhotoUrl) setProfilePhotoUrl(draft.profilePhotoUrl);
                if (draft.createUserAccount !== undefined) setCreateUserAccount(draft.createUserAccount);
                if (draft.userPassword) setUserPassword(draft.userPassword);
                if (draft.confirmPassword) setConfirmPassword(draft.confirmPassword);
                if (draft.userRole) setUserRole(draft.userRole);
                if (draft.activeTab) setActiveTab(draft.activeTab);
                setDraftRestored(true);
            }
        } catch {
            // Ignore corrupt draft
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save draft with debounce (create mode only)
    React.useEffect(() => {
        if (!isCreateMode) return;
        const timer = setTimeout(() => {
            try {
                const draft = JSON.stringify({
                    personal,
                    professional,
                    salary,
                    bank,
                    documents,
                    profilePhotoUrl,
                    createUserAccount,
                    userPassword,
                    confirmPassword,
                    userRole,
                    activeTab,
                });
                storage.set(DRAFT_KEY, draft);
            } catch {
                // Ignore write errors
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [isCreateMode, personal, professional, salary, bank, documents, profilePhotoUrl, createUserAccount, userPassword, confirmPassword, userRole, activeTab]);

    // Reset form handler
    const handleReset = () => {
        resetConfirmModal.show({
            title: 'Reset Form',
            message: 'This will clear all entered data. Are you sure?',
            variant: 'warning',
            confirmText: 'Reset',
            onConfirm: () => {
                storage.remove(DRAFT_KEY);
                setPersonal(INITIAL_PERSONAL);
                setProfessional(INITIAL_PROFESSIONAL);
                setSalary(INITIAL_SALARY);
                setBank(INITIAL_BANK);
                setDocuments(INITIAL_DOCUMENTS);
                setProfilePhotoUrl(null);
                setCreateUserAccount(false);
                setUserPassword('');
                setConfirmPassword('');
                setUserRole('');
                setActiveTab('personal');
                setDraftRestored(false);
                resetConfirmModal.hide();
            },
        });
    };

    // Map dropdown data
    const departmentsFull = React.useMemo(() => {
        const raw = (deptResponse as any)?.data ?? deptResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [deptResponse]);

    const deptOptions = React.useMemo(
        () => departmentsFull.map((d: any) => ({ id: d.id ?? '', name: d.name ?? '' })),
        [departmentsFull],
    );

    const designationsFull = React.useMemo(() => {
        const raw = (desigResponse as any)?.data ?? desigResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [desigResponse]);

    const desigOptions = React.useMemo(
        () => designationsFull.map((d: any) => ({ id: d.id ?? '', name: d.name ?? '' })),
        [designationsFull],
    );

    const empTypeOptions = React.useMemo(() => {
        const raw = (empTypeResponse as any)?.data ?? empTypeResponse ?? [];
        return Array.isArray(raw) ? raw.map((d: any) => ({ id: d.id ?? '', name: d.name ?? '' })) : [];
    }, [empTypeResponse]);

    const gradesFull = React.useMemo(() => {
        const raw = (gradeResponse as any)?.data ?? gradeResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [gradeResponse]);

    const gradeOptions = React.useMemo(
        () => gradesFull.map((d: any) => ({ id: d.id ?? '', name: d.name ?? '' })),
        [gradesFull],
    );

    const costCentresFull = React.useMemo(() => {
        const raw = (costCentreResponse as any)?.data ?? costCentreResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [costCentreResponse]);

    const costCentreOptions = React.useMemo(
        () => costCentresFull.map((d: any) => ({ id: d.id ?? '', name: d.name ?? '' })),
        [costCentresFull],
    );

    React.useEffect(() => {
        lastProbationKeyRef.current = null;
    }, [isCreateMode, employeeId]);

    // Apply department + grade from Designation master
    React.useEffect(() => {
        if (!professional.designationId) return;
        const desig = designationsFull.find((d: any) => d.id === professional.designationId);
        if (!desig) return;
        setProfessional((p) => {
            let next = { ...p };
            let changed = false;
            if (desig.departmentId && desig.departmentId !== p.departmentId) {
                next.departmentId = desig.departmentId;
                changed = true;
            }
            if (desig.gradeId && desig.gradeId !== p.gradeId) {
                next.gradeId = desig.gradeId;
                changed = true;
            }
            return changed ? next : p;
        });
    }, [professional.designationId, designationsFull]);

    // Default cost centre from Department master when department changes
    React.useEffect(() => {
        const cur = professional.departmentId || null;
        const prev = prevDeptIdRef.current;
        const dept = departmentsFull.find((d: any) => d.id === cur);
        const should =
            (prev !== null && cur !== prev) ||
            (isCreateMode && !!cur && prev === null);
        if (should && dept) {
            const cc = resolveCostCentreIdForDepartment(dept, costCentresFull);
            if (cc) {
                setProfessional((p) => (p.costCentreId === cc ? p : { ...p, costCentreId: cc }));
            }
        }
        if (cur !== prev) prevDeptIdRef.current = cur;
    }, [professional.departmentId, departmentsFull, costCentresFull, isCreateMode]);

    // Default notice period from Grade master when grade changes
    React.useEffect(() => {
        const cur = professional.gradeId || null;
        const prev = prevGradeIdRef.current;
        const g = gradesFull.find((x: any) => x.id === cur);
        const should =
            (prev !== null && cur !== prev) ||
            (isCreateMode && !!cur && prev === null);
        if (should && g?.noticeDays != null) {
            setProfessional((p) => ({ ...p, noticePeriodDays: String(g.noticeDays) }));
        }
        if (cur !== prev) prevGradeIdRef.current = cur;
    }, [professional.gradeId, gradesFull, isCreateMode]);

    // Probation end: designation days, else grade months (aligned with API)
    React.useEffect(() => {
        if (!professional.joiningDate.trim()) return;
        const key = `${professional.designationId}|${professional.gradeId}|${professional.joiningDate}`;
        if (lastProbationKeyRef.current === null) {
            lastProbationKeyRef.current = key;
            if (!isCreateMode) return;
        } else if (key === lastProbationKeyRef.current) {
            return;
        } else {
            lastProbationKeyRef.current = key;
        }
        const desig = designationsFull.find((d: any) => d.id === professional.designationId);
        const grade = gradesFull.find((g: any) => g.id === professional.gradeId);
        const formatted = computeProbationEndIsoFromMasters(professional.joiningDate, desig, grade);
        if (formatted) {
            setProfessional((p) => (p.probationEndDate === formatted ? p : { ...p, probationEndDate: formatted }));
        }
    }, [professional.designationId, professional.gradeId, professional.joiningDate, designationsFull, gradesFull, isCreateMode]);

    const employeeOptions = React.useMemo(() => {
        const raw = (empListResponse as any)?.data ?? empListResponse ?? [];
        return Array.isArray(raw) ? raw.map((e: any) => {
            const fullName = [e.firstName, e.lastName].filter(Boolean).join(' ') || e.fullName || e.name || '';
            const empId = e.employeeId ?? '';
            // Tenant RBAC role name; fallback to designation when employee has no login / tenant role.
            const roleLabel = e.rbacRoleName ?? e.designation?.name ?? e.designationName ?? '';
            const parts = [fullName, empId && `(${empId})`, roleLabel && `— ${roleLabel}`].filter(Boolean);
            return { id: e.id ?? '', name: parts.join(' ') };
        }) : [];
    }, [empListResponse]);

    const locationOptions = React.useMemo(() => {
        const raw = (locationResponse as any)?.data ?? locationResponse ?? [];
        return Array.isArray(raw) ? raw.map((l: any) => ({ id: l.id ?? '', name: l.name ?? '' })) : [];
    }, [locationResponse]);

    const shiftOptions = React.useMemo(() => {
        const raw = (shiftResponse as any)?.data ?? shiftResponse ?? [];
        return Array.isArray(raw) ? raw.map((s: any) => ({ id: s.id ?? '', name: s.name ?? '' })) : [];
    }, [shiftResponse]);

    const docItems: DocItem[] = React.useMemo(() => {
        const raw = (docsResponse as any)?.data ?? docsResponse ?? [];
        return Array.isArray(raw) ? raw.map((d: any) => ({
            id: d.id ?? '',
            type: d.type ?? d.docType ?? '',
            fileName: d.fileName ?? d.name ?? '',
            uploadDate: d.uploadDate ?? d.createdAt ?? '',
        })) : [];
    }, [docsResponse]);

    const timelineEvents: TimelineEvent[] = React.useMemo(() => {
        const raw = (timelineResponse as any)?.data ?? timelineResponse ?? [];
        return Array.isArray(raw) ? raw.map((e: any) => ({
            id: e.id ?? '',
            eventType: e.eventType ?? e.type ?? '',
            title: e.title ?? '',
            description: e.description ?? '',
            timestamp: e.timestamp ?? e.createdAt ?? '',
            performedBy: e.performedBy ?? e.actor ?? '',
        })) : [];
    }, [timelineResponse]);

    // Populate form from API data (edit mode)
    React.useEffect(() => {
        if (!employeeData || isCreateMode) return;
        const d: any = (employeeData as any)?.data ?? employeeData;
        if (!d) return;

        setEmployeeName([d.firstName, d.lastName].filter(Boolean).join(' '));
        setEmployeeStatus(d.status ?? 'Active');
        setProfilePhotoUrl(d.profilePhotoUrl ?? null);

        setPersonal({
            firstName: d.firstName ?? '', middleName: d.middleName ?? '',
            lastName: d.lastName ?? '', dob: d.dob ?? d.dateOfBirth ?? '',
            gender: d.gender ?? '', maritalStatus: d.maritalStatus ?? '',
            bloodGroup: d.bloodGroup ?? '', fatherName: d.fatherName ?? '',
            motherName: d.motherName ?? '', nationality: d.nationality ?? 'Indian',
            religion: d.religion ?? '', category: d.category ?? '',
            personalMobile: d.personalMobile ?? d.mobile ?? '',
            alternativeMobile: d.alternativeMobile ?? '',
            personalEmail: d.personalEmail ?? d.email ?? '',
            officialEmail: d.officialEmail ?? '',
            currentLine1: d.currentAddress?.line1 ?? d.currentLine1 ?? '',
            currentLine2: d.currentAddress?.line2 ?? d.currentLine2 ?? '',
            currentCity: d.currentAddress?.city ?? d.currentCity ?? '',
            currentState: d.currentAddress?.state ?? d.currentState ?? '',
            currentPin: d.currentAddress?.pin ?? d.currentPin ?? '',
            currentCountry: d.currentAddress?.country ?? d.currentCountry ?? 'India',
            sameAsCurrent: d.sameAsCurrent ?? d.permanentAddress?.sameAsCurrent ?? true,
            permanentLine1: d.permanentAddress?.line1 ?? d.permanentLine1 ?? '',
            permanentLine2: d.permanentAddress?.line2 ?? d.permanentLine2 ?? '',
            permanentCity: d.permanentAddress?.city ?? d.permanentCity ?? '',
            permanentState: d.permanentAddress?.state ?? d.permanentState ?? '',
            permanentPin: d.permanentAddress?.pin ?? d.permanentPin ?? '',
            permanentCountry: d.permanentAddress?.country ?? d.permanentCountry ?? 'India',
            emergencyName: d.emergencyContact?.name ?? d.emergencyName ?? '',
            emergencyRelation: d.emergencyContact?.relation ?? d.emergencyRelation ?? '',
            emergencyMobile: d.emergencyContact?.mobile ?? d.emergencyMobile ?? '',
        });

        setProfessional({
            joiningDate: d.joiningDate ?? '', employeeTypeId: d.employeeTypeId ?? d.employeeType?.id ?? '',
            departmentId: d.departmentId ?? d.department?.id ?? '',
            designationId: d.designationId ?? d.designation?.id ?? '',
            gradeId: d.gradeId ?? d.grade?.id ?? '',
            reportingManagerId: d.reportingManagerId ?? d.reportingManager?.id ?? '',
            functionalManagerId: d.functionalManagerId ?? d.functionalManager?.id ?? '',
            workType: d.workType ?? '', shiftId: d.shiftId ?? '',
            locationId: d.locationId ?? d.location?.id ?? '',
            costCentreId: d.costCentreId ?? d.costCentre?.id ?? '',
            noticePeriodDays: d.noticePeriodDays?.toString() ?? '',
            probationEndDate: d.probationEndDate ? String(d.probationEndDate).slice(0, 10) : '',
        });
        prevDeptIdRef.current = d.departmentId ?? d.department?.id ?? null;
        prevGradeIdRef.current = d.gradeId ?? d.grade?.id ?? null;

        setSalary({
            annualCtc: d.annualCtc?.toString() ?? d.salary?.annualCtc?.toString() ?? '',
            paymentMode: d.paymentMode ?? d.salary?.paymentMode ?? '',
            salaryStructure: d.salaryStructure ? JSON.stringify(d.salaryStructure, null, 2) : '',
        });

        setBank({
            ifscCode: d.bankDetails?.ifscCode ?? d.ifscCode ?? '',
            bankName: d.bankDetails?.bankName ?? d.bankName ?? '',
            bankBranch: d.bankDetails?.bankBranch ?? d.bankBranch ?? '',
            accountNumber: d.bankDetails?.accountNumber ?? d.accountNumber ?? '',
            confirmAccountNumber: d.bankDetails?.accountNumber ?? d.accountNumber ?? '',
            accountType: d.bankDetails?.accountType ?? d.accountType ?? '',
        });

        setDocuments({
            pan: d.pan ?? d.statutory?.pan ?? '',
            aadhaar: d.aadhaar ?? d.statutory?.aadhaar ?? '',
            uan: d.uan ?? d.statutory?.uan ?? '',
            esiIpNumber: d.esiIpNumber ?? d.statutory?.esiIpNumber ?? '',
            passport: d.passport ?? d.statutory?.passport ?? '',
            dl: d.dl ?? d.statutory?.dl ?? '',
            voterId: d.voterId ?? d.statutory?.voterId ?? '',
        });
    }, [employeeData, isCreateMode]);

    // Image picker handler
    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showErrorMessage('Permission to access photos is required.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.base64) {
                const mimeType = asset.mimeType ?? 'image/jpeg';
                setProfilePhotoUrl(`data:${mimeType};base64,${asset.base64}`);
            }
        }
    };

    // Collect all form data
    const collectFormData = (): Record<string, unknown> => ({
        // Profile photo
        profilePhotoUrl: profilePhotoUrl ?? undefined,
        // Personal
        firstName: personal.firstName, middleName: personal.middleName,
        lastName: personal.lastName, dob: personal.dob, gender: personal.gender,
        maritalStatus: personal.maritalStatus, bloodGroup: personal.bloodGroup,
        fatherName: personal.fatherName, motherName: personal.motherName,
        nationality: personal.nationality, religion: personal.religion,
        category: personal.category, personalMobile: personal.personalMobile,
        alternativeMobile: personal.alternativeMobile,
        personalEmail: personal.personalEmail,
        officialEmail: personal.officialEmail || undefined,
        currentAddress: {
            line1: personal.currentLine1, line2: personal.currentLine2,
            city: personal.currentCity, state: personal.currentState,
            pin: personal.currentPin, country: personal.currentCountry,
        },
        sameAsCurrent: personal.sameAsCurrent,
        permanentAddress: personal.sameAsCurrent ? undefined : {
            line1: personal.permanentLine1, line2: personal.permanentLine2,
            city: personal.permanentCity, state: personal.permanentState,
            pin: personal.permanentPin, country: personal.permanentCountry,
        },
        emergencyContact: {
            name: personal.emergencyName, relation: personal.emergencyRelation,
            mobile: personal.emergencyMobile,
        },
        // Professional
        joiningDate: professional.joiningDate,
        employeeTypeId: professional.employeeTypeId || undefined,
        departmentId: professional.departmentId || undefined,
        designationId: professional.designationId || undefined,
        gradeId: professional.gradeId || undefined,
        reportingManagerId: professional.reportingManagerId || undefined,
        functionalManagerId: professional.functionalManagerId || undefined,
        workType: professional.workType, shiftId: professional.shiftId || undefined,
        locationId: professional.locationId || undefined,
        costCentreId: professional.costCentreId || undefined,
        noticePeriodDays: professional.noticePeriodDays ? parseInt(professional.noticePeriodDays, 10) : undefined,
        probationEndDate: professional.probationEndDate?.trim() || undefined,
        // Salary
        annualCtc: salary.annualCtc ? parseFloat(salary.annualCtc) : undefined,
        paymentMode: salary.paymentMode || undefined,
        // Bank
        bankDetails: {
            ifscCode: bank.ifscCode, bankName: bank.bankName,
            bankBranch: bank.bankBranch, accountNumber: bank.accountNumber,
            accountType: bank.accountType,
        },
        // Documents / Statutory
        statutory: {
            pan: documents.pan, aadhaar: documents.aadhaar,
            uan: documents.uan, esiIpNumber: documents.esiIpNumber,
            passport: documents.passport, dl: documents.dl,
            voterId: documents.voterId,
        },
    });

    const handleSave = () => {
        const data = collectFormData();

        if (!personal.firstName.trim() || !personal.lastName.trim()) {
            showErrorMessage('First Name and Last Name are required.');
            setActiveTab('personal');
            return;
        }

        // Validate user account creation fields
        if (isCreateMode && createUserAccount) {
            if (!personal.officialEmail.trim()) {
                showErrorMessage('Official Email is required when creating a login account.');
                setActiveTab('personal');
                return;
            }
            if (!userPassword || userPassword.length < 6) {
                showErrorMessage('Password must be at least 6 characters.');
                setActiveTab('personal');
                return;
            }
            if (userPassword !== confirmPassword) {
                showErrorMessage('Passwords do not match.');
                setActiveTab('personal');
                return;
            }
            (data as any).createUserAccount = true;
            (data as any).userPassword = userPassword;
            if (userRole) (data as any).userRole = userRole;
        }

        if (isCreateMode) {
            createMutation.mutate(data, {
                onSuccess: () => {
                    storage.remove(DRAFT_KEY);
                    showSuccess('Employee Created', 'Employee has been added successfully.');
                    router.back();
                },
                onError: (err: any) => {
                    showErrorMessage(err?.message ?? 'Failed to create employee.');
                },
            });
        } else {
            updateMutation.mutate(
                { id: employeeId, data },
                {
                    onSuccess: () => {
                        showSuccess('Employee Updated', 'Changes saved successfully.');
                    },
                    onError: (err: any) => {
                        showErrorMessage(err?.message ?? 'Failed to update employee.');
                    },
                },
            );
        }
    };

    const handleStatusAction = () => {
        if (isCreateMode) return;

        let action = '';
        let newStatus = '';
        let variant: 'primary' | 'warning' | 'danger' = 'primary';

        switch (employeeStatus) {
            case 'Probation':
                action = 'Confirm Employee';
                newStatus = 'Confirmed';
                variant = 'primary';
                break;
            case 'Active':
            case 'Confirmed':
                action = 'Initiate Exit';
                newStatus = 'On Notice';
                variant = 'warning';
                break;
            case 'On Notice':
                action = 'Complete Exit';
                newStatus = 'Exited';
                variant = 'danger';
                break;
            default:
                return;
        }

        confirmModal.show({
            title: action,
            message: newStatus === 'On Notice'
                ? `Are you sure you want to put ${employeeName || 'this employee'} on notice? You will be able to set the last working date.`
                : `Are you sure you want to ${action.toLowerCase()} for ${employeeName || 'this employee'}?`,
            confirmText: action,
            variant,
            onConfirm: () => {
                const statusData: Record<string, unknown> = { status: newStatus };
                // Include lastWorkingDate when transitioning to On Notice or Exited
                if (newStatus === 'On Notice' || newStatus === 'Exited') {
                    statusData.lastWorkingDate = lastWorkingDate || new Date().toISOString().split('T')[0];
                }
                statusMutation.mutate(
                    { id: employeeId, data: statusData },
                    {
                        onSuccess: () => {
                            setEmployeeStatus(newStatus as EmployeeStatus);
                            showSuccess('Status Updated', `Employee status changed to ${newStatus}.`);
                        },
                        onError: (err: any) => {
                            showErrorMessage(err?.message ?? 'Failed to update status.');
                        },
                    },
                );
            },
        });
    };

    const handleDeactivate = () => {
        if (isCreateMode || employeeStatus === 'Exited') return;
        setShowExitForm(true);
    };

    const handleConfirmDeactivation = () => {
        if (!exitReason.trim()) {
            showErrorMessage('Please provide an exit reason.');
            return;
        }
        statusMutation.mutate(
            {
                id: employeeId,
                data: {
                    status: 'EXITED',
                    exitReason: exitReason.trim(),
                    lastWorkingDate: lastWorkingDate || new Date().toISOString().split('T')[0],
                },
            },
            {
                onSuccess: () => {
                    setEmployeeStatus('Exited');
                    setShowExitForm(false);
                    setExitReason('');
                    showSuccess('Employee Deactivated', `${employeeName || 'Employee'} has been deactivated.`);
                },
                onError: (err: any) => {
                    showErrorMessage(err?.message ?? 'Failed to deactivate employee.');
                },
            },
        );
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;
    const badge = statusBadge(employeeStatus);
    const displayName = isCreateMode
        ? 'New Employee'
        : employeeName || [personal.firstName, personal.lastName].filter(Boolean).join(' ') || 'Employee';

    // Loading state (edit mode only)
    if (!isCreateMode && employeeLoading) {
        return (
            <View style={st.container}>
                <Skeleton isLoading layout={[
                    { key: 'header', width: '100%', height: 160 },
                    { key: 's1', width: '92%', height: 48, marginTop: 16, borderRadius: 12, alignSelf: 'center' },
                    { key: 's2', width: '92%', height: 200, marginTop: 12, borderRadius: 12, alignSelf: 'center' },
                    { key: 's3', width: '92%', height: 200, marginTop: 12, borderRadius: 12, alignSelf: 'center' },
                ]}>
                    <View />
                </Skeleton>
            </View>
        );
    }

    return (
        <View style={st.container}>
            <AppTopHeader
                title={displayName}
                subtitle={!isCreateMode ? employeeStatus : undefined}
                onMenuPress={toggle}
                rightSlot={
                    isCreateMode ? (
                        <Pressable
                            onPress={handleReset}
                            style={({ pressed }) => [st.backBtn, pressed && { opacity: 0.7 }]}
                        >
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path d="M1 4v6h6M23 20v-6h-6" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                <Path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </Svg>
                        </Pressable>
                    ) : undefined
                }
            />

            {/* Draft Restored Banner */}
            {draftRestored && (
                <View style={st.draftBanner}>
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                        <Path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill={colors.info[600]} />
                    </Svg>
                    <Text className="font-inter text-xs text-info-700" style={{ flex: 1 }}>
                        Draft restored from previous session
                    </Text>
                    <Pressable onPress={() => setDraftRestored(false)} hitSlop={8}>
                        <Text className="font-inter text-xs font-bold text-info-700">Dismiss</Text>
                    </Pressable>
                </View>
            )}

            {/* Profile Photo */}
            <Animated.View entering={FadeIn.duration(400).delay(50)}>
                <View style={st.photoSection}>
                    <Pressable onPress={handlePickPhoto} style={st.avatarContainer}>
                        {profilePhotoUrl ? (
                            <Image source={{ uri: profilePhotoUrl }} style={st.avatarImage} />
                        ) : (
                            <View style={st.avatarPlaceholder}>
                                <Text className="font-inter text-lg font-bold text-accent-700">
                                    {getInitials(personal.firstName, personal.lastName)}
                                </Text>
                            </View>
                        )}
                        <View style={st.cameraIconBadge}>
                            <Svg width={12} height={12} viewBox="0 0 24 24">
                                <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                <Circle cx="12" cy="13" r="4" stroke={colors.white} strokeWidth="2" fill="none" />
                            </Svg>
                        </View>
                    </Pressable>
                    <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                        Tap to {profilePhotoUrl ? 'change' : 'add'} photo
                    </Text>
                </View>
            </Animated.View>

            {/* Tab Bar */}
            <Animated.View entering={FadeIn.duration(400).delay(100)}>
                <TabBar active={activeTab} onSelect={setActiveTab} isCreateMode={isCreateMode} />
            </Animated.View>

            {/* Tab Content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[st.scrollContent, { paddingBottom: insets.bottom + 120 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {activeTab === 'personal' && (
                    <PersonalTab
                        form={personal}
                        onChange={(u) => setPersonal((p) => ({ ...p, ...u }))}
                        isCreateMode={isCreateMode}
                        createUserAccount={createUserAccount}
                        onCreateUserAccountChange={setCreateUserAccount}
                        userPassword={userPassword}
                        onUserPasswordChange={setUserPassword}
                        confirmPassword={confirmPassword}
                        onConfirmPasswordChange={setConfirmPassword}
                        userRole={userRole}
                        onUserRoleChange={setUserRole}
                        dynamicRoles={rbacRolesResponse?.data || []}
                        rolesError={rolesError}
                        rolesLoading={rolesLoading}
                    />
                )}
                {activeTab === 'professional' && (
                    <ProfessionalTab
                        form={professional}
                        onChange={(u) => setProfessional((p) => ({ ...p, ...u }))}
                        departments={deptOptions}
                        designations={desigOptions}
                        employeeTypes={empTypeOptions}
                        grades={gradeOptions}
                        costCentres={costCentreOptions}
                        employees={employeeOptions}
                        locations={locationOptions}
                        shifts={shiftOptions}
                    />
                )}
                {activeTab === 'salary' && (
                    <SalaryTab form={salary} onChange={(u) => setSalary((p) => ({ ...p, ...u }))} />
                )}
                {activeTab === 'bank' && (
                    <BankTab form={bank} onChange={(u) => setBank((p) => ({ ...p, ...u }))} />
                )}
                {activeTab === 'documents' && (
                    <DocumentsTab
                        form={documents}
                        onChange={(u) => setDocuments((p) => ({ ...p, ...u }))}
                        docs={docItems}
                        employeeId={employeeId}
                    />
                )}
                {activeTab === 'timeline' && (
                    <TimelineTab events={timelineEvents} isLoading={timelineLoading} />
                )}
            </ScrollView>

            {/* Exit Form Panel */}
            {showExitForm && (
                <Animated.View entering={FadeInUp.duration(300)} style={st.exitFormPanel}>
                    <View style={st.exitFormHeader}>
                        <Text className="font-inter text-sm font-bold text-danger-700">
                            Deactivate Employee
                        </Text>
                        <Pressable onPress={() => setShowExitForm(false)} hitSlop={8}>
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6l12 12" stroke={colors.neutral[500]} strokeWidth="2" strokeLinecap="round" />
                            </Svg>
                        </Pressable>
                    </View>
                    <FormField
                        label="Exit Reason"
                        value={exitReason}
                        onChangeText={setExitReason}
                        placeholder="e.g. Resigned, Terminated, End of Contract..."
                        required
                        multiline
                    />
                    <FormField
                        label="Last Working Date"
                        value={lastWorkingDate}
                        onChangeText={setLastWorkingDate}
                        placeholder="YYYY-MM-DD"
                        required
                    />
                    <Pressable
                        onPress={handleConfirmDeactivation}
                        style={({ pressed }) => [
                            st.deactivateConfirmBtn,
                            pressed && { opacity: 0.85 },
                            statusMutation.isPending && { opacity: 0.6 },
                        ]}
                        disabled={statusMutation.isPending}
                    >
                        {statusMutation.isPending ? (
                            <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                            <Text className="font-inter text-sm font-bold text-white">
                                Confirm Deactivation
                            </Text>
                        )}
                    </Pressable>
                </Animated.View>
            )}

            {/* Bottom Action Bar */}
            {(() => {
                const createTabOrder: TabKey[] = ['personal', 'professional', 'salary', 'bank', 'documents'];
                const currentCreateTabIndex = createTabOrder.indexOf(activeTab);
                const isLastCreateTab = isCreateMode && currentCreateTabIndex === createTabOrder.length - 1;
                const isNotLastCreateTab = isCreateMode && currentCreateTabIndex >= 0 && currentCreateTabIndex < createTabOrder.length - 1;

                return (
                    <View style={[st.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                        {/* Status action (edit mode only) */}
                        {!isCreateMode && employeeStatus !== 'Exited' && (
                            <Pressable
                                onPress={handleStatusAction}
                                style={({ pressed }) => [
                                    st.statusActionBtn,
                                    pressed && { opacity: 0.85 },
                                    statusMutation.isPending && { opacity: 0.6 },
                                ]}
                                disabled={statusMutation.isPending}
                            >
                                <Text className="font-inter text-sm font-semibold text-primary-600">
                                    {employeeStatus === 'Probation'
                                        ? 'Confirm Employee'
                                        : employeeStatus === 'On Notice'
                                          ? 'Complete Exit'
                                          : 'Initiate Exit'}
                                </Text>
                            </Pressable>
                        )}

                        {/* Deactivate button (edit mode, not already exited) */}
                        {!isCreateMode && employeeStatus !== 'Exited' && employeeStatus !== 'On Notice' && (
                            <Pressable
                                onPress={handleDeactivate}
                                style={({ pressed }) => [
                                    st.deactivateBtn,
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                    <Path
                                        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                                        stroke={colors.danger[600]}
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            </Pressable>
                        )}

                        {/* Back button (create mode, not first tab) */}
                        {isCreateMode && currentCreateTabIndex > 0 && (
                            <Pressable
                                onPress={() => setActiveTab(createTabOrder[currentCreateTabIndex - 1])}
                                style={({ pressed }) => [
                                    st.statusActionBtn,
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                <Text className="font-inter text-sm font-semibold text-primary-600">
                                    Back
                                </Text>
                            </Pressable>
                        )}

                        {/* Next / Create / Save button */}
                        {isNotLastCreateTab ? (
                            <Pressable
                                onPress={() => setActiveTab(createTabOrder[currentCreateTabIndex + 1])}
                                style={({ pressed }) => [
                                    st.saveBtn,
                                    pressed && { opacity: 0.85 },
                                    { flex: 1 },
                                ]}
                            >
                                <Text className="font-inter text-sm font-bold text-white">
                                    Next
                                </Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                onPress={handleSave}
                                style={({ pressed }) => [
                                    st.saveBtn,
                                    pressed && { opacity: 0.85 },
                                    isSaving && { opacity: 0.6 },
                                    !isCreateMode && employeeStatus !== 'Exited' ? { flex: 2 } : { flex: 1 },
                                ]}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color={colors.white} size="small" />
                                ) : (
                                    <Text className="font-inter text-sm font-bold text-white">
                                        {isCreateMode ? 'Create Employee' : 'Save Changes'}
                                    </Text>
                                )}
                            </Pressable>
                        )}
                    </View>
                );
            })()}

            <ConfirmModal {...confirmModal.modalProps} />
            <ConfirmModal {...resetConfirmModal.modalProps} />
            <ConfirmModal {...deactivateModal.modalProps} />
        </View>
    );
}

// ============ STYLES ============

const st = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    draftBanner: {
        backgroundColor: colors.info[50],
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.info[200],
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Profile photo section
    photoSection: {
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    avatarContainer: {
        width: 72,
        height: 72,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    avatarImage: {
        width: 72,
        height: 72,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: colors.accent[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    // Tab bar
    tabBar: {
        flexGrow: 0,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    tabBarContent: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.neutral[100],
    },
    tabActive: {
        backgroundColor: colors.primary[600],
    },
    // Scroll content
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    // Form field
    field: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.primary[950],
    },
    inputReadOnly: {
        backgroundColor: colors.neutral[100],
        borderColor: colors.neutral[200],
        color: colors.neutral[600],
    },
    inputError: {
        borderColor: colors.danger[400],
        borderWidth: 1.5,
    },
    textInner: {
        fontSize: 14,
        color: colors.primary[950],
        padding: 0,
    },
    // Chip selector
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    chipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    // Dropdown
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 200,
        backgroundColor: colors.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary[200],
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 20,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    // Toggle row
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        marginBottom: 12,
    },
    loginAccountCard: {
        backgroundColor: colors.neutral[50],
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        marginTop: 4,
        gap: 8,
    },
    loginWarning: {
        backgroundColor: colors.warning[50],
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: colors.warning[200],
    },
    passwordFieldWrap: {
        position: 'relative',
    },
    eyeBtn: {
        position: 'absolute',
        right: 12,
        top: 30,
        padding: 4,
    },
    // Read-only card
    readOnlyCard: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        marginBottom: 16,
    },
    // Documents
    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    docTypeBadge: {
        backgroundColor: colors.primary[50],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.primary[300],
        borderStyle: 'dashed',
        backgroundColor: colors.primary[50],
        marginTop: 8,
        marginBottom: 16,
    },
    // Timeline
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    timelineLine: {
        alignItems: 'center',
        width: 24,
        paddingTop: 4,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    timelineConnector: {
        width: 2,
        flex: 1,
        backgroundColor: colors.neutral[200],
        marginVertical: 2,
    },
    timelineContent: {
        flex: 1,
        paddingLeft: 8,
        paddingBottom: 20,
    },
    timelineMeta: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    // Bottom bar
    bottomBar: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 12,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        backgroundColor: colors.white,
    },
    statusActionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    saveBtn: {
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary[600],
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    deactivateBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.danger[50],
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    exitFormPanel: {
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.danger[200],
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    exitFormHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    deactivateConfirmBtn: {
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.danger[600],
        marginBottom: 8,
    },
});

/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { useUpdateCompanySection } from '@/features/super-admin/api/use-tenant-queries';

import { FormInput, ChipSelector } from '@/features/super-admin/tenant-onboarding/atoms';
import {
    BUSINESS_TYPES,
    INDUSTRIES,
    INDIAN_STATES,
    COUNTRIES,
    FY_OPTIONS,
    PAYROLL_FREQ,
    CUTOFF_DAYS,
    DISBURSEMENT_DAYS,
    WEEK_STARTS,
    TIMEZONES,
    DAYS_OF_WEEK,
    CURRENCIES,
    LANGUAGES,
    DATE_FORMATS,
} from '@/features/super-admin/tenant-onboarding/constants';

// ============ TYPES ============

interface EditModalProps {
    visible: boolean;
    onClose: () => void;
    companyId: string;
    section: string;
    currentData: Record<string, any>;
    onSaved: () => void;
}

type SectionKey = 'identity' | 'statutory' | 'address' | 'fiscal' | 'preferences' | 'endpoint' | 'strategy' | 'controls';

// ============ SECTION TITLES ============

const SECTION_TITLES: Record<SectionKey, string> = {
    identity: 'Company Identity',
    statutory: 'Statutory & Tax',
    address: 'Registered Address',
    fiscal: 'Fiscal & Calendar',
    preferences: 'Preferences',
    endpoint: 'Backend Endpoint',
    strategy: 'Configuration Strategy',
    controls: 'System Controls',
};

// ============ TOGGLE ROW ============

function ModalToggleRow({
    label,
    value,
    onValueChange,
}: {
    label: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
}) {
    return (
        <View style={ms.toggleRow}>
            <Text className="font-inter text-sm font-medium text-primary-900">{label}</Text>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                thumbColor={value ? colors.white : colors.neutral[100]}
            />
        </View>
    );
}

// ============ RADIO OPTION ============

function ModalRadioOption({
    label,
    subtitle,
    selected,
    onPress,
}: {
    label: string;
    subtitle?: string;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable onPress={onPress} style={[ms.radioOption, selected && ms.radioOptionSelected]}>
            <View style={[ms.radioDot, selected && ms.radioDotSelected]}>
                {selected && <View style={ms.radioDotInner} />}
            </View>
            <View style={{ flex: 1 }}>
                <Text className={`font-inter text-sm font-semibold ${selected ? 'text-primary-800' : 'text-neutral-700'}`}>
                    {label}
                </Text>
                {subtitle ? (
                    <Text className="font-inter text-xs text-neutral-500">{subtitle}</Text>
                ) : null}
            </View>
        </Pressable>
    );
}

// ============ SECTION RENDERERS ============

function IdentityFields({
    data,
    onChange,
    errors,
}: {
    data: Record<string, any>;
    onChange: (key: string, value: any) => void;
    errors: Record<string, string>;
}) {
    return (
        <>
            <FormInput label="Display Name" placeholder="e.g. Acme Corp" value={data.displayName ?? ''} onChangeText={(v) => onChange('displayName', v)} required error={errors.displayName} />
            <FormInput label="Legal Name" placeholder="e.g. Acme Corp Pvt. Ltd." value={data.legalName ?? ''} onChangeText={(v) => onChange('legalName', v)} required error={errors.legalName} />
            <ChipSelector label="Business Type" options={BUSINESS_TYPES} selected={data.businessType ?? ''} onSelect={(v) => onChange('businessType', v)} error={errors.businessType} />
            <ChipSelector label="Industry" options={INDUSTRIES} selected={data.industry ?? ''} onSelect={(v) => onChange('industry', v)} error={errors.industry} />
            <FormInput label="Company Code" placeholder="e.g. ACME" value={data.companyCode ?? ''} onChangeText={(v) => onChange('companyCode', v)} error={errors.companyCode} />
            <FormInput label="Short Name" placeholder="e.g. ACM" value={data.shortName ?? ''} onChangeText={(v) => onChange('shortName', v)} error={errors.shortName} />
            <FormInput label="CIN" placeholder="e.g. U12345MH2020PTC123456" value={data.cin ?? ''} onChangeText={(v) => onChange('cin', v)} error={errors.cin} />
            <FormInput label="Website" placeholder="e.g. https://acme.com" value={data.website ?? ''} onChangeText={(v) => onChange('website', v)} keyboardType="url" autoCapitalize="none" error={errors.website} />
            <FormInput label="Email Domain" placeholder="e.g. acme.com" value={data.emailDomain ?? ''} onChangeText={(v) => onChange('emailDomain', v)} autoCapitalize="none" error={errors.emailDomain} />
        </>
    );
}

function StatutoryFields({
    data,
    onChange,
    errors,
}: {
    data: Record<string, any>;
    onChange: (key: string, value: any) => void;
    errors: Record<string, string>;
}) {
    return (
        <>
            <FormInput label="PAN" placeholder="e.g. AAACR1234A" value={data.pan ?? ''} onChangeText={(v) => onChange('pan', v)} autoCapitalize="characters" error={errors.pan} />
            <FormInput label="TAN" placeholder="e.g. MUMA12345A" value={data.tan ?? ''} onChangeText={(v) => onChange('tan', v)} autoCapitalize="characters" error={errors.tan} />
            <FormInput label="GSTIN" placeholder="e.g. 27AAACR1234A1Z5" value={data.gstin ?? ''} onChangeText={(v) => onChange('gstin', v)} autoCapitalize="characters" error={errors.gstin} />
            <FormInput label="PF Registration No." placeholder="e.g. MH/MUM/12345" value={data.pfRegNo ?? ''} onChangeText={(v) => onChange('pfRegNo', v)} error={errors.pfRegNo} />
            <FormInput label="ESI Code" placeholder="e.g. 31000123456789" value={data.esiCode ?? ''} onChangeText={(v) => onChange('esiCode', v)} error={errors.esiCode} />
            <FormInput label="PT Registration" placeholder="e.g. PTRC/27/123456" value={data.ptReg ?? ''} onChangeText={(v) => onChange('ptReg', v)} error={errors.ptReg} />
            <FormInput label="LWFR No." placeholder="e.g. LW/MH/12345" value={data.lwfrNo ?? ''} onChangeText={(v) => onChange('lwfrNo', v)} error={errors.lwfrNo} />
            <ChipSelector label="ROC State" options={INDIAN_STATES} selected={data.rocState ?? ''} onSelect={(v) => onChange('rocState', v)} error={errors.rocState} />
        </>
    );
}

function AddressFields({
    data,
    onChange,
    errors,
}: {
    data: Record<string, any>;
    onChange: (key: string, value: any) => void;
    errors: Record<string, string>;
}) {
    return (
        <>
            <FormInput label="Address Line 1" placeholder="Street address" value={data.regLine1 ?? ''} onChangeText={(v) => onChange('regLine1', v)} required error={errors.regLine1} />
            <FormInput label="Address Line 2" placeholder="Area / Landmark" value={data.regLine2 ?? ''} onChangeText={(v) => onChange('regLine2', v)} error={errors.regLine2} />
            <FormInput label="City" placeholder="e.g. Mumbai" value={data.regCity ?? ''} onChangeText={(v) => onChange('regCity', v)} required error={errors.regCity} />
            <FormInput label="District" placeholder="e.g. Mumbai Suburban" value={data.regDistrict ?? ''} onChangeText={(v) => onChange('regDistrict', v)} error={errors.regDistrict} />
            <FormInput label="PIN Code" placeholder="e.g. 400001" value={data.regPin ?? ''} onChangeText={(v) => onChange('regPin', v)} keyboardType="number-pad" required error={errors.regPin} />
            <ChipSelector label="State" options={INDIAN_STATES} selected={data.regState ?? ''} onSelect={(v) => onChange('regState', v)} error={errors.regState} />
            <ChipSelector label="Country" options={COUNTRIES} selected={data.regCountry ?? ''} onSelect={(v) => onChange('regCountry', v)} error={errors.regCountry} />
            <ModalToggleRow
                label="Corporate address same as registered"
                value={data.sameAsRegistered ?? true}
                onValueChange={(v) => onChange('sameAsRegistered', v)}
            />
        </>
    );
}

function FiscalFields({
    data,
    onChange,
    errors,
}: {
    data: Record<string, any>;
    onChange: (key: string, value: any) => void;
    errors: Record<string, string>;
}) {
    return (
        <>
            <ChipSelector
                label="Financial Year"
                options={FY_OPTIONS.map((o) => o.label)}
                selected={FY_OPTIONS.find((o) => o.key === data.fyType)?.label ?? data.fyType ?? ''}
                onSelect={(v) => {
                    const match = FY_OPTIONS.find((o) => o.label === v);
                    onChange('fyType', match?.key ?? v);
                }}
                error={errors.fyType}
            />
            <ChipSelector label="Payroll Frequency" options={PAYROLL_FREQ} selected={data.payrollFreq ?? ''} onSelect={(v) => onChange('payrollFreq', v)} error={errors.payrollFreq} />
            <ChipSelector label="Cutoff Day" options={CUTOFF_DAYS} selected={data.cutoffDay ?? ''} onSelect={(v) => onChange('cutoffDay', v)} error={errors.cutoffDay} />
            <ChipSelector label="Disbursement Day" options={DISBURSEMENT_DAYS} selected={data.disbursementDay ?? ''} onSelect={(v) => onChange('disbursementDay', v)} error={errors.disbursementDay} />
            <ChipSelector label="Week Starts On" options={WEEK_STARTS} selected={data.weekStart ?? ''} onSelect={(v) => onChange('weekStart', v)} error={errors.weekStart} />
            <ChipSelector label="Timezone" options={TIMEZONES} selected={data.timezone ?? ''} onSelect={(v) => onChange('timezone', v)} error={errors.timezone} />

            <View style={ms.fieldGroup}>
                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                    Working Days
                </Text>
                <View style={ms.chipRow}>
                    {DAYS_OF_WEEK.map((day) => {
                        const selected = (data.workingDays ?? []).includes(day);
                        return (
                            <Pressable
                                key={day}
                                onPress={() => {
                                    const current: string[] = data.workingDays ?? [];
                                    onChange(
                                        'workingDays',
                                        selected ? current.filter((d) => d !== day) : [...current, day],
                                    );
                                }}
                                style={[ms.dayChip, selected && ms.dayChipSelected]}
                            >
                                <Text className={`font-inter text-xs font-semibold ${selected ? 'text-primary-700' : 'text-neutral-500'}`}>
                                    {day.substring(0, 3)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </>
    );
}

function PreferencesFields({
    data,
    onChange,
    errors,
}: {
    data: Record<string, any>;
    onChange: (key: string, value: any) => void;
    errors: Record<string, string>;
}) {
    return (
        <>
            <ChipSelector label="Currency" options={CURRENCIES} selected={data.currency ?? ''} onSelect={(v) => onChange('currency', v)} error={errors.currency} />
            <ChipSelector label="Language" options={LANGUAGES} selected={data.language ?? ''} onSelect={(v) => onChange('language', v)} error={errors.language} />
            <ChipSelector label="Date Format" options={DATE_FORMATS} selected={data.dateFormat ?? ''} onSelect={(v) => onChange('dateFormat', v)} error={errors.dateFormat} />

            <View style={ms.toggleSection}>
                <Text className="mb-2 font-inter text-xs font-bold text-primary-900">
                    Integrations & Features
                </Text>
                <ModalToggleRow label="India Compliance" value={data.indiaCompliance ?? false} onValueChange={(v) => onChange('indiaCompliance', v)} />
                <ModalToggleRow label="Mobile App" value={data.mobileApp ?? false} onValueChange={(v) => onChange('mobileApp', v)} />
                <ModalToggleRow label="Web App" value={data.webApp ?? false} onValueChange={(v) => onChange('webApp', v)} />
                <ModalToggleRow label="Bank Integration" value={data.bankIntegration ?? false} onValueChange={(v) => onChange('bankIntegration', v)} />
                <ModalToggleRow label="Biometric" value={data.biometric ?? false} onValueChange={(v) => onChange('biometric', v)} />
                <ModalToggleRow label="Email Notifications" value={data.emailNotif ?? false} onValueChange={(v) => onChange('emailNotif', v)} />
                <ModalToggleRow label="MFA" value={data.mfa ?? false} onValueChange={(v) => onChange('mfa', v)} />
            </View>
        </>
    );
}

function EndpointFields({
    data,
    onChange,
}: {
    data: Record<string, any>;
    onChange: (key: string, value: any) => void;
}) {
    return (
        <>
            <ModalRadioOption
                label="Default (Avyren Cloud)"
                subtitle="https://avy-erp-api.avyren.in"
                selected={data.endpointType === 'default'}
                onPress={() => onChange('endpointType', 'default')}
            />
            <ModalRadioOption
                label="Custom URL"
                subtitle="Self-hosted or dedicated instance"
                selected={data.endpointType === 'custom'}
                onPress={() => onChange('endpointType', 'custom')}
            />
            {data.endpointType === 'custom' && (
                <FormInput
                    label="Custom Endpoint URL"
                    value={data.endpointUrl ?? data.customEndpointUrl ?? ''}
                    onChangeText={(v) => onChange('endpointUrl', v)}
                    placeholder="https://erp.clientdomain.com/api"
                    keyboardType="url"
                    autoCapitalize="none"
                />
            )}
        </>
    );
}

function StrategyFields({
    data,
    onChange,
}: {
    data: Record<string, any>;
    onChange: (key: string, value: any) => void;
}) {
    return (
        <>
            <ModalToggleRow
                label="Multi-Location Mode"
                value={data.multiLocationMode ?? false}
                onValueChange={(v) => onChange('multiLocationMode', v)}
            />
            {data.multiLocationMode && (
                <>
                    <Text className="mb-2 mt-4 font-inter text-xs font-bold text-primary-900">
                        Location Configuration
                    </Text>
                    <ModalRadioOption
                        label="Common Configuration"
                        subtitle="All locations share modules & pricing"
                        selected={data.locationConfig === 'common'}
                        onPress={() => onChange('locationConfig', 'common')}
                    />
                    <ModalRadioOption
                        label="Per-Location Configuration"
                        subtitle="Each location has its own modules & pricing"
                        selected={data.locationConfig === 'per-location'}
                        onPress={() => onChange('locationConfig', 'per-location')}
                    />
                </>
            )}
        </>
    );
}

function ControlsFields({
    data,
    onChange,
}: {
    data: Record<string, any>;
    onChange: (key: string, value: any) => void;
}) {
    const controls = data.controls ?? data;
    const handleToggle = (key: string, val: boolean) => {
        // If data has a controls sub-object, update nested; otherwise flat
        if (data.controls) {
            onChange('controls', { ...data.controls, [key]: val });
        } else {
            onChange(key, val);
        }
    };

    return (
        <>
            <ModalToggleRow label="NC Edit Mode" value={controls.ncEditMode ?? false} onValueChange={(v) => handleToggle('ncEditMode', v)} />
            <ModalToggleRow label="Load / Unload" value={controls.loadUnload ?? false} onValueChange={(v) => handleToggle('loadUnload', v)} />
            <ModalToggleRow label="Cycle Time" value={controls.cycleTime ?? false} onValueChange={(v) => handleToggle('cycleTime', v)} />
            <ModalToggleRow label="Payroll Lock" value={controls.payrollLock ?? false} onValueChange={(v) => handleToggle('payrollLock', v)} />
            <ModalToggleRow label="Leave Carry Forward" value={controls.leaveCarryForward ?? false} onValueChange={(v) => handleToggle('leaveCarryForward', v)} />
            <ModalToggleRow label="Overtime Approval" value={controls.overtimeApproval ?? false} onValueChange={(v) => handleToggle('overtimeApproval', v)} />
            <ModalToggleRow label="MFA" value={controls.mfa ?? false} onValueChange={(v) => handleToggle('mfa', v)} />
        </>
    );
}

// ============ MAIN MODAL ============

export function CompanyDetailEditModal({
    visible,
    onClose,
    companyId,
    section,
    currentData,
    onSaved,
}: EditModalProps) {
    const insets = useSafeAreaInsets();
    const sectionKey = section as SectionKey;
    const mutation = useUpdateCompanySection();

    const [formData, setFormData] = React.useState<Record<string, any>>({});
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [saveError, setSaveError] = React.useState('');

    // Sync form data when modal opens or currentData changes
    React.useEffect(() => {
        if (visible && currentData) {
            setFormData({ ...currentData });
            setErrors({});
            setSaveError('');
        }
    }, [visible, currentData]);

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        // Clear field error on change
        if (errors[key]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
        if (saveError) setSaveError('');
    };

    const handleSave = () => {
        setSaveError('');
        mutation.mutate(
            { companyId, sectionKey: section, data: formData },
            {
                onSuccess: () => {
                    onSaved();
                    onClose();
                },
                onError: (err: any) => {
                    setSaveError(err?.message ?? 'Failed to save changes. Please try again.');
                },
            },
        );
    };

    const title = SECTION_TITLES[sectionKey] ?? 'Edit Section';

    const renderFields = () => {
        switch (sectionKey) {
            case 'identity':
                return <IdentityFields data={formData} onChange={handleChange} errors={errors} />;
            case 'statutory':
                return <StatutoryFields data={formData} onChange={handleChange} errors={errors} />;
            case 'address':
                return <AddressFields data={formData} onChange={handleChange} errors={errors} />;
            case 'fiscal':
                return <FiscalFields data={formData} onChange={handleChange} errors={errors} />;
            case 'preferences':
                return <PreferencesFields data={formData} onChange={handleChange} errors={errors} />;
            case 'endpoint':
                return <EndpointFields data={formData} onChange={handleChange} />;
            case 'strategy':
                return <StrategyFields data={formData} onChange={handleChange} />;
            case 'controls':
                return <ControlsFields data={formData} onChange={handleChange} />;
            default:
                return (
                    <Text className="font-inter text-sm text-neutral-500">
                        No editable fields for this section.
                    </Text>
                );
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={ms.backdrop}>
                <Pressable style={ms.backdropPress} onPress={onClose} />
                <View style={[ms.sheet, { paddingBottom: insets.bottom + 16 }]}>
                    {/* Handle bar */}
                    <View style={ms.handleBar} />

                    {/* Header */}
                    <View style={ms.header}>
                        <Text className="font-inter text-base font-bold text-primary-950">
                            {title}
                        </Text>
                        <Pressable onPress={onClose} style={ms.closeButton}>
                            <Svg width={20} height={20} viewBox="0 0 24 24">
                                <Path d="M18 6L6 18M6 6l12 12" stroke={colors.neutral[500]} strokeWidth="2" strokeLinecap="round" />
                            </Svg>
                        </Pressable>
                    </View>

                    {/* Scrollable form */}
                    <ScrollView
                        style={ms.scrollView}
                        contentContainerStyle={ms.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {renderFields()}
                    </ScrollView>

                    {/* Error message */}
                    {saveError ? (
                        <View style={ms.errorContainer}>
                            <Text className="font-inter text-xs font-medium text-danger-600">
                                {saveError}
                            </Text>
                        </View>
                    ) : null}

                    {/* Actions */}
                    <View style={ms.actions}>
                        <Pressable onPress={onClose} style={ms.cancelButton}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600">
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSave}
                            style={[ms.saveButton, mutation.isPending && ms.saveButtonDisabled]}
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <Text className="font-inter text-sm font-bold text-white">
                                    Save Changes
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ STYLES ============

const ms = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    backdropPress: {
        flex: 1,
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '88%',
        paddingTop: 8,
    },
    handleBar: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral[300],
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.neutral[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 4,
    },
    errorContainer: {
        marginHorizontal: 24,
        marginBottom: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.danger[50],
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 12,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.neutral[100],
    },
    saveButton: {
        flex: 2,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary[500],
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    // Field helpers
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    toggleSection: {
        marginTop: 12,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        backgroundColor: colors.neutral[50],
        marginBottom: 8,
    },
    radioOptionSelected: {
        borderColor: colors.primary[400],
        backgroundColor: colors.primary[50],
    },
    radioDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.neutral[300],
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioDotSelected: {
        borderColor: colors.primary[500],
    },
    radioDotInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary[500],
    },
    fieldGroup: {
        marginTop: 12,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        backgroundColor: colors.neutral[50],
    },
    dayChipSelected: {
        borderColor: colors.primary[400],
        backgroundColor: colors.primary[50],
    },
});

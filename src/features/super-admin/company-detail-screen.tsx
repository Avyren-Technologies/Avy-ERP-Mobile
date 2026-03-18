/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { StatusBadge } from '@/components/ui/status-badge';

import { MODULE_CATALOGUE, USER_TIERS } from './tenant-onboarding/constants';
import type { UserTierKey } from './tenant-onboarding/types';

// ============ TYPES ============

type WizardStatus = 'Draft' | 'Pilot' | 'Active' | 'Inactive';

interface CompanyDetail {
    id: string;
    displayName: string;
    legalName: string;
    businessType: string;
    industry: string;
    companyCode: string;
    shortName: string;
    status: WizardStatus;
    cin: string;
    incorporationDate: string;
    employees: string;
    website: string;
    emailDomain: string;
    // Step 2: Statutory
    pan: string;
    tan: string;
    gstin: string;
    pfRegNo: string;
    esiCode: string;
    ptReg: string;
    lwfrNo: string;
    rocState: string;
    // Step 3: Address
    regLine1: string;
    regLine2: string;
    regCity: string;
    regDistrict: string;
    regPin: string;
    regState: string;
    regCountry: string;
    sameAsRegistered: boolean;
    // Step 4: Fiscal
    fyType: string;
    payrollFreq: string;
    cutoffDay: string;
    disbursementDay: string;
    weekStart: string;
    timezone: string;
    workingDays: string[];
    // Step 5: Preferences
    currency: string;
    language: string;
    dateFormat: string;
    indiaCompliance: boolean;
    mobileApp: boolean;
    webApp: boolean;
    bankIntegration: boolean;
    biometric: boolean;
    emailNotif: boolean;
    mfa: boolean;
    // Step 6: Endpoint
    endpointType: 'default' | 'custom';
    endpointUrl: string;
    // Step 7: Strategy
    multiLocationMode: boolean;
    locationConfig: string;
    // Step 8: Locations
    locations: Array<{
        id: string;
        name: string;
        code: string;
        type: string;
        city: string;
        state: string;
        isHQ: boolean;
        status: string;
        geoEnabled: boolean;
        geoRadius: number;
        gstin: string;
        modules: string[];
        userTier: string;
    }>;
    // Step 11: Contacts
    contacts: Array<{
        name: string;
        designation: string;
        department: string;
        type: string;
        email: string;
        mobile: string;
    }>;
    // Step 12: Shifts
    dayStartTime: string;
    dayEndTime: string;
    weeklyOffs: string[];
    shifts: Array<{
        name: string;
        fromTime: string;
        toTime: string;
        noShuffle: boolean;
        downtimeSlots: Array<{ type: string; duration: string }>;
    }>;
    // Step 13: No. Series
    noSeries: Array<{
        code: string;
        screen: string;
        preview: string;
    }>;
    // Step 14: IOT Reasons
    iotReasons: Array<{
        reasonType: string;
        reason: string;
        department: string;
        planned: boolean;
    }>;
    // Step 15: Controls
    controls: {
        ncEditMode: boolean;
        loadUnload: boolean;
        cycleTime: boolean;
        payrollLock: boolean;
        leaveCarryForward: boolean;
        overtimeApproval: boolean;
        mfa: boolean;
    };
    // Step 16: Users
    users: Array<{
        fullName: string;
        username: string;
        role: string;
        email: string;
        department: string;
        location: string;
    }>;
    // Billing
    selectedModuleIds: string[];
    userTier: UserTierKey;
    userCount: number;
    maxUsers: number;
    billingCycle: 'monthly' | 'annual';
    nextRenewal: string;
    monthlyAmount: string;
    customPricing: boolean;
    trialDays: number;
    // Meta
    createdAt: string;
    lastActive: string;
}

// ============ MOCK DATA ============

const MOCK_DETAIL: CompanyDetail = {
    id: '1',
    displayName: 'Apex Manufacturing Pvt. Ltd',
    legalName: 'Apex Manufacturing Private Limited',
    businessType: 'Private Limited',
    industry: 'Automotive',
    companyCode: 'APEX',
    shortName: 'Apex Mfg',
    status: 'Active',
    cin: 'U28999MH2018PTC305678',
    incorporationDate: '15 Jan 2018',
    employees: '500-1000',
    website: 'apexmfg.com',
    emailDomain: 'apex.com',
    // Step 2
    pan: 'AABCA1234H',
    tan: 'PNEA12345E',
    gstin: '27AABCA1234H1Z5',
    pfRegNo: 'MH/PUN/0012345',
    esiCode: '31-00-123456-000-0001',
    ptReg: 'PT/MH/PUN/12345',
    lwfrNo: 'LWFR/MH/00567',
    rocState: 'Maharashtra',
    // Step 3
    regLine1: 'Plot 45, MIDC Industrial Area, Bhosari',
    regLine2: 'Near Telco Circle',
    regCity: 'Pune',
    regDistrict: 'Pune',
    regPin: '411026',
    regState: 'Maharashtra',
    regCountry: 'India',
    sameAsRegistered: true,
    // Step 4
    fyType: 'apr-mar',
    payrollFreq: 'Monthly',
    cutoffDay: '25',
    disbursementDay: '1',
    weekStart: 'Monday',
    timezone: 'IST UTC+5:30',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    // Step 5
    currency: 'INR — ₹',
    language: 'English',
    dateFormat: 'DD/MM/YYYY',
    indiaCompliance: true,
    mobileApp: true,
    webApp: true,
    bankIntegration: true,
    biometric: true,
    emailNotif: true,
    mfa: true,
    // Step 6
    endpointType: 'default',
    endpointUrl: 'https://api.avyerp.com',
    // Step 7
    multiLocationMode: true,
    locationConfig: 'per-location',
    // Step 8
    locations: [
        {
            id: 'loc-1',
            name: 'Pune HQ Plant',
            code: 'PUN-HQ',
            type: 'Manufacturing Plant',
            city: 'Pune',
            state: 'Maharashtra',
            isHQ: true,
            status: 'Active',
            geoEnabled: true,
            geoRadius: 500,
            gstin: '27AABCA1234H1Z5',
            modules: ['hr', 'security', 'production', 'machine-maintenance', 'inventory', 'finance', 'masters'],
            userTier: 'growth',
        },
        {
            id: 'loc-2',
            name: 'Chennai Assembly',
            code: 'CHN-ASM',
            type: 'Assembly Unit',
            city: 'Chennai',
            state: 'Tamil Nadu',
            isHQ: false,
            status: 'Active',
            geoEnabled: true,
            geoRadius: 300,
            gstin: '33AABCA1234H2Z3',
            modules: ['hr', 'security', 'production', 'masters'],
            userTier: 'starter',
        },
        {
            id: 'loc-3',
            name: 'Mumbai Sales Office',
            code: 'MUM-SO',
            type: 'Sales Office',
            city: 'Mumbai',
            state: 'Maharashtra',
            isHQ: false,
            status: 'Active',
            geoEnabled: false,
            geoRadius: 0,
            gstin: '27AABCA1234H3Z1',
            modules: ['hr', 'security', 'finance', 'vendor'],
            userTier: 'starter',
        },
    ],
    // Step 11
    contacts: [
        {
            name: 'Rajesh Kumar',
            designation: 'VP Operations',
            department: 'Operations',
            type: 'Primary',
            email: 'rajesh.kumar@apex.com',
            mobile: '+91 98765 43210',
        },
        {
            name: 'Priya Sharma',
            designation: 'HR Director',
            department: 'Human Resources',
            type: 'HR Contact',
            email: 'priya.sharma@apex.com',
            mobile: '+91 98765 43211',
        },
        {
            name: 'Amit Patel',
            designation: 'IT Manager',
            department: 'IT',
            type: 'IT Contact',
            email: 'amit.patel@apex.com',
            mobile: '+91 98765 43212',
        },
    ],
    // Step 12
    dayStartTime: '06:00',
    dayEndTime: '06:00',
    weeklyOffs: ['Sunday'],
    shifts: [
        {
            name: 'General Shift',
            fromTime: '09:00',
            toTime: '18:00',
            noShuffle: true,
            downtimeSlots: [
                { type: 'Lunch Break', duration: '60 min' },
                { type: 'Tea Break', duration: '15 min' },
            ],
        },
        {
            name: 'Morning Shift',
            fromTime: '06:00',
            toTime: '14:00',
            noShuffle: false,
            downtimeSlots: [
                { type: 'Lunch Break', duration: '30 min' },
            ],
        },
        {
            name: 'Night Shift',
            fromTime: '22:00',
            toTime: '06:00',
            noShuffle: false,
            downtimeSlots: [
                { type: 'Lunch Break', duration: '30 min' },
                { type: 'Tea Break', duration: '15 min' },
            ],
        },
    ],
    // Step 13
    noSeries: [
        { code: 'EMP', screen: 'Employee Onboarding', preview: 'EMP-APEX-00001' },
        { code: 'ATT', screen: 'Attendance', preview: 'ATT-APEX-00001' },
        { code: 'WO', screen: 'Work Order', preview: 'WO-APEX-00001' },
        { code: 'PO', screen: 'Production Order', preview: 'PO-APEX-00001' },
        { code: 'GRN', screen: 'GRN', preview: 'GRN-APEX-00001' },
        { code: 'INV', screen: 'Sales Invoice', preview: 'INV-APEX-00001' },
    ],
    // Step 14
    iotReasons: [
        { reasonType: 'Machine Idle', reason: 'No Operator', department: 'Production', planned: false },
        { reasonType: 'Machine Idle', reason: 'Material Shortage', department: 'Store', planned: false },
        { reasonType: 'Machine Idle', reason: 'Tool Change', department: 'Production', planned: true },
        { reasonType: 'Machine Alarm', reason: 'Overheating', department: 'Maintenance', planned: false },
        { reasonType: 'Machine Alarm', reason: 'Spindle Error', department: 'Maintenance', planned: false },
        { reasonType: 'Machine Alarm', reason: 'Hydraulic Fault', department: 'Maintenance', planned: false },
    ],
    // Step 15
    controls: {
        ncEditMode: false,
        loadUnload: true,
        cycleTime: true,
        payrollLock: true,
        leaveCarryForward: true,
        overtimeApproval: true,
        mfa: true,
    },
    // Step 16
    users: [
        { fullName: 'Rajesh Kumar', username: 'rajesh.k', role: 'Super Admin', email: 'rajesh.kumar@apex.com', department: 'Operations', location: 'Pune HQ Plant' },
        { fullName: 'Priya Sharma', username: 'priya.s', role: 'HR Admin', email: 'priya.sharma@apex.com', department: 'Human Resources', location: 'Pune HQ Plant' },
        { fullName: 'Amit Patel', username: 'amit.p', role: 'IT Admin', email: 'amit.patel@apex.com', department: 'IT', location: 'Pune HQ Plant' },
        { fullName: 'Sanjay Deshmukh', username: 'sanjay.d', role: 'Plant Manager', email: 'sanjay.d@apex.com', department: 'Production', location: 'Chennai Assembly' },
        { fullName: 'Neha Gupta', username: 'neha.g', role: 'Finance Manager', email: 'neha.g@apex.com', department: 'Finance', location: 'Mumbai Sales Office' },
    ],
    // Billing
    selectedModuleIds: ['hr', 'security', 'production', 'machine-maintenance', 'inventory', 'vendor', 'finance', 'masters'],
    userTier: 'growth',
    userCount: 156,
    maxUsers: 500,
    billingCycle: 'annual',
    nextRenewal: '2026-06-15',
    monthlyAmount: '₹1,84,500',
    customPricing: false,
    trialDays: 0,
    // Meta
    createdAt: '2025-06-15',
    lastActive: '2 hours ago',
};

// ============ HELPERS ============

function toBadgeStatus(status: WizardStatus) {
    switch (status) {
        case 'Active': return 'active' as const;
        case 'Pilot': return 'trial' as const;
        case 'Inactive': return 'suspended' as const;
        case 'Draft': return 'pending' as const;
    }
}

// ============ UI COMPONENTS ============

function BackButton({ onPress }: { onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={styles.backButton}>
            <ChevronLeft size={22} color={colors.white} strokeWidth={2} />
        </Pressable>
    );
}

function SectionHeader({ title, iconType }: { title: string; iconType: string }) {
    return (
        <View style={styles.sectionHeader}>
            <SectionIcon type={iconType} color={colors.primary[500]} />
            <Text className="font-inter text-sm font-bold text-primary-900">
                {title}
            </Text>
        </View>
    );
}

function SectionIcon({ type, color }: { type: string; color: string }) {
    switch (type) {
        case 'info':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'statutory':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        case 'address':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'fiscal':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'preferences':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                    />
                    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'server':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Rect x="2" y="2" width="20" height="8" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
                    <Rect x="2" y="14" width="20" height="8" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
                    <Circle cx="6" cy="6" r="1" fill={color} />
                    <Circle cx="6" cy="18" r="1" fill={color} />
                </Svg>
            );
        case 'strategy':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        case 'locations':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                    />
                    <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'contacts':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </Svg>
            );
        case 'shifts':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'noseries':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M4 7V4a2 2 0 012-2h8.5L20 7.5V20a2 2 0 01-2 2H6a2 2 0 01-2-2v-3"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <Path d="M14 2v6h6M2 14h8M6 11l3 3-3 3" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'iot':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <Path d="M12 9v4M12 17h.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'controls':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                    <Path d="M1 14h6M9 8h6M17 16h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'users':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                </Svg>
            );
        case 'modules':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
                    <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
                    <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
                    <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'billing':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                </Svg>
            );
        default:
            return null;
    }
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text className="font-inter text-xs font-medium text-neutral-500">
                {label}
            </Text>
            <Text className="font-inter text-sm font-semibold text-primary-950" numberOfLines={2}>
                {value}
            </Text>
        </View>
    );
}

function ChipRow({ items, variant = 'primary' }: { items: string[]; variant?: 'primary' | 'success' | 'neutral' }) {
    const chipStyle = variant === 'success' ? styles.chipSuccess : variant === 'neutral' ? styles.chipNeutral : styles.chipPrimary;
    const textClass = variant === 'success'
        ? 'font-inter text-xs font-semibold text-success-700'
        : variant === 'neutral'
            ? 'font-inter text-xs font-semibold text-neutral-600'
            : 'font-inter text-xs font-semibold text-primary-700';
    return (
        <View style={styles.chipRow}>
            {items.map((item) => (
                <View key={item} style={chipStyle}>
                    <Text className={textClass}>{item}</Text>
                </View>
            ))}
        </View>
    );
}

function ToggleChip({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <View style={[styles.toggleChip, enabled ? styles.toggleChipEnabled : styles.toggleChipDisabled]}>
            <View style={[styles.toggleDot, { backgroundColor: enabled ? colors.success[500] : colors.neutral[300] }]} />
            <Text className={`font-inter text-xs font-semibold ${enabled ? 'text-success-700' : 'text-neutral-500'}`}>
                {label}
            </Text>
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function CompanyDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [company] = React.useState(MOCK_DETAIL);
    const [endpointType, setEndpointType] = React.useState<'default' | 'custom'>(company.endpointType);
    const [customUrl, setCustomUrl] = React.useState(company.endpointType === 'custom' ? company.endpointUrl : '');
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [maxUsers, setMaxUsers] = React.useState(String(company.maxUsers));
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const usagePercent = company.maxUsers > 0 ? (company.userCount / company.maxUsers) * 100 : 0;
    const tier = USER_TIERS.find((t) => t.key === company.userTier);
    const badgeStatus = toBadgeStatus(company.status);

    const idleCount = company.iotReasons.filter((r) => r.reasonType === 'Machine Idle').length;
    const alarmCount = company.iotReasons.filter((r) => r.reasonType === 'Machine Alarm').length;

    const handleVerifyEndpoint = () => {
        setIsVerifying(true);
        setTimeout(() => setIsVerifying(false), 1500);
    };

    const handleSuspend = () => {
        showConfirm({
            title: 'Suspend Tenant',
            message: `Are you sure you want to suspend ${company.displayName}? All users will immediately lose access.`,
            variant: 'warning',
            confirmText: 'Suspend',
            onConfirm: () => {
                // TODO: API call to suspend tenant
            },
        });
    };

    const handleActivate = () => {
        showConfirm({
            title: 'Activate Tenant',
            message: `Activate ${company.displayName}? Users will regain access immediately.`,
            variant: 'primary',
            confirmText: 'Activate',
            onConfirm: () => {
                // TODO: API call to activate tenant
            },
        });
    };

    const handleDelete = () => {
        showConfirm({
            title: 'Delete Tenant',
            message: `This will permanently delete ${company.displayName} and all associated data. This action cannot be undone.`,
            variant: 'danger',
            confirmText: 'Delete Forever',
            onConfirm: () => {
                // TODO: API call to delete tenant
                router.back();
            },
        });
    };

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                bounces={false}
            >
                {/* ---- Header ---- */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <LinearGradient
                        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.headerGradient, { paddingTop: insets.top + 12 }]}
                    >
                        <View style={styles.headerDecor1} />
                        <View style={styles.headerDecor2} />

                        <View style={styles.headerTop}>
                            <BackButton onPress={() => router.back()} />
                            <Text className="font-inter text-base font-semibold text-white">
                                Company Details
                            </Text>
                            <View style={{ width: 36 }} />
                        </View>

                        <View style={styles.companyHeaderInfo}>
                            <LinearGradient
                                colors={[colors.accent[300], colors.primary[400]]}
                                style={styles.companyLargeAvatar}
                            >
                                <Text className="font-inter text-xl font-bold text-white">
                                    {company.displayName.substring(0, 2).toUpperCase()}
                                </Text>
                            </LinearGradient>

                            <Text className="mt-3 font-inter text-xl font-bold text-white">
                                {company.displayName}
                            </Text>
                            <Text className="mt-0.5 font-inter text-xs text-primary-200">
                                {company.legalName}
                            </Text>
                            <View style={styles.headerBadgeRow}>
                                <StatusBadge status={badgeStatus} />
                                <View style={styles.industryTag}>
                                    <Text className="font-inter text-xs font-semibold text-white/80">
                                        {company.industry}
                                    </Text>
                                </View>
                                {company.businessType ? (
                                    <View style={styles.industryTag}>
                                        <Text className="font-inter text-xs font-semibold text-white/80">
                                            {company.businessType}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Strategy badge */}
                            {company.multiLocationMode && (
                                <View style={styles.strategyBadge}>
                                    <Text className="font-inter text-[10px] font-bold text-white/90">
                                        Multi-Location  ·  {company.locationConfig === 'per-location' ? 'Per-Location Config' : 'Common Config'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Quick Stats */}
                        <View style={styles.quickStatsRow}>
                            <View style={styles.quickStat}>
                                <Text className="font-inter text-lg font-bold text-white">
                                    {company.userCount}
                                </Text>
                                <Text className="font-inter text-[10px] font-medium text-primary-200">
                                    Active Users
                                </Text>
                            </View>
                            <View style={styles.quickStatDivider} />
                            <View style={styles.quickStat}>
                                <Text className="font-inter text-lg font-bold text-white">
                                    {company.selectedModuleIds.length}
                                </Text>
                                <Text className="font-inter text-[10px] font-medium text-primary-200">
                                    Modules
                                </Text>
                            </View>
                            <View style={styles.quickStatDivider} />
                            <View style={styles.quickStat}>
                                <Text className="font-inter text-lg font-bold text-white">
                                    {company.locations.length}
                                </Text>
                                <Text className="font-inter text-[10px] font-medium text-primary-200">
                                    Locations
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                <View style={styles.body}>
                    {/* ---- Company Information ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.section}>
                        <SectionHeader title="Company Information" iconType="info" />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Company Code" value={company.companyCode} />
                            <InfoRow label="Short Name" value={company.shortName} />
                            <InfoRow label="CIN" value={company.cin} />
                            <InfoRow label="Incorporation Date" value={company.incorporationDate} />
                            <InfoRow label="Employees" value={company.employees} />
                            <InfoRow label="Website" value={company.website} />
                            <InfoRow label="Email Domain" value={company.emailDomain} />
                            <InfoRow label="Registered" value={company.createdAt} />
                        </View>
                    </Animated.View>

                    {/* ---- Statutory & Tax ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.section}>
                        <SectionHeader title="Statutory & Tax" iconType="statutory" />
                        <View style={styles.sectionCard}>
                            <InfoRow label="PAN" value={company.pan} />
                            <InfoRow label="TAN" value={company.tan || '—'} />
                            <InfoRow label="GSTIN" value={company.gstin || '—'} />
                            <InfoRow label="PF Registration" value={company.pfRegNo || '—'} />
                            <InfoRow label="ESI Code" value={company.esiCode || '—'} />
                            <InfoRow label="PT Registration" value={company.ptReg || '—'} />
                            <InfoRow label="LWFR No." value={company.lwfrNo || '—'} />
                            <InfoRow label="ROC State" value={company.rocState || '—'} />
                        </View>
                    </Animated.View>

                    {/* ---- Address ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.section}>
                        <SectionHeader title="Registered Address" iconType="address" />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Address Line 1" value={company.regLine1} />
                            {company.regLine2 ? <InfoRow label="Address Line 2" value={company.regLine2} /> : null}
                            <InfoRow label="City" value={company.regCity} />
                            <InfoRow label="District" value={company.regDistrict} />
                            <InfoRow label="PIN Code" value={company.regPin} />
                            <InfoRow label="State" value={company.regState} />
                            <InfoRow label="Country" value={company.regCountry} />
                            {company.sameAsRegistered && (
                                <View style={styles.sameAddressBadge}>
                                    <Text className="font-inter text-xs font-semibold text-info-700">
                                        Corporate address same as registered
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* ---- Fiscal & Calendar ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.section}>
                        <SectionHeader title="Fiscal & Calendar" iconType="fiscal" />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Financial Year" value={company.fyType === 'apr-mar' ? 'April – March (India)' : company.fyType} />
                            <InfoRow label="Payroll Frequency" value={company.payrollFreq} />
                            <InfoRow label="Cutoff Day" value={company.cutoffDay} />
                            <InfoRow label="Disbursement Day" value={company.disbursementDay} />
                            <InfoRow label="Week Starts" value={company.weekStart} />
                            <InfoRow label="Timezone" value={company.timezone} />
                            <View style={styles.infoRow}>
                                <Text className="font-inter text-xs font-medium text-neutral-500">
                                    Working Days
                                </Text>
                                <ChipRow items={company.workingDays} variant="primary" />
                            </View>
                        </View>
                    </Animated.View>

                    {/* ---- Preferences ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.section}>
                        <SectionHeader title="Preferences" iconType="preferences" />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Currency" value={company.currency} />
                            <InfoRow label="Language" value={company.language} />
                            <InfoRow label="Date Format" value={company.dateFormat} />
                            <View style={styles.infoRow}>
                                <Text className="mb-2 font-inter text-xs font-medium text-neutral-500">
                                    Integrations & Features
                                </Text>
                                <View style={styles.chipRow}>
                                    <ToggleChip label="India Compliance" enabled={company.indiaCompliance} />
                                    <ToggleChip label="Mobile App" enabled={company.mobileApp} />
                                    <ToggleChip label="Web App" enabled={company.webApp} />
                                    <ToggleChip label="Bank Integration" enabled={company.bankIntegration} />
                                    <ToggleChip label="Biometric" enabled={company.biometric} />
                                    <ToggleChip label="Email Notif" enabled={company.emailNotif} />
                                    <ToggleChip label="MFA" enabled={company.mfa} />
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* ---- Server Endpoint ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(350)} style={styles.section}>
                        <SectionHeader title="Backend Endpoint" iconType="server" />
                        <View style={styles.sectionCard}>
                            <View style={styles.serverToggleRow}>
                                <Pressable
                                    onPress={() => setEndpointType('default')}
                                    style={[
                                        styles.serverToggle,
                                        endpointType === 'default' && styles.serverToggleActive,
                                    ]}
                                >
                                    <View style={[styles.serverDot, { backgroundColor: colors.success[500] }]} />
                                    <Text className={`font-inter text-xs font-semibold ${endpointType === 'default' ? 'text-primary-700' : 'text-neutral-500'}`}>
                                        Default (Avyren)
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setEndpointType('custom')}
                                    style={[
                                        styles.serverToggle,
                                        endpointType === 'custom' && styles.serverToggleActive,
                                    ]}
                                >
                                    <View style={[styles.serverDot, { backgroundColor: colors.info[500] }]} />
                                    <Text className={`font-inter text-xs font-semibold ${endpointType === 'custom' ? 'text-primary-700' : 'text-neutral-500'}`}>
                                        Custom URL
                                    </Text>
                                </Pressable>
                            </View>

                            {endpointType === 'default' ? (
                                <View style={styles.serverUrlDisplay}>
                                    <Text className="font-inter text-sm font-medium text-success-700">
                                        https://api.avyerp.com
                                    </Text>
                                    <View style={styles.connectedBadge}>
                                        <View style={[styles.serverDot, { backgroundColor: colors.success[500] }]} />
                                        <Text className="font-inter text-[10px] font-bold text-success-700">
                                            CONNECTED
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View>
                                    <View style={styles.customUrlInput}>
                                        <TextInput
                                            style={styles.urlInput}
                                            placeholder="https://erp.clientdomain.com/api"
                                            placeholderTextColor={colors.neutral[400]}
                                            value={customUrl}
                                            onChangeText={setCustomUrl}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            keyboardType="url"
                                        />
                                    </View>
                                    <Pressable
                                        onPress={handleVerifyEndpoint}
                                        style={styles.verifyButton}
                                        disabled={isVerifying || !customUrl}
                                    >
                                        <Text className={`font-inter text-xs font-bold ${isVerifying ? 'text-neutral-400' : 'text-primary-600'}`}>
                                            {isVerifying ? 'Verifying...' : 'Verify Endpoint'}
                                        </Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* ---- Locations ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.section}>
                        <SectionHeader title="Locations" iconType="locations" />
                        {company.locations.map((loc) => (
                            <View key={loc.id} style={[styles.sectionCard, styles.locationCard]}>
                                <View style={styles.locationCardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.locationNameRow}>
                                            <Text className="font-inter text-sm font-bold text-primary-950">
                                                {loc.name}
                                            </Text>
                                            {loc.isHQ && (
                                                <View style={styles.hqBadge}>
                                                    <Text className="font-inter text-[9px] font-bold text-white">
                                                        HQ
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text className="font-inter text-xs font-medium text-neutral-500">
                                            {loc.code}  ·  {loc.type}
                                        </Text>
                                    </View>
                                    <View style={[styles.locationStatusDot, { backgroundColor: loc.status === 'Active' ? colors.success[500] : colors.neutral[300] }]} />
                                </View>
                                <View style={styles.locationMeta}>
                                    <Text className="font-inter text-xs text-neutral-600">
                                        {loc.city}, {loc.state}
                                    </Text>
                                    <Text className="font-inter text-xs text-neutral-500">
                                        GSTIN: {loc.gstin}
                                    </Text>
                                </View>
                                <View style={styles.locationFooter}>
                                    <View style={styles.locationChipRow}>
                                        {loc.geoEnabled && (
                                            <View style={styles.geoBadge}>
                                                <Text className="font-inter text-[10px] font-bold text-info-700">
                                                    Geo {loc.geoRadius}m
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.locationModuleCount}>
                                            <Text className="font-inter text-[10px] font-bold text-primary-700">
                                                {loc.modules.length} modules
                                            </Text>
                                        </View>
                                        <View style={styles.locationTierBadge}>
                                            <Text className="font-inter text-[10px] font-bold text-accent-700">
                                                {loc.userTier}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ---- Key Contacts ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(450)} style={styles.section}>
                        <SectionHeader title="Key Contacts" iconType="contacts" />
                        {company.contacts.map((contact, idx) => (
                            <View key={idx} style={[styles.sectionCard, styles.contactCard]}>
                                <View style={styles.contactHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-bold text-primary-950">
                                            {contact.name}
                                        </Text>
                                        <Text className="font-inter text-xs text-neutral-500">
                                            {contact.designation}  ·  {contact.department}
                                        </Text>
                                    </View>
                                    <View style={styles.contactTypeBadge}>
                                        <Text className="font-inter text-[10px] font-bold text-primary-700">
                                            {contact.type}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.contactDetails}>
                                    <Text className="font-inter text-xs text-neutral-600">
                                        {contact.email}
                                    </Text>
                                    <Text className="font-inter text-xs text-neutral-600">
                                        {contact.mobile}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ---- Shifts & Time ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.section}>
                        <SectionHeader title="Shifts & Time" iconType="shifts" />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Day Boundary" value={`${company.dayStartTime} — ${company.dayEndTime}`} />
                            <View style={styles.infoRow}>
                                <Text className="font-inter text-xs font-medium text-neutral-500">
                                    Weekly Offs
                                </Text>
                                <ChipRow items={company.weeklyOffs} variant="neutral" />
                            </View>
                        </View>
                        {company.shifts.map((shift, idx) => (
                            <View key={idx} style={[styles.sectionCard, styles.shiftCard]}>
                                <View style={styles.shiftHeader}>
                                    <Text className="font-inter text-sm font-bold text-primary-950">
                                        {shift.name}
                                    </Text>
                                    <Text className="font-inter text-xs font-semibold text-primary-600">
                                        {shift.fromTime} — {shift.toTime}
                                    </Text>
                                </View>
                                <View style={styles.shiftMeta}>
                                    {shift.noShuffle && (
                                        <View style={styles.noShuffleBadge}>
                                            <Text className="font-inter text-[10px] font-bold text-warning-700">
                                                No Shuffle
                                            </Text>
                                        </View>
                                    )}
                                    {shift.downtimeSlots.map((dt, dtIdx) => (
                                        <View key={dtIdx} style={styles.downtimeChip}>
                                            <Text className="font-inter text-[10px] font-medium text-neutral-600">
                                                {dt.type}: {dt.duration}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ---- No. Series ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(550)} style={styles.section}>
                        <SectionHeader title="No. Series" iconType="noseries" />
                        <View style={styles.sectionCard}>
                            {company.noSeries.map((series, idx) => (
                                <View key={idx} style={[styles.noSeriesRow, idx === company.noSeries.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-xs font-medium text-neutral-500">
                                            {series.screen}
                                        </Text>
                                        <Text className="font-inter text-sm font-bold text-primary-950" style={{ fontFamily: 'monospace' }}>
                                            {series.preview}
                                        </Text>
                                    </View>
                                    <View style={styles.seriesCodeBadge}>
                                        <Text className="font-inter text-[10px] font-bold text-primary-600" style={{ fontFamily: 'monospace' }}>
                                            {series.code}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ---- IOT Reasons ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(600)} style={styles.section}>
                        <SectionHeader title="IOT Reasons" iconType="iot" />
                        <View style={styles.sectionCard}>
                            <View style={styles.iotSummaryRow}>
                                <View style={styles.iotSummaryItem}>
                                    <Text className="font-inter text-lg font-bold text-warning-600">
                                        {idleCount}
                                    </Text>
                                    <Text className="font-inter text-[10px] font-medium text-neutral-500">
                                        Idle Reasons
                                    </Text>
                                </View>
                                <View style={styles.iotSummaryDivider} />
                                <View style={styles.iotSummaryItem}>
                                    <Text className="font-inter text-lg font-bold text-danger-600">
                                        {alarmCount}
                                    </Text>
                                    <Text className="font-inter text-[10px] font-medium text-neutral-500">
                                        Alarm Reasons
                                    </Text>
                                </View>
                            </View>
                            {company.iotReasons.map((reason, idx) => (
                                <View key={idx} style={[styles.iotReasonRow, idx === company.iotReasons.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950">
                                            {reason.reason}
                                        </Text>
                                        <Text className="font-inter text-xs text-neutral-500">
                                            {reason.department}
                                        </Text>
                                    </View>
                                    <View style={styles.iotBadgeRow}>
                                        <View style={[styles.iotTypeBadge, reason.reasonType === 'Machine Idle' ? styles.iotIdleBadge : styles.iotAlarmBadge]}>
                                            <Text className={`font-inter text-[10px] font-bold ${reason.reasonType === 'Machine Idle' ? 'text-warning-700' : 'text-danger-700'}`}>
                                                {reason.reasonType === 'Machine Idle' ? 'Idle' : 'Alarm'}
                                            </Text>
                                        </View>
                                        {reason.planned && (
                                            <View style={styles.plannedBadge}>
                                                <Text className="font-inter text-[10px] font-bold text-info-700">
                                                    Planned
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ---- System Controls ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(650)} style={styles.section}>
                        <SectionHeader title="System Controls" iconType="controls" />
                        <View style={styles.sectionCard}>
                            <View style={styles.chipRow}>
                                <ToggleChip label="NC Edit Mode" enabled={company.controls.ncEditMode} />
                                <ToggleChip label="Load/Unload" enabled={company.controls.loadUnload} />
                                <ToggleChip label="Cycle Time" enabled={company.controls.cycleTime} />
                                <ToggleChip label="Payroll Lock" enabled={company.controls.payrollLock} />
                                <ToggleChip label="Leave Carry Forward" enabled={company.controls.leaveCarryForward} />
                                <ToggleChip label="Overtime Approval" enabled={company.controls.overtimeApproval} />
                                <ToggleChip label="MFA" enabled={company.controls.mfa} />
                            </View>
                        </View>
                    </Animated.View>

                    {/* ---- Users ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(700)} style={styles.section}>
                        <SectionHeader title="Users & Access" iconType="users" />
                        <View style={styles.sectionCard}>
                            {/* User Tier & Limits */}
                            <View style={styles.userLimitsRow}>
                                <View style={styles.userLimitInfo}>
                                    <Text className="font-inter text-xs font-medium text-neutral-500">
                                        Active Users
                                    </Text>
                                    <Text className="font-inter text-2xl font-bold text-primary-950">
                                        {company.userCount}
                                    </Text>
                                </View>
                                <View style={styles.userLimitDivider} />
                                <View style={styles.userLimitInfo}>
                                    <Text className="font-inter text-xs font-medium text-neutral-500">
                                        Max Limit
                                    </Text>
                                    <View style={styles.maxUserInput}>
                                        <TextInput
                                            style={styles.maxUserTextField}
                                            value={maxUsers}
                                            onChangeText={setMaxUsers}
                                            keyboardType="number-pad"
                                        />
                                        <Svg width={14} height={14} viewBox="0 0 24 24">
                                            <Path
                                                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                                stroke={colors.primary[400]}
                                                strokeWidth="1.5"
                                                fill="none"
                                                strokeLinecap="round"
                                            />
                                        </Svg>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.usageSection}>
                                <View style={styles.usageBarBg}>
                                    <View
                                        style={[
                                            styles.usageBarFill,
                                            {
                                                width: `${Math.min(usagePercent, 100)}%`,
                                                backgroundColor: usagePercent > 80 ? colors.warning[500] : colors.success[500],
                                            },
                                        ]}
                                    />
                                </View>
                                <Text className="font-inter text-[10px] font-medium text-neutral-400">
                                    {Math.round(usagePercent)}% capacity · {tier?.label ?? company.userTier} tier · {tier?.range ?? ''}
                                </Text>
                            </View>
                        </View>

                        {/* User List */}
                        {company.users.map((user, idx) => (
                            <View key={idx} style={[styles.sectionCard, styles.userCard]}>
                                <View style={styles.userCardHeader}>
                                    <View style={styles.userAvatar}>
                                        <Text className="font-inter text-xs font-bold text-primary-700">
                                            {user.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-bold text-primary-950">
                                            {user.fullName}
                                        </Text>
                                        <Text className="font-inter text-xs text-neutral-500" style={{ fontFamily: 'monospace' }}>
                                            @{user.username}
                                        </Text>
                                    </View>
                                    <View style={styles.roleBadge}>
                                        <Text className="font-inter text-[10px] font-bold text-accent-700">
                                            {user.role}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.userMeta}>
                                    <Text className="font-inter text-xs text-neutral-600">
                                        {user.department}  ·  {user.location}
                                    </Text>
                                    <Text className="font-inter text-xs text-neutral-500">
                                        {user.email}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ---- Active Modules ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(750)} style={styles.section}>
                        <SectionHeader title="Active Modules" iconType="modules" />
                        <View style={styles.sectionCard}>
                            <View style={styles.modulesGrid}>
                                {MODULE_CATALOGUE.map((mod) => {
                                    const isActive = company.selectedModuleIds.includes(mod.id);
                                    return (
                                        <View
                                            key={mod.id}
                                            style={[
                                                styles.moduleChip,
                                                isActive ? styles.moduleChipActive : styles.moduleChipInactive,
                                            ]}
                                        >
                                            <Text
                                                className={`font-inter text-xs font-semibold ${isActive ? 'text-primary-800' : 'text-neutral-400'}`}
                                            >
                                                {mod.icon} {mod.name}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                            <Pressable
                                style={styles.manageModulesButton}
                                onPress={() => router.push(`/(app)/tenant/module-assignment?id=${company.id}`)}
                            >
                                <Text className="font-inter text-sm font-bold text-primary-600">
                                    Manage Modules
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>

                    {/* ---- Subscription & Billing ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(800)} style={styles.section}>
                        <SectionHeader title="Subscription & Billing" iconType="billing" />
                        <View style={styles.sectionCard}>
                            <View style={styles.billingGrid}>
                                <View style={styles.billingItem}>
                                    <Text className="font-inter text-xs text-neutral-500">Plan</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950">
                                        {tier?.label ?? company.userTier}
                                    </Text>
                                </View>
                                <View style={styles.billingItem}>
                                    <Text className="font-inter text-xs text-neutral-500">Billing</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950">
                                        {company.billingCycle === 'annual' ? 'Annual (2 months free)' : 'Monthly'}
                                    </Text>
                                </View>
                                <View style={styles.billingItem}>
                                    <Text className="font-inter text-xs text-neutral-500">Amount</Text>
                                    <Text className="font-inter text-sm font-bold text-success-600">
                                        {company.monthlyAmount}/mo
                                    </Text>
                                </View>
                                <View style={styles.billingItem}>
                                    <Text className="font-inter text-xs text-neutral-500">Next Renewal</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950">
                                        {company.nextRenewal}
                                    </Text>
                                </View>
                                {company.trialDays > 0 ? (
                                    <View style={styles.billingItem}>
                                        <Text className="font-inter text-xs text-neutral-500">Trial Period</Text>
                                        <Text className="font-inter text-sm font-bold text-info-600">
                                            {company.trialDays} days
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            {company.customPricing && (
                                <View style={styles.customPricingBadge}>
                                    <Text className="font-inter text-xs font-bold text-accent-700">
                                        Custom Pricing Applied
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* ---- Tenant Actions ---- */}
                    <Animated.View entering={FadeIn.duration(400).delay(850)} style={styles.section}>
                        <Text className="mb-3 font-inter text-sm font-bold text-neutral-500">
                            Tenant Actions
                        </Text>
                        <View style={styles.actionsRow}>
                            {company.status === 'Active' && (
                                <Pressable onPress={handleSuspend} style={styles.actionButton}>
                                    <LinearGradient
                                        colors={[colors.warning[500], colors.warning[600]]}
                                        style={styles.actionGradient}
                                    >
                                        <Svg width={18} height={18} viewBox="0 0 24 24">
                                            <Path d="M10 9v6M14 9v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                                            <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.5" fill="none" />
                                        </Svg>
                                        <Text className="ml-2 font-inter text-xs font-bold text-white">Suspend</Text>
                                    </LinearGradient>
                                </Pressable>
                            )}
                            {company.status === 'Inactive' && (
                                <Pressable onPress={handleActivate} style={styles.actionButton}>
                                    <LinearGradient
                                        colors={[colors.success[500], colors.success[600]]}
                                        style={styles.actionGradient}
                                    >
                                        <Svg width={18} height={18} viewBox="0 0 24 24">
                                            <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                        <Text className="ml-2 font-inter text-xs font-bold text-white">Activate</Text>
                                    </LinearGradient>
                                </Pressable>
                            )}
                            {company.status === 'Draft' && (
                                <Pressable onPress={handleActivate} style={styles.actionButton}>
                                    <LinearGradient
                                        colors={[colors.primary[500], colors.primary[700]]}
                                        style={styles.actionGradient}
                                    >
                                        <Svg width={18} height={18} viewBox="0 0 24 24">
                                            <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                        <Text className="ml-2 font-inter text-xs font-bold text-white">Provision</Text>
                                    </LinearGradient>
                                </Pressable>
                            )}
                            <Pressable onPress={handleDelete} style={styles.actionButton}>
                                <LinearGradient
                                    colors={[colors.danger[500], colors.danger[600]]}
                                    style={styles.actionGradient}
                                >
                                    <Svg width={18} height={18} viewBox="0 0 24 24">
                                        <Path
                                            d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                                            stroke="#fff"
                                            strokeWidth="1.5"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                    </Svg>
                                    <Text className="ml-2 font-inter text-xs font-bold text-white">Delete</Text>
                                </LinearGradient>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </ScrollView>

            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    headerGradient: {
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    headerDecor1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerDecor2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    companyHeaderInfo: {
        alignItems: 'center',
        marginBottom: 20,
    },
    companyLargeAvatar: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    headerBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 6,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    industryTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    strategyBadge: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    quickStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    quickStat: {
        flex: 1,
        alignItems: 'center',
    },
    quickStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    body: {
        paddingHorizontal: 24,
        marginTop: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    infoRow: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    sameAddressBadge: {
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.info[50],
        borderWidth: 1,
        borderColor: colors.info[100],
    },
    // Chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    chipPrimary: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    chipSuccess: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: colors.success[50],
        borderWidth: 1,
        borderColor: colors.success[200],
    },
    chipNeutral: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: colors.neutral[100],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    toggleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
    },
    toggleChipEnabled: {
        backgroundColor: colors.success[50],
        borderColor: colors.success[200],
    },
    toggleChipDisabled: {
        backgroundColor: colors.neutral[50],
        borderColor: colors.neutral[200],
    },
    toggleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    // Server
    serverToggleRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    serverToggle: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        backgroundColor: colors.neutral[50],
    },
    serverToggleActive: {
        borderColor: colors.primary[400],
        backgroundColor: colors.primary[50],
    },
    serverDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    serverUrlDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.success[50],
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    customUrlInput: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 44,
        justifyContent: 'center',
    },
    urlInput: {
        fontSize: 13,
        color: colors.primary[950],
    },
    verifyButton: {
        alignSelf: 'flex-end',
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
    },
    // Locations
    locationCard: {
        marginBottom: 10,
    },
    locationCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    locationNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    hqBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: colors.primary[500],
    },
    locationStatusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
    },
    locationMeta: {
        marginTop: 8,
        gap: 2,
    },
    locationFooter: {
        marginTop: 10,
    },
    locationChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    geoBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.info[50],
        borderWidth: 1,
        borderColor: colors.info[200],
    },
    locationModuleCount: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    locationTierBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.accent[50],
        borderWidth: 1,
        borderColor: colors.accent[200],
    },
    // Contacts
    contactCard: {
        marginBottom: 10,
    },
    contactHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    contactTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    contactDetails: {
        marginTop: 8,
        gap: 2,
    },
    // Shifts
    shiftCard: {
        marginTop: 10,
    },
    shiftHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    shiftMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
    },
    noShuffleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.warning[50],
        borderWidth: 1,
        borderColor: colors.warning[200],
    },
    downtimeChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.neutral[100],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    // No. Series
    noSeriesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    seriesCodeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    // IOT
    iotSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    iotSummaryItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    iotSummaryDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.neutral[200],
        marginHorizontal: 12,
    },
    iotReasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    iotBadgeRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    iotTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    iotIdleBadge: {
        backgroundColor: colors.warning[50],
        borderColor: colors.warning[200],
    },
    iotAlarmBadge: {
        backgroundColor: colors.danger[50],
        borderColor: colors.danger[200],
    },
    plannedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.info[50],
        borderWidth: 1,
        borderColor: colors.info[200],
    },
    // Users
    userLimitsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userLimitInfo: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    userLimitDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.neutral[200],
        marginHorizontal: 12,
    },
    maxUserInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary[50],
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    maxUserTextField: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.primary[600],
        minWidth: 50,
        textAlign: 'center',
    },
    usageSection: {
        marginTop: 14,
        gap: 6,
    },
    usageBarBg: {
        height: 6,
        backgroundColor: colors.neutral[100],
        borderRadius: 3,
        overflow: 'hidden',
    },
    usageBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    userCard: {
        marginTop: 10,
    },
    userCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
        justifyContent: 'center',
        alignItems: 'center',
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.accent[50],
        borderWidth: 1,
        borderColor: colors.accent[200],
    },
    userMeta: {
        marginTop: 8,
        marginLeft: 46,
        gap: 2,
    },
    // Modules
    modulesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    moduleChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    moduleChipActive: {
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    moduleChipInactive: {
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    manageModulesButton: {
        marginTop: 14,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: colors.primary[50],
    },
    // Billing
    billingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    billingItem: {
        width: '50%',
        paddingVertical: 10,
        gap: 4,
    },
    customPricingBadge: {
        alignSelf: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.accent[50],
    },
    // Actions
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        borderRadius: 14,
    },
});

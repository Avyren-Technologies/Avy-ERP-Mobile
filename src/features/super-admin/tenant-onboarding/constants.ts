// ============ WIZARD CONFIG ============

export const TOTAL_STEPS = 17;

export const STEP_META = [
    { id: 1, title: 'Company Identity', subtitle: 'Logo, name, industry & status' },
    { id: 2, title: 'Statutory & Tax', subtitle: 'PAN, TAN, GSTIN, PF/ESI/PT' },
    { id: 3, title: 'Address', subtitle: 'Registered & corporate address' },
    { id: 4, title: 'Fiscal & Calendar', subtitle: 'FY period, payroll cycle, timezone' },
    { id: 5, title: 'Preferences', subtitle: 'Integrations & notifications' },
    { id: 6, title: 'Backend Endpoint', subtitle: 'Default or custom server connection' },
    { id: 7, title: 'Configuration Strategy', subtitle: 'Location mode & billing scope' },
    { id: 8, title: 'Locations Master', subtitle: 'Plants, branches, GST & geo-fencing' },
    { id: 9, title: 'Per-Location Modules', subtitle: 'Active modules billed per location' },
    { id: 10, title: 'Per-Location Pricing', subtitle: 'User tier & subscription per location' },
    { id: 11, title: 'Key Contacts', subtitle: 'HR, Finance, IT, Operations' },
    { id: 12, title: 'Shifts & Time', subtitle: 'Shift master, downtime slots' },
    { id: 13, title: 'No. Series', subtitle: 'Document numbering sequences' },
    { id: 14, title: 'IOT Reasons', subtitle: 'Machine downtime & idle reasons' },
    { id: 15, title: 'System Controls', subtitle: 'Operational & security settings' },
    { id: 16, title: 'Users & Access', subtitle: 'Users, roles & location access scope' },
    { id: 17, title: 'Activation', subtitle: 'Location readiness & billing summary' },
];

// ============ COMPANY ============

export const BUSINESS_TYPES = [
    'Private Limited (Pvt. Ltd.)',
    'Public Limited',
    'Partnership',
    'Proprietorship',
    'Others',
];

export const INDUSTRIES = [
    'IT', 'Manufacturing', 'BFSI', 'Healthcare', 'Retail',
    'Automotive', 'Pharma', 'Education', 'Steel & Metal',
    'Textiles', 'Plastics', 'Electronics', 'Food Processing',
    'Heavy Engineering', 'CNC Machining', 'Chemicals', 'Logistics',
    'Construction', 'Real Estate', 'E-Commerce', 'Other',
];

export const COMPANY_STATUSES = ['Draft', 'Pilot', 'Active', 'Inactive'];

// ============ GEO ============

export const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
    'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
    'Chandigarh', 'Others',
];

export const COUNTRIES = [
    'India', 'United States', 'United Kingdom', 'UAE', 'Singapore',
    'Australia', 'Germany', 'Japan', 'Malaysia', 'Thailand', 'South Korea',
    'China', 'Canada', 'France', 'Italy', 'Netherlands', 'Others',
];

export const COUNTRY_CODES = [
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+1', country: 'United States', flag: '🇺🇸' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
    { code: '+66', country: 'Thailand', flag: '🇹🇭' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
    { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
    { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
    { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+977', country: 'Nepal', flag: '🇳🇵' },
    { code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+7', country: 'Russia', flag: '🇷🇺' },
];

export const GEO_RADIUS_OPTIONS = [
    { label: '50 m', value: 50 },
    { label: '100 m', value: 100 },
    { label: '200 m', value: 200 },
    { label: '300 m', value: 300 },
    { label: '500 m', value: 500 },
    { label: '1 km', value: 1000 },
    { label: '2 km', value: 2000 },
    { label: '5 km', value: 5000 },
];

// ============ FISCAL & CALENDAR ============

export const FY_OPTIONS = [
    { key: 'apr-mar', label: 'April – March', subtitle: 'Standard India FY' },
    { key: 'jan-dec', label: 'January – December', subtitle: 'Calendar year (global)' },
    { key: 'jul-jun', label: 'July – June', subtitle: 'Australia / NZ style' },
    { key: 'oct-sep', label: 'October – September', subtitle: 'Middle East / custom' },
    { key: 'custom', label: 'Custom Period', subtitle: 'Define your own FY start & end months' },
];

export const MONTHS = [
    { key: '01', label: 'January', short: 'Jan' },
    { key: '02', label: 'February', short: 'Feb' },
    { key: '03', label: 'March', short: 'Mar' },
    { key: '04', label: 'April', short: 'Apr' },
    { key: '05', label: 'May', short: 'May' },
    { key: '06', label: 'June', short: 'Jun' },
    { key: '07', label: 'July', short: 'Jul' },
    { key: '08', label: 'August', short: 'Aug' },
    { key: '09', label: 'September', short: 'Sep' },
    { key: '10', label: 'October', short: 'Oct' },
    { key: '11', label: 'November', short: 'Nov' },
    { key: '12', label: 'December', short: 'Dec' },
];

export const PAYROLL_FREQ = [
    'Monthly', 'Semi-Monthly', 'Fortnightly', 'Bi-Weekly', 'Weekly', 'Daily',
];

export const CUTOFF_DAYS = [
    '1st', '5th', '10th', '15th', '20th', '25th', '28th',
    'Last Working Day', 'Last Day of Month',
];

export const DISBURSEMENT_DAYS = [
    '1st', '3rd', '5th', '7th', '10th', '15th', '28th',
    'Last Day', 'Same Day as Cutoff',
];

export const WEEK_STARTS = [
    'Monday', 'Sunday', 'Saturday',
    'Tuesday', 'Wednesday', 'Thursday', 'Friday',
];

export const TIMEZONES = [
    'IST UTC+5:30', 'UTC+0', 'EST UTC-5', 'PST UTC-8',
    'GST UTC+4', 'SGT UTC+8', 'AEST UTC+10',
];

export const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

// ============ PREFERENCES ============

export const CURRENCIES = ['INR — ₹', 'USD — $', 'GBP — £', 'EUR — €', 'AED — د.إ'];
export const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Kannada', 'Telugu', 'Malayalam'];
export const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
export const NUMBER_FORMATS = ['Indian (2,00,000)', 'International (200,000)'];
export const TIME_FORMATS = ['12-hour (AM/PM)', '24-hour'];

// ============ MODULE CATALOGUE ============

export const MODULE_CATALOGUE = [
    {
        id: 'hr',
        name: 'HR Management',
        icon: '👥',
        description: 'Employee directory, attendance, leave, payroll, incentives',
        price: 2999,
        dependencies: ['security'],
    },
    {
        id: 'security',
        name: 'Security',
        icon: '🔒',
        description: 'Gate attendance, goods verification, visitor management',
        price: 1499,
        dependencies: [],
    },
    {
        id: 'production',
        name: 'Production',
        icon: '🏭',
        description: 'OEE dashboard, production logging, scrap & NC tracking',
        price: 3499,
        dependencies: ['machine-maintenance', 'masters'],
    },
    {
        id: 'machine-maintenance',
        name: 'Machine Maintenance',
        icon: '🔧',
        description: 'PM scheduling, breakdown management, spare parts, OEE data',
        price: 2499,
        dependencies: ['masters'],
    },
    {
        id: 'inventory',
        name: 'Inventory',
        icon: '📦',
        description: 'Stock management, goods receipt, material requests & issues',
        price: 1999,
        dependencies: ['masters'],
    },
    {
        id: 'vendor',
        name: 'Vendor Management',
        icon: '🤝',
        description: 'Vendor directory, purchase orders, ASN/GRN, delivery ratings',
        price: 2499,
        dependencies: ['inventory', 'masters'],
    },
    {
        id: 'sales',
        name: 'Sales & Invoicing',
        icon: '📊',
        description: 'Quotes, GST invoices, customer ledger, payment tracking',
        price: 2999,
        dependencies: ['finance', 'masters'],
    },
    {
        id: 'finance',
        name: 'Finance',
        icon: '💰',
        description: 'Payables, receivables, payments, P&L, balance sheet, cash flow',
        price: 2999,
        dependencies: ['masters'],
    },
    {
        id: 'visitor',
        name: 'Visitor Management',
        icon: '🪪',
        description: 'Pre-registration, QR self-check-in, visit history & audit trail',
        price: 999,
        dependencies: ['security'],
    },
    {
        id: 'masters',
        name: 'Masters',
        icon: '📋',
        description: 'Item, shift, machine, operation & part masters',
        price: 499,
        dependencies: [],
    },
];

// ============ USER TIERS ============

export const USER_TIERS = [
    {
        key: 'starter',
        label: 'Starter',
        range: '50 – 100 users',
        description: 'Entry tier for small factories',
        minUsers: 50,
        maxUsers: 100,
        basePrice: 4999,
        perUserPrice: 49,
        popular: false,
    },
    {
        key: 'growth',
        label: 'Growth',
        range: '101 – 200 users',
        description: 'Mid-sized manufacturing operations',
        minUsers: 101,
        maxUsers: 200,
        basePrice: 8999,
        perUserPrice: 44,
        popular: true,
    },
    {
        key: 'scale',
        label: 'Scale',
        range: '201 – 500 users',
        description: 'Multi-shift, multi-line facilities',
        minUsers: 201,
        maxUsers: 500,
        basePrice: 18999,
        perUserPrice: 38,
        popular: false,
    },
    {
        key: 'enterprise',
        label: 'Enterprise',
        range: '501 – 1,000 users',
        description: 'Large manufacturing complexes',
        minUsers: 501,
        maxUsers: 1000,
        basePrice: 34999,
        perUserPrice: 32,
        popular: false,
    },
    {
        key: 'custom',
        label: 'Custom',
        range: '1,000+ users',
        description: 'Negotiated directly with Avyren',
        minUsers: 1001,
        maxUsers: null,
        basePrice: 0,
        perUserPrice: 0,
        popular: false,
    },
];

// ============ BILLING TYPES ============

export const BILLING_TYPES = [
    { key: 'monthly' as const, label: 'Monthly', description: 'Recurring monthly subscription', icon: 'calendar' },
    { key: 'annual' as const, label: 'Annual', description: 'Pay 10 months, get 12 months (save 16.67%)', icon: 'calendar-check' },
    { key: 'one_time_amc' as const, label: 'One-Time + AMC', description: 'Perpetual license + Annual Maintenance', icon: 'shield-check' },
] as const;

export type BillingTypeKey = typeof BILLING_TYPES[number]['key'];

// ============ MODULE DEPENDENCIES ============

export function resolveModuleDependencies(selectedIds: string[]) {
    const auto = new Set<string>();
    const expanded = new Set(selectedIds);

    const resolve = (id: string) => {
        const mod = MODULE_CATALOGUE.find((item) => item.id === id);
        if (!mod) return;
        for (const dep of mod.dependencies ?? []) {
            if (!expanded.has(dep)) {
                expanded.add(dep);
                auto.add(dep);
                resolve(dep);
            }
        }
    };

    for (const id of selectedIds) resolve(id);

    return {
        resolved: Array.from(expanded),
        auto: Array.from(auto),
    };
}

// ============ LOCATIONS ============

export const FACILITY_TYPES = [
    'Head Office',
    'Regional Office',
    'Branch Office',
    'Satellite Office',
    'Manufacturing Plant',
    'Assembly Unit',
    'Warehouse / Distribution',
    'R&D Centre',
    'Data Centre',
    'Training Centre',
    'Service Centre',
    'Customer Support Centre',
    'Sales Office',
    'Distribution Centre',
    'Factory',
    'Retail Store',
    'Custom...',
];

export const FACILITY_STATUSES = ['Active', 'Inactive', 'Under Construction'];

export const CONTACT_TYPES = [
    'Primary', 'HR Contact', 'Finance Contact',
    'IT Contact', 'Legal Contact', 'Operations Contact',
];

// ============ SHIFTS & TIME ============

export const DOWNTIME_TYPES = [
    'Scheduled Maintenance', 'Lunch Break', 'Changeover', 'Training',
    'Cleaning', 'Tea Break', 'Other',
];

// ============ NO SERIES ============

export const NO_SERIES_SCREENS: { value: string; label: string }[] = [
    { value: 'Employee', label: 'Employee Onboarding' },
    { value: 'Leave Management', label: 'Leave Management' },
    { value: 'Payroll', label: 'Payroll Run' },
    { value: 'Recruitment', label: 'Recruitment' },
    { value: 'Training', label: 'Training' },
    { value: 'Performance', label: 'Performance Review' },
    { value: 'ESS', label: 'ESS Requests' },
    { value: 'Expense', label: 'Expense Claims' },
    { value: 'Asset', label: 'Asset Management' },
    { value: 'Letter', label: 'HR Letters' },
    { value: 'Offboarding', label: 'Offboarding' },
    { value: 'Production Order', label: 'Production Order' },
    { value: 'Quality Check', label: 'Quality Check' },
    { value: 'Purchase Order', label: 'Purchase Order' },
    { value: 'Goods Receipt', label: 'Goods Receipt Note' },
    { value: 'Stock Transfer', label: 'Stock Transfer' },
    { value: 'Gate Pass', label: 'Gate Pass' },
    { value: 'Visitor', label: 'Visitor Registration' },
    { value: 'Maintenance', label: 'Maintenance Request' },
    { value: 'Support Ticket', label: 'Support Ticket' },
];

// ============ IOT ============

export const IOT_REASON_TYPES = ['Machine Idle', 'Machine Alarm'];

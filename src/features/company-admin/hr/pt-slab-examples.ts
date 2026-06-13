/**
 * PT Slab Example Presets — Indian States
 *
 * Standard Professional Tax slabs as published by state governments.
 * Used as starter templates in the PT slab editor; users can edit after applying.
 *
 * Mirrored from web app to avoid cross-codebase imports.
 */

export type PTGender = 'MALE' | 'FEMALE' | 'ALL';

export interface PTSlabExampleRow {
    fromAmount: number;
    toAmount: number;
    taxAmount: number;
    gender: PTGender;
}

export interface PTSlabExample {
    id: string;
    state: string;
    label: string;
    description: string;
    financialYear: string;
    slabs: PTSlabExampleRow[];
}

export const PT_SLAB_EXAMPLES: PTSlabExample[] = [
    {
        id: 'karnataka',
        state: 'Karnataka',
        label: 'Karnataka — Standard',
        description: 'Up to ₹25,000 exempt, ₹200/month above.',
        financialYear: '2025-26',
        slabs: [
            { fromAmount: 0, toAmount: 25000, taxAmount: 0, gender: 'ALL' },
            { fromAmount: 25001, toAmount: 9999999, taxAmount: 200, gender: 'ALL' },
        ],
    },
    {
        id: 'maharashtra',
        state: 'Maharashtra',
        label: 'Maharashtra — Gender-based',
        description: 'Female employees exempt up to ₹25,000; male slabs at ₹7,500/₹10,000.',
        financialYear: '2025-26',
        slabs: [
            // Female slabs
            { fromAmount: 0, toAmount: 25000, taxAmount: 0, gender: 'FEMALE' },
            { fromAmount: 25001, toAmount: 9999999, taxAmount: 200, gender: 'FEMALE' },
            // Male slabs
            { fromAmount: 0, toAmount: 7500, taxAmount: 0, gender: 'MALE' },
            { fromAmount: 7501, toAmount: 10000, taxAmount: 175, gender: 'MALE' },
            { fromAmount: 10001, toAmount: 9999999, taxAmount: 200, gender: 'MALE' },
        ],
    },
    {
        id: 'west-bengal',
        state: 'West Bengal',
        label: 'West Bengal — Standard',
        description: 'Progressive slabs from ₹10,001 onwards.',
        financialYear: '2025-26',
        slabs: [
            { fromAmount: 0, toAmount: 10000, taxAmount: 0, gender: 'ALL' },
            { fromAmount: 10001, toAmount: 15000, taxAmount: 110, gender: 'ALL' },
            { fromAmount: 15001, toAmount: 25000, taxAmount: 130, gender: 'ALL' },
            { fromAmount: 25001, toAmount: 40000, taxAmount: 150, gender: 'ALL' },
            { fromAmount: 40001, toAmount: 9999999, taxAmount: 200, gender: 'ALL' },
        ],
    },
    {
        id: 'andhra-pradesh',
        state: 'Andhra Pradesh',
        label: 'Andhra Pradesh — Standard',
        description: 'Progressive slabs from ₹15,001 onwards.',
        financialYear: '2025-26',
        slabs: [
            { fromAmount: 0, toAmount: 15000, taxAmount: 0, gender: 'ALL' },
            { fromAmount: 15001, toAmount: 20000, taxAmount: 150, gender: 'ALL' },
            { fromAmount: 20001, toAmount: 9999999, taxAmount: 200, gender: 'ALL' },
        ],
    },
];

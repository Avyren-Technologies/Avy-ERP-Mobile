import type { ScreenHelp } from './types';

export const failureCodesHelp: ScreenHelp = {
  page: {
    title: 'Failure Codes',
    description:
      'Configure the failure taxonomy used for root cause analysis during breakdown closure. Organized as a 3-level hierarchy: Failure Code Sets -> Failure Modes -> Failure Causes, plus standalone Action Codes.',
    prerequisites: ['Maintenance Config saved (Settings -> Maintenance Config)'],
    steps: [
      'Create a Failure Code Set (e.g., "Rotating Equipment", "Electrical Systems")',
      'Add Failure Modes under each Set (e.g., "Bearing Failure", "Motor Burnout")',
      'Add Failure Causes under each Mode (e.g., "Lubrication Failure", "Overload")',
      'Configure Action Codes separately for corrective actions (e.g., "Replace Bearing", "Rewind Motor")',
    ],
    tips: [
      'Link Failure Code Sets to asset classes so technicians see only relevant failure codes during breakdown closure',
      'The hierarchy Set -> Mode -> Cause -> Action provides structured root cause analysis for every breakdown',
      'Well-configured failure codes enable recurring failure detection and trend analysis across your fleet',
      'Start with broad sets and refine over time as your team captures real failure data',
    ],
  },
};

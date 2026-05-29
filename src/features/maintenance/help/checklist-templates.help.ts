import type { ScreenHelp } from './types';

export const checklistTemplatesHelp: ScreenHelp = {
  page: {
    title: 'Checklist Templates',
    description:
      'Design inspection and task checklists that technicians complete during work order execution. Checklists are organized into Sections -> Fields with multiple field types (Yes/No, Pass/Fail, Numeric, Text, Photo, Signature, etc.).',
    steps: [
      'Create a new checklist template with a descriptive name',
      'Add sections to organize the checklist (e.g., "Safety Pre-Checks", "Operational Tests")',
      'Add fields to each section with the appropriate field type',
      'Link the template to Job Plans for automatic inclusion in work orders',
      'Technicians execute the checklist during WO completion on web or mobile',
    ],
    tips: [
      'Checklists are snapshotted when a WO is created — editing the template does not change already-issued checklists',
      'Use mandatory fields for critical safety and compliance checks',
      'Numeric fields can have min/max ranges for automatic pass/fail determination',
      'Photo fields are useful for before/after evidence on repair work',
    ],
  },
  fields: {
    fieldType:
      'YES_NO = simple toggle. PASS_FAIL = inspection result. NUMERIC = measured value (can have min/max range). TEXT = free-form notes. PHOTO = camera capture required. SIGNATURE = sign-off. DROPDOWN = pick from predefined options. DATE_TIME = timestamp. BARCODE_SCAN = scan verification. RISK_RATING = risk assessment score.',
  },
};

import type { ScreenHelp } from './types';

export const executeChecklistHelp: ScreenHelp = {
  page: {
    title: 'Execute Checklist',
    description:
      'Complete the inspection or task checklist attached to this Work Order. Each section contains fields that must be filled — Yes/No checks, Pass/Fail inspections, numeric measurements, photos, signatures, and more.',
    steps: [
      'Work through each section in order',
      'Fill all mandatory fields (marked with *)',
      'For numeric fields, enter the measured value — out-of-range values are flagged automatically',
      'Capture photos where required using the camera button',
      'Submit when all sections are complete',
    ],
    tips: [
      'The checklist was snapshotted when the WO was created — template changes do not affect this WO',
      'Out-of-range numeric readings are flagged but do not block submission — add notes to explain',
      'Photos serve as evidence — capture clear images of the inspected area',
      'Completion percentage is tracked and shown on the Work Order detail',
    ],
  },
};

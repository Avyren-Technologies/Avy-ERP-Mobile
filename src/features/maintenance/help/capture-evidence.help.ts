import type { ScreenHelp } from './types';

export const captureEvidenceHelp: ScreenHelp = {
  page: {
    title: 'Capture Evidence',
    description:
      'Attach photographic or document evidence to this Work Order. Evidence supports closure quality, audit trails, and compliance requirements.',
    steps: [
      'Use the camera to take a photo or select from gallery',
      'Add a description for the evidence',
      'Submit to attach to the Work Order',
    ],
    tips: [
      'Before-and-after photos are best practice for maintenance evidence',
      'Some Job Plans require photo evidence before the WO can be closed',
      'Evidence is permanent — once attached, it becomes part of the maintenance history',
    ],
  },
};

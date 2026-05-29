import type { ScreenHelp } from './types';

export const shutdownListHelp: ScreenHelp = {
  page: {
    title: 'Shutdown Planning',
    description:
      'Shutdown and turnaround event planning for major maintenance windows. Shutdowns coordinate multiple work orders that must be executed during planned downtime, ensuring efficient use of limited maintenance windows.',
    prerequisites: [
      'Shutdown Planning enabled in Maintenance Config → Feature Toggles',
    ],
    steps: [
      'View all shutdown events by status — Draft, Approved, In Progress, Completed, or Cancelled',
      'Click "+ New Shutdown" to create a new shutdown event',
      'Click any row to view full event detail, linked work orders, and progress tracking',
    ],
    tips: [
      'Shutdowns group related WOs that need the plant or line to be stopped — plan all dependent work together',
      'Plan well ahead — Lead Days on linked PMs should align with the shutdown window so WOs are auto-generated in time',
    ],
  },
  fields: {
    eventType:
      'PLANNED_OVERHAUL = scheduled major maintenance. STATUTORY_INSPECTION = legally required inspection window. CORRECTIVE_MAJOR = large repair requiring full shutdown. COMMISSIONING = new equipment installation or startup.',
  },
};

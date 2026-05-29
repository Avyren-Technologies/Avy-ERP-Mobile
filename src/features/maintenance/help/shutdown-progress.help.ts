import type { ScreenHelp } from './types';

export const shutdownProgressHelp: ScreenHelp = {
  page: {
    title: 'Shutdown Progress',
    description:
      'Real-time progress tracking for an active shutdown event. Shows completion percentage, WO status breakdown, and timeline adherence so you can manage the shutdown window effectively.',
    steps: [
      'Monitor the progress bar and WO completion statistics for an at-a-glance status',
      'Identify blocked or delayed WOs that may be holding up overall progress',
      'Update individual WO statuses as work completes on the ground',
      'Mark the shutdown as complete when all linked WOs are done',
    ],
    tips: [
      'A shutdown is auto-marked complete when all linked WOs reach CLOSED status',
      'Any WO stuck in ON_HOLD blocks overall progress — resolve holds promptly to keep the shutdown on track',
    ],
  },
};

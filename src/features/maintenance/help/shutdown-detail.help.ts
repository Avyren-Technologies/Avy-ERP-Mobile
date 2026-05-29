import type { ScreenHelp } from './types';

export const shutdownDetailHelp: ScreenHelp = {
  page: {
    title: 'Shutdown Detail',
    description:
      'Full shutdown event detail showing linked work orders, resource allocation, timeline, and overall progress. Provides a single view to manage all maintenance activities within the shutdown window.',
    steps: [
      'Review the event configuration including type, planned dates, and affected areas',
      'Check linked WOs and their sequencing to understand task dependencies',
      'Monitor the progress percentage as work orders are completed',
      'Update the shutdown status as it moves through Draft → Approved → In Progress → Completed',
    ],
    tips: [
      'WO sequencing ensures dependencies are respected — e.g., isolate before inspect, inspect before repair',
      'Track progress % to communicate real-time status to production planning and management',
    ],
  },
};

import type { ScreenHelp } from './types';

export const downtimeHistoryHelp: ScreenHelp = {
  page: {
    title: 'Downtime History',
    description:
      'Complete downtime history showing all recorded downtime events with duration, cause category, and linked work orders. This data feeds the OEE (Overall Equipment Effectiveness) Availability metric and provides insight into equipment reliability trends.',
    steps: [
      'Filter by date range, asset, or downtime category to narrow the view',
      'Review the Active Downtime tab to see ongoing downtime events that have not yet been resolved',
      'Switch to the OEE Feed tab to see how downtime records are translated into availability calculations',
      'Click any downtime record to view full details including linked Work Order and resolution notes',
      'Export downtime data for offline analysis or reporting',
    ],
    tips: [
      'Downtime categories drive different reporting — Unplanned downtime directly impacts the OEE Availability factor while Planned downtime is excluded',
      'High Unplanned downtime on a specific asset signals the need for better preventive maintenance coverage or asset replacement',
      'External downtime (power outages, supply chain delays) should be tracked separately to avoid skewing equipment reliability metrics',
      'Use the date range filter to compare periods and identify improving or deteriorating trends',
      'No Fault Found events may indicate intermittent issues — track these to identify patterns that emerge over time',
    ],
  },
  fields: {
    category:
      'PLANNED = scheduled shutdown or maintenance window. UNPLANNED = unexpected failure or breakdown. EXTERNAL = power outage, supply chain disruption, weather event. OPERATOR_ERROR = human error during operation. NO_FAULT_FOUND = investigation completed but no root cause identified.',
  },
};

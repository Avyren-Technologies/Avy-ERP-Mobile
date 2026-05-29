import type { ScreenHelp } from './types';

export const analyticsHelp: ScreenHelp = {
  page: {
    title: 'Maintenance Analytics',
    description:
      'Maintenance analytics with live charts showing asset availability trends, cost breakdown, planned vs unplanned maintenance ratio, and key performance indicators (MTBF, MTTR).',
    steps: [
      'Review the availability trend chart to track asset uptime over time',
      'Compare planned vs unplanned maintenance ratios to assess PM effectiveness',
      'Analyze cost distribution across labour, parts, and vendor categories',
      'Check KPI cards for MTBF (Mean Time Between Failures) and MTTR (Mean Time To Repair)',
    ],
    tips: [
      'Target availability above 90% for production assets — below this indicates excessive downtime',
      'A high unplanned-to-planned ratio indicates insufficient PM coverage — review your PM Schedules',
      'Declining MTBF signals increasing unreliability — investigate the specific assets driving the trend',
      'Use the time range filter to compare month-over-month or quarter-over-quarter improvements',
    ],
  },
};

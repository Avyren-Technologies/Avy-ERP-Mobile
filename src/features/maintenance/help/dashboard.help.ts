import type { ScreenHelp } from './types';

export const dashboardHelp: ScreenHelp = {
  page: {
    title: 'Maintenance Dashboard',
    description:
      'Real-time overview of your maintenance operations. Shows key metrics including open work orders, overdue PMs, active breakdowns, asset availability, and cost trends. The dashboard adapts based on your role — managers see strategic KPIs, technicians see their assigned work, planners see scheduling health.',
    prerequisites: [
      'At least one asset registered in the Asset Register',
      'Work Orders or PM Schedules created to populate metrics',
      'Maintenance Config saved (Settings → Maintenance Config) for SLA thresholds',
    ],
    steps: [
      'Review the top stat cards for quick health check — Open WOs, Overdue PMs, Active Breakdowns, Asset Availability %',
      'Check the "Recent Work Orders" table for latest activity',
      'Click any Work Order row to view its full details',
      'Use the time range filter (if available) to compare periods',
      'Navigate to specific areas via sidebar for deeper analysis',
    ],
    tips: [
      'A high number of overdue PMs indicates scheduling capacity issues — check PM Schedules for workload balancing',
      'Asset Availability below 85% typically signals excessive unplanned downtime — review Breakdowns list',
      'The dashboard refreshes automatically — no need to manually reload',
      'Cost trends help identify assets that may be candidates for replacement (Repair vs Replace threshold)',
    ],
  },
};

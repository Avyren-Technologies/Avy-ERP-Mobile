import type { ScreenHelp } from './types';

export const pmScheduleListHelp: ScreenHelp = {
  page: {
    title: 'PM Schedules',
    description:
      'All preventive maintenance schedules across your assets. Each PM schedule defines when and how an asset should receive scheduled maintenance based on a strategy — Calendar (time-based intervals), Meter (usage-based thresholds), Condition (sensor triggers), Seasonal (specific times of year), Statutory (legal compliance), or Dual (calendar + meter, whichever triggers first).',
    prerequisites: [
      'Assets registered in the Asset Register',
      'Maintenance Strategies configured (optional — defaults are available)',
      'Job Plans created (optional — can be linked later)',
    ],
    steps: [
      'View all PM schedules in the list — each row shows asset, strategy type, frequency, next due date, and status',
      'Filter by strategy type (Calendar, Meter, Seasonal, Statutory, Dual) to focus on specific PM categories',
      'Check the Overdue column to identify PMs that have passed their due date plus grace period',
      'Click "+ New PM" to create a new preventive maintenance schedule',
      'Click any row to view the full PM schedule detail, history, and linked work orders',
    ],
    tips: [
      'Overdue PMs are flagged automatically — address them promptly to prevent unplanned breakdowns',
      'The PM cron job auto-generates Work Orders based on each schedule\'s configuration — no manual WO creation needed',
      'Lead Days controls how many days before the due date the Work Order is created, giving planners time to organize resources',
      'Use the calendar view (PM Calendar) to visualize scheduling conflicts and balance technician workload across dates',
    ],
  },
};

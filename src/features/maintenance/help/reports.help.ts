import type { ScreenHelp } from './types';

export const reportsHelp: ScreenHelp = {
  page: {
    title: 'Maintenance Reports',
    description:
      'Generate and export maintenance reports across three categories: Operational (PM Due, Open Breakdowns, Technician Workload), Management (Availability, Cost, Repair vs Replace), and Compliance (Calibration Due, Statutory, PTW Compliance).',
    steps: [
      'Select a report category tab — Operational, Management, or Compliance',
      'Choose a specific report from the available options',
      'Set the date range and any additional filters (location, asset class, technician)',
      'Click "Generate" to build the report',
      'Review the results on-screen, then click "Export CSV" to download',
    ],
    tips: [
      'Reports query live data — no separate data warehouse or ETL needed',
      'The 18 available reports cover all standard maintenance management KPIs',
      'Use Compliance reports (Calibration Due, Statutory, PTW) for audit preparation',
      'Schedule recurring report generation for management review meetings',
    ],
  },
};

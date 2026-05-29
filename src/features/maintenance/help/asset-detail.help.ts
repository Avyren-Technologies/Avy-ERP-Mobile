import type { ScreenHelp } from './types';

export const assetDetailHelp: ScreenHelp = {
  page: {
    title: 'Asset Detail',
    description:
      'Complete view of a single asset including its identity, classification, technical specifications, maintenance history, meter readings, cost summary, and linked records (work orders, PM schedules, contracts). This is the "single source of truth" for the asset.',
    steps: [
      'Review the header for asset name, number, status badges (Operational + Maintenance status)',
      'Check the Overview tab for identity, classification, location, and technical details',
      'Switch to Meters tab to view or log counter/meter readings (runtime hours, mileage, cycles)',
      'Check History tab for all past work orders and maintenance events',
      'View Cost tab for accumulated labour, parts, and vendor costs',
      'Use action buttons to create Work Requests or Work Orders directly for this asset',
    ],
    tips: [
      'Dual status model: Operational Status (Running/Idle/Breakdown) shows production state; Maintenance Status (PM Due/In Progress/Waiting Parts) shows maintenance state',
      'Meter readings drive meter-based PM schedules — keep them updated for accurate PM triggering',
      'Cost rollup shows total maintenance spend — compare against Replacement Value for Repair vs Replace decisions',
      'The hierarchy section shows parent-child relationships — child breakdowns can cascade status to parent',
    ],
  },
};

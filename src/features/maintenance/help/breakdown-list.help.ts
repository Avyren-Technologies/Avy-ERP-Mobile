import type { ScreenHelp } from './types';

export const breakdownListHelp: ScreenHelp = {
  page: {
    title: 'Breakdowns',
    description:
      'All logged breakdowns with their associated work orders and downtime records. Breakdowns are unplanned equipment failures that require immediate response. This screen tracks active incidents, historical breakdowns, and flags recurring failure patterns for root cause investigation.',
    steps: [
      'View active and historical breakdowns in the main list — each row shows asset, failure description, priority, status, and downtime duration',
      'Filter by status (Active, Resolved), priority (Emergency, High, Medium, Low), or date range to narrow results',
      'Click any breakdown row to view the linked Breakdown Work Order with full repair details',
      'Switch to the Recurring Failures tab to see assets with repeated breakdowns flagged for investigation',
      'Use the "+ Log Breakdown" button for instant breakdown reporting',
    ],
    tips: [
      'Recurring failures (same asset, same failure mode, 3+ times in 30 days by default) are automatically flagged for root cause investigation',
      'The Recurring Failures tab highlights problem assets that may need deeper analysis or capital replacement',
      'Emergency priority breakdowns indicate production line stoppage — these should be addressed immediately',
      'Each breakdown automatically creates a BREAKDOWN type Work Order and starts downtime tracking — no separate steps needed',
      'Review breakdown trends over time to identify systemic issues — a rising breakdown count may indicate aging assets or inadequate PM coverage',
    ],
  },
};

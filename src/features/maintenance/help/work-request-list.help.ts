import type { ScreenHelp } from './types';

export const workRequestListHelp: ScreenHelp = {
  page: {
    title: 'Work Requests',
    description:
      'Lists all maintenance work requests across your organization. Work Requests are the entry point for reporting any maintenance need — breakdowns, planned service, inspections, replacements, or safety issues. Anyone can raise a WR; it gets triaged by a planner, approved, and then converted into a Work Order for execution.',
    prerequisites: [
      'At least one asset registered in the Asset Register',
      'Number Series configured for "Work Request" (Company Admin → Number Series)',
    ],
    steps: [
      'Review the list of work requests sorted by most recent',
      'Use filters to narrow by Status, Priority, Request Type, or Asset',
      'Click any row to view full request details, triage notes, and conversion history',
      'Click "New Request" to raise a new maintenance work request',
      'Track the lifecycle: SUBMITTED → UNDER_REVIEW → APPROVED → CONVERTED (or REJECTED)',
    ],
    tips: [
      'Duplicate detection warns if open work requests already exist for the same asset — you can attach to an existing request instead of creating a new one',
      'Emergency requests can skip approval and auto-convert to a Work Order (post-event approval is still required)',
      'Requests on Retired assets are blocked — the asset must be active',
      'Requests on assets already in Breakdown status are allowed and linked to the active Work Order',
      'The happy path is SUBMITTED → UNDER_REVIEW (triage) → APPROVED → CONVERTED to Work Order',
    ],
  },
};

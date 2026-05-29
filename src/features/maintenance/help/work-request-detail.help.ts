import type { ScreenHelp } from './types';

export const workRequestDetailHelp: ScreenHelp = {
  page: {
    title: 'Work Request Details',
    description:
      'Full details of a maintenance work request including current status, priority, timeline, triage notes, and conversion history. From here, planners can triage, approve or reject, and convert approved requests into Work Orders.',
    steps: [
      'Review the current status, priority, and request details',
      'If status is SUBMITTED — Triage the request: assign a technical priority (may differ from the requester\'s priority) and add triage notes',
      'If status is UNDER_REVIEW — Approve to move forward, or Reject with a mandatory reason',
      'If status is APPROVED — Convert to Work Order, which auto-creates a linked WO with the request details pre-filled',
      'Check the timeline section to see all status changes with timestamps and who performed each action',
      'View the linked Work Order (if converted) to track execution progress',
    ],
    tips: [
      'Triage assigns a technical priority that may differ from the requester\'s original priority — this is normal and expected',
      'Rejection requires a reason that is visible to the requester — be specific so they understand why',
      'Converting to a Work Order auto-creates a WO linked to this request with asset, description, and priority pre-filled',
      'Emergency requests may have been auto-converted — check if a linked Work Order already exists',
      'The full audit trail shows every status transition with timestamps, making it easy to track response times',
    ],
  },
};

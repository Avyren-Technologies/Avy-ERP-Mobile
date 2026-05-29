import type { ScreenHelp } from './types';

export const workRequestCreateHelp: ScreenHelp = {
  page: {
    title: 'New Work Request',
    description:
      'Raise a new maintenance request for any asset — report a breakdown, request planned service, schedule an inspection, flag a replacement need, or report a safety issue. Work Requests are the formal starting point for all maintenance needs and route through triage and approval before becoming Work Orders.',
    prerequisites: [
      'At least one asset registered in the Asset Register',
    ],
    steps: [
      'Select the asset by searching by name, code, or scanning the QR tag',
      'Choose the Request Type that best describes the maintenance need',
      'Set the Priority level (the planner may override this during triage)',
      'Describe the issue clearly in the Description field (max 500 characters)',
      'Optionally add Location Detail for the specific sub-location within the asset area',
      'Toggle Safety Risk if the issue poses a risk to personnel safety',
      'Set a Requested By Date if there is a target completion deadline',
      'Attach photos if available — strongly recommended for breakdowns',
      'Submit the request — it routes to the maintenance planner for triage',
    ],
    tips: [
      'Photos significantly speed up triage — attach images of the fault whenever possible',
      'Safety-flagged requests get priority treatment and may trigger immediate escalation to management',
      'Emergency priority requests can auto-convert to a Work Order, skipping the approval step',
      'If a similar open request already exists for the same asset, you will be prompted to attach to it rather than creating a duplicate',
    ],
  },
  fields: {
    requestType:
      'The category of maintenance need. BREAKDOWN = unplanned failure requiring urgent response. PLANNED_SERVICE = scheduled or anticipated work. INSPECTION = routine check or assessment. REPLACEMENT = part or asset needs replacing. SAFETY = safety-related issue requiring immediate attention.',
    safetyRisk:
      'Flag if this issue poses a risk to personnel safety. Safety-flagged requests get priority treatment and may trigger immediate escalation to the maintenance manager.',
    locationDetail:
      'Specific physical location within the asset area (e.g., "Near motor coupling, Section B"). Helps technicians locate the issue quickly without searching.',
    requestedByDate:
      'Target date by which the maintenance should be completed. Used for planning, scheduling priority, and SLA tracking. The planner uses this when sequencing work.',
  },
};

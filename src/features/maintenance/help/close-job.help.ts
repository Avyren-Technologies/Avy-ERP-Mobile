import type { ScreenHelp } from './types';

export const closeJobHelp: ScreenHelp = {
  page: {
    title: 'Complete & Close Job',
    description:
      'Finalize a Work Order by recording findings, root cause, corrective action, and closure reason. This screen completes the WO (if still in progress) and then closes it in one flow.',
    prerequisites: [
      'Work Order must be in IN_PROGRESS, ACKNOWLEDGED, ON_HOLD, or COMPLETED status',
    ],
    steps: [
      'Review the Closure Summary (labour hours, parts cost, total cost)',
      'Select Root Cause Code and Action Taken from the dropdowns (configured in Failure Codes)',
      'Enter job observations and any recommendations for future maintenance',
      'Enter the closure reason (required)',
      'Click "Complete & Close" to finalize',
    ],
    tips: [
      'Closure reason is appended to the WO observations as an audit trail entry',
      'Root cause and action codes feed into recurring failure analysis',
      'If the WO is already COMPLETED, this screen only performs the Close step',
      'All cost fields are read-only — they come from logged Parts and Labour',
    ],
  },
  fields: {
    rootCauseCode:
      'The identified root cause of the issue from the configured Failure Code hierarchy. Enables trend analysis and recurring failure detection.',
    actionTakenCode:
      'The corrective action performed, from the configured Action Codes. Standardizes repair documentation across technicians.',
    closureReason:
      'Why this Work Order is being closed. This is mandatory and becomes part of the permanent audit trail. Be specific — e.g., "Bearing replaced, alignment verified, test run successful."',
  },
};

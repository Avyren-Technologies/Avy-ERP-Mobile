import type { ScreenHelp } from './types';

export const ptwDetailHelp: ScreenHelp = {
  page: {
    title: 'Permit Detail',
    description:
      'Complete permit details including safety requirements, approvals, linked work order, and status history. Shows the full PTW lifecycle from request through closure.',
    steps: [
      'Review the permit class and its specific safety requirements',
      'Check the approval chain to see who has authorized (or needs to authorize) the permit',
      'Verify the linked Work Order that requires this permit',
      'Ensure the permit status is ACTIVE before any work begins on the linked WO',
      'Close the permit after work completion to release the safety authorization',
    ],
    tips: [
      'The PTW lifecycle is: REQUESTED → UNDER_REVIEW → ISSUED → ACTIVE → CLOSED',
      'Permits have a validity period — they auto-expire if not closed before the expiry time',
      'Revoked permits require a new permit application — the original cannot be reactivated',
    ],
  },
};

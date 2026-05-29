import type { ScreenHelp } from './types';

export const workOrderListHelp: ScreenHelp = {
  page: {
    title: 'Work Orders',
    description:
      'All maintenance work orders with real-time status tracking. Work Orders are the primary execution documents — they link asset, technician, spare parts, checklist, downtime, cost, and closure evidence. Every maintenance activity that changes an asset\'s condition is documented here.',
    prerequisites: [
      'At least one asset registered in the Asset Register',
      'Number Series configured for "Work Order" (Company Admin → Number Series)',
    ],
    steps: [
      'Review the list of work orders sorted by most recent',
      'Use filters to narrow by Status, Priority, WO Type, Asset, or Assigned Technician',
      'Use quick action buttons (Approve, Assign, Start, Complete, Close) for rapid status transitions',
      'Click any row to view full work order details with all tabs',
      'Switch to Board View for a Kanban-style visual overview by status columns',
      'Click "New Work Order" to create one manually (WOs are also auto-created from WR conversion and PM generation)',
    ],
    tips: [
      'The state machine enforces a strict lifecycle: DRAFT → APPROVED → ASSIGNED → ACKNOWLEDGED → IN_PROGRESS → COMPLETED → CLOSED — steps cannot be skipped',
      'On Hold pauses the labour timer but downtime continues unless the asset is restored',
      'A WO cannot start if a mandatory Permit-to-Work is not yet issued (held as Waiting PTW)',
      'A WO cannot start if mandatory spare parts are unavailable unless overridden by a manager (logged)',
      'Completing a WO with incomplete mandatory checklist sections is blocked — all required items must be filled',
      'Cancel is only permitted before work starts and requires a mandatory reason',
    ],
  },
};

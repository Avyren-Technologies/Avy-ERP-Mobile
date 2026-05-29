import type { ScreenHelp } from './types';

export const workOrderBoardHelp: ScreenHelp = {
  page: {
    title: 'Work Order Board',
    description:
      'Kanban-style board view of work orders organized by status columns. Provides a visual overview of work distribution across the entire maintenance lifecycle — from Draft through to Closed — so managers and planners can spot bottlenecks at a glance.',
    steps: [
      'Scan columns left-to-right to see workflow progression: Draft → Approved → Assigned → In Progress → On Hold → Completed → Closed',
      'Click any card to open the full Work Order details view',
      'Use filters to focus on a specific asset, WO type, priority, or assigned technician',
      'Monitor column heights to identify where work is accumulating',
      'Switch back to List View for detailed filtering and bulk actions',
    ],
    tips: [
      'Heavy accumulation in the ON_HOLD column indicates blocking issues — check hold reasons (parts, vendor, PTW, shutdown)',
      'Many items stuck in DRAFT suggests an approval bottleneck — review the approval workflow',
      'A growing ASSIGNED column with few IN_PROGRESS items may indicate technician capacity issues or acknowledgement delays',
      'Cards in the WAITING_PARTS state highlight supply chain issues — coordinate with the store/procurement team',
      'The board view is ideal for daily maintenance stand-up meetings to review workflow health',
      'Use priority color coding to quickly identify Emergency and High priority items that need immediate attention',
    ],
  },
};

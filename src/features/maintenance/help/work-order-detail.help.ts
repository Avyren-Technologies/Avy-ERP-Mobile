import type { ScreenHelp } from './types';

export const workOrderDetailHelp: ScreenHelp = {
  page: {
    title: 'Work Order Details',
    description:
      'Complete work order view with tabs for Overview, Checklist, Parts, Labour, Evidence, Cost, and History. This is where the full lifecycle of a work order is managed — from approval through execution to closure.',
    steps: [
      'Review the current status and available action buttons at the top',
      'Use lifecycle buttons to advance the WO: Approve → Assign → Acknowledge → Start → Complete → Close',
      'Switch to the Checklist tab to view and complete inspection items and task responses',
      'Use the Parts tab to record spare parts consumed (linked to WHM if active)',
      'Use the Labour tab to log technician hours and labour costs',
      'Upload photos, documents, and closure evidence in the Evidence tab',
      'Review the Cost tab for auto-calculated totals from Parts + Labour + Vendor charges',
      'Check the History tab for every status change with timestamps and who performed each action',
    ],
    tips: [
      'The Overview tab shows scheduling dates (planned vs actual), asset info, job description, and assignment details',
      'The Cost tab auto-calculates total maintenance cost from Parts Used + Labour Hours + Vendor Service Cost',
      'The History tab provides a complete audit trail — every status transition, assignment change, and hold/resume with timestamps',
      'On Hold pauses the labour timer but downtime continues counting unless the hold reason indicates the asset is restored',
      'Completing a WO with incomplete mandatory checklist sections is blocked — finish all required items first',
      'Reopening a Closed WO requires manager permission, a reason code, and creates an audit entry',
      'If a PTW is required, the WO cannot start until the permit is issued',
    ],
  },
  fields: {
    holdReason:
      'Why this work order is paused. WAITING_PARTS = spare parts not available, pending procurement or store issue. WAITING_VENDOR = external vendor service pending, awaiting vendor visit or response. WAITING_SHUTDOWN = work requires a planned shutdown window that has not yet started. WAITING_PTW = Permit-to-Work not yet issued by the safety team. WAITING_QA = quality release pending from the QA team before work can proceed.',
  },
};

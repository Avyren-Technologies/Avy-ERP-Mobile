import type { ScreenHelp } from './types';

export const breakdownLogHelp: ScreenHelp = {
  page: {
    title: 'Log Breakdown',
    description:
      'Instant breakdown logging — the fastest way to report an equipment failure. Select the asset, describe the failure, set the priority, and submit. The system automatically creates a Breakdown Work Order, sets the asset to Breakdown operational status, and starts tracking downtime.',
    prerequisites: [
      'At least one asset registered in the Asset Register',
    ],
    steps: [
      'Search and select the failed asset from the asset picker',
      'Describe what happened — include symptoms, location, and any error codes if available',
      'Select the priority level (Emergency for production line stoppage, High for significant impact)',
      'Toggle Safety Risk if the breakdown creates a hazard to personnel',
      'Click "Log Breakdown Now" to submit',
    ],
    tips: [
      'Logging a breakdown instantly sets the asset to Breakdown operational status — no manual status change needed',
      'Downtime tracking starts automatically from the moment the breakdown is logged',
      'The system auto-creates a BREAKDOWN type Work Order linked to this incident',
      'Be as specific as possible in the failure description — this helps technicians diagnose the issue faster',
      'Safety-flagged breakdowns are auto-escalated and may require a Permit-to-Work before repair can begin',
    ],
  },
  fields: {
    priority:
      'Emergency = production line stopped, immediate response required. High = significant impact, respond within SLA. Medium = degraded performance but still operational. Low = minor issue, schedule repair at next available slot.',
    safetyRisk:
      'Enable if the breakdown creates a hazard to personnel (e.g., electrical fault, chemical leak, structural failure). Safety-flagged breakdowns are auto-escalated and may require a Permit-to-Work before repair.',
  },
};

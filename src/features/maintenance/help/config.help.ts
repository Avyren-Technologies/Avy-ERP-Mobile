import type { ScreenHelp } from './types';

export const configHelp: ScreenHelp = {
  page: {
    title: 'Maintenance Configuration',
    description:
      'Global maintenance configuration controlling SLA timelines, escalation rules, breakdown detection, feature toggles, and industry profile. These settings apply to all maintenance operations company-wide.',
    prerequisites: [
      'Company Admin access with maintenance:configure permission',
    ],
    steps: [
      'Review each configuration section — SLA Timelines, Escalation Rules, Breakdown Detection, Feature Toggles, and Industry Profile',
      'Adjust values as needed for your operational requirements',
      'Enable or disable feature toggles based on your industry and compliance needs',
      'Click "Save Configuration" to apply changes company-wide',
    ],
    tips: [
      'Start with the industry profile — it pre-fills sensible defaults for your sector',
      'Feature toggles like PTW and QA Release are mandatory for regulated industries (chemical, pharma, food & beverage)',
      'Changes take effect immediately for all new work orders — existing WOs retain their original settings',
    ],
  },
  fields: {
    defaultLeadDays:
      'Days before a PM due date that the Work Order is auto-generated. Gives planners time to organize resources. Default: 7. Critical assets may need 14+ days.',
    defaultGracePeriodDays:
      'Days after PM due date before it is flagged as overdue. Provides minor scheduling flexibility. Default: 3. Set to 0 for statutory PMs.',
    nonWorkingDayRule:
      'What happens when a PM falls on a non-working day. MOVE_EARLIER = schedule before the holiday. MOVE_LATER = schedule after. KEEP_DATE = schedule as-is (for 24/7 operations).',
    autoAssignRule:
      'How WOs are auto-assigned to technicians. PRIMARY_TECHNICIAN = always assign to the asset primary tech. ROUND_ROBIN = rotate among available techs. SKILL_BASED = match required skills to tech capabilities.',
    bottleneckAlertMinutes:
      'Minutes after a bottleneck asset breakdown before escalation alert fires. Default: 2 minutes. Set very low for production-critical assets.',
    repeatFailureThreshold:
      'Number of failures on the same asset within the window period that triggers a "Recurring Failure" flag. Default: 3 failures.',
    repeatFailureWindowDays:
      'The lookback period for repeat failure detection. Default: 30 days. If an asset fails 3+ times in 30 days, it is flagged for root cause investigation.',
    repairVsReplacePercent:
      'When accumulated maintenance cost exceeds this percentage of replacement value, the asset is flagged for replacement review. Default: 80%.',
    ptwEnabled:
      'Enable the Permit-to-Work safety gate. When on, work orders on assets marked "Permit Required" cannot start without an active PTW. Required for chemical, steel, foundry industries.',
    shutdownPlanningEnabled:
      'Enable the Shutdown/Turnaround planning module for coordinating major maintenance windows with production schedules.',
    qrTaggingEnabled:
      'Enable QR/NFC tag management for scan-to-view and scan-to-raise workflows on the mobile app.',
    qaReleaseEnabled:
      'Enable QA Release step in the work order lifecycle. When on, completed WOs go to AWAITING_QA before they can be closed. Required for pharma and regulated industries.',
    sanitationEnabled:
      'Enable sanitation/hygiene restart checks. Required for food & beverage industry where cleaning verification is mandatory before production restart.',
    calibrationBlockEnabled:
      'Enable calibration blocking. When on, assets with expired or failed calibration cannot have work orders started until calibration is current. Required for labs and precision equipment.',
  },
};

import type { ScreenHelp } from './types';

export const workOrderCreateHelp: ScreenHelp = {
  page: {
    title: 'New Work Order',
    description:
      'Create a new maintenance work order manually. Work Orders can also be auto-created from Work Request conversion or Preventive Maintenance schedule generation. The WO is the central execution record linking asset, people, parts, downtime, checklist, cost, and closure evidence.',
    prerequisites: [
      'At least one asset registered in the Asset Register',
      'Number Series configured for "Work Order" (Company Admin → Number Series)',
      'Optionally: Job Plans configured in the Job Plan Library for template-based creation',
    ],
    steps: [
      'Select the asset this work order is for',
      'Choose the WO Type that matches the maintenance activity',
      'Set the Priority level — this drives SLA escalation timelines',
      'Optionally select a Job Plan to auto-fill checklist, spare kit, estimated hours, and required skills',
      'Set Planned Start and Planned End dates for scheduling',
      'Enter Estimated Hours for capacity planning',
      'Assign a Lead Technician (or leave for auto-assignment based on config)',
      'Add any additional notes, safety requirements, or special instructions',
      'Save as Draft — the WO enters the approval workflow',
    ],
    tips: [
      'Selecting a Job Plan saves significant time by pre-filling the checklist template, spare parts kit, estimated duration, and required skills',
      'Priority drives SLA escalation: EMERGENCY = immediate response, HIGH = 2 hr acknowledgement SLA (default), MEDIUM = standard queue, LOW = schedule when convenient',
      'Auto-assignment rules (Primary Technician, Round Robin, or Skill Based) are configured in Maintenance Config',
      'For breakdown WOs, set priority to EMERGENCY or HIGH to trigger faster escalation',
    ],
  },
  fields: {
    woType:
      'Type of maintenance work. CORRECTIVE = fix after a defect or degraded condition is found. PREVENTIVE (PM) = scheduled preventive work from a PM schedule. BREAKDOWN = emergency repair after an unplanned failure. INSPECTION = routine inspection or assessment. CALIBRATION = instrument calibration work. OVERHAUL = major rebuild or refurbishment during a shutdown.',
    priority:
      'Urgency level that drives SLA escalation timelines. EMERGENCY = immediate response required, auto-escalates if not acknowledged. HIGH = within SLA (default 2 hr acknowledgement). MEDIUM = standard queue, planned scheduling. LOW = schedule when convenient, no urgent escalation.',
    jobPlan:
      'A reusable template from the Job Plan Library containing predefined tasks, required skills, special tools, spare parts kit, safety notes, and a checklist template. Selecting a Job Plan auto-links its checklist and pre-fills estimated hours and required skills.',
    estimatedHours:
      'Planned time to complete this work order in hours. Used for technician capacity planning, workload balancing, and actual-vs-estimated analysis on completion. The Job Plan provides a default if selected.',
    leadTechnicianId:
      'Primary technician assigned to execute this work order. Can be manually selected or auto-assigned by the system based on the configured rule (Primary Technician from asset master, Round Robin across the team, or Skill Based matching required skills to technician certifications).',
  },
};

import type { ScreenHelp } from './types';

export const logLabourHelp: ScreenHelp = {
  page: {
    title: 'Log Labour',
    description:
      'Record technician time spent on this Work Order. Labour logs track who worked, when, and for how long. Labour cost contributes to the total WO cost.',
    steps: [
      'Select the technician (or enter their ID)',
      'Enter start time and end time (or just total hours)',
      'Optionally enter hourly rate for cost calculation',
      'Add notes about the work performed',
      'Submit to record the labour entry',
    ],
    tips: [
      'Multiple labour entries can be logged per WO (different technicians or multiple sessions)',
      'If hourly rate is not entered, labour cost defaults to the company standard rate',
      'Labour time is used for MTTR (Mean Time To Repair) calculations in reliability analytics',
    ],
  },
  fields: {
    hourlyRate:
      'Cost per hour for this technician. If left blank, the system uses the default company rate. Used to calculate labour cost = hours x rate.',
    hours:
      'Total hours worked. Either enter this directly or let it auto-calculate from start/end times.',
  },
};

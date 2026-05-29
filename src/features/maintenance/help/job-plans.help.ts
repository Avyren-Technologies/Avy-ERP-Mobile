import type { ScreenHelp } from './types';

export const jobPlansHelp: ScreenHelp = {
  page: {
    title: 'Job Plans',
    description:
      'Reusable job plan templates that define the standard procedure for a type of maintenance work. A job plan includes required skills, estimated time, tools, spare parts, safety notes, and an optional checklist template.',
    steps: [
      'View existing job plans in the list',
      'Click "+ Add Job Plan" to create a new plan',
      'Define the required skills, estimated hours, tools, and spare parts',
      'Link a Checklist Template for step-by-step inspection or task forms',
      'Reference the job plan in PM Schedules or Work Orders to auto-fill details',
    ],
    tips: [
      'Job Plans save time by standardizing repetitive work across your team',
      'When selected during WO creation, the plan auto-fills estimated hours, required skills, and links the checklist',
      'Well-defined plans improve consistency across technicians and reduce rework',
      'Include safety notes for hazardous tasks — these display prominently to technicians on mobile',
    ],
  },
};

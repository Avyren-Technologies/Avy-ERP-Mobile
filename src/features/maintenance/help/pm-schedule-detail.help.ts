import type { ScreenHelp } from './types';

export const pmScheduleDetailHelp: ScreenHelp = {
  page: {
    title: 'PM Schedule Detail',
    description:
      'Full detail of a preventive maintenance schedule showing its configuration, next due date, last completion date, linked work orders, and reschedule history. Use this screen to monitor schedule health, review generated WOs, and reschedule when necessary.',
    steps: [
      'Review the schedule configuration — strategy type, frequency, schedule type (Fixed/Floating), and trigger parameters',
      'Check the Next Due Date to see when the next Work Order will be generated',
      'View the Last Completed Date to understand the current cycle position',
      'Browse the history of generated Work Orders and their completion status',
      'If rescheduling is needed, use the Reschedule action and provide a reason',
    ],
    tips: [
      'For FLOATING schedules, the Last Completed Date drives the next due calculation — completing a WO late pushes the next due date forward',
      'For FIXED schedules, the next due date is always calculated from the original planned date regardless of when the last WO was completed',
      'Reschedule always records who made the change, when, and why — maintaining a full audit trail',
      'If a PM is consistently completed late, consider increasing the frequency interval or adding more technician capacity',
      'Check the linked Work Orders section to spot patterns — repeated deferrals may indicate a scheduling or resource issue',
    ],
  },
};

import type { ScreenHelp } from './types';

export const pmCalendarHelp: ScreenHelp = {
  page: {
    title: 'PM Calendar',
    description:
      'Calendar view showing all PM due dates across assets. Visualize the maintenance workload by month to identify scheduling conflicts, capacity issues, and workload distribution. Each date cell shows the PMs due that day, color-coded by status.',
    steps: [
      'Navigate months using the previous/next arrows to explore upcoming and past PM schedules',
      'Click a date cell to see all PMs due on that day with asset details and strategy type',
      'Look for date clusters where multiple PMs fall on the same day — these indicate potential scheduling conflicts',
      'Use the list view link to switch to a tabular format for filtering and sorting',
      'Use filters to narrow the calendar to specific assets, strategy types, or priority levels',
    ],
    tips: [
      'Heavy clusters of PMs on the same day indicate scheduling conflicts — spread PMs across different days to balance technician workload',
      'Overdue PMs are highlighted differently from upcoming ones — address overdue items first',
      'The calendar reflects Lead Days — Work Orders appear on the date they are generated, not the actual due date',
      'Use the calendar to plan shutdown windows by identifying periods with fewer scheduled PMs',
      'Seasonal and Statutory PMs create predictable peaks — plan technician availability around these periods',
    ],
  },
};

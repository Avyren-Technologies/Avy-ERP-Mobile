import type { ScreenHelp } from './types';

export const pmScheduleCreateHelp: ScreenHelp = {
  page: {
    title: 'Create PM Schedule',
    description:
      'Create a preventive maintenance schedule for an asset. Choose the strategy type and configure the trigger parameters — the system automatically calculates when Work Orders should be generated based on calendar intervals, meter readings, seasonal windows, or statutory deadlines.',
    prerequisites: [
      'At least one asset registered in the Asset Register',
      'For Meter-based PMs: asset must have a meter type configured (Runtime Hours, Mileage, Cycles, or Production Count)',
    ],
    steps: [
      'Select the target asset from the asset picker',
      'Choose a Strategy Type (Calendar, Meter, Seasonal, Statutory, or Dual)',
      'Configure the frequency or threshold parameters based on your chosen strategy',
      'Set Schedule Type (Fixed or Floating) to control how the next due date is calculated',
      'Configure Lead Days and Grace Period to fine-tune Work Order generation timing',
      'Optionally enable Auto Assign to have generated Work Orders automatically assigned to a technician',
      'Link a Job Plan (optional) to pre-populate the Work Order with tasks, parts, and estimated labour',
      'Review and save the PM schedule',
    ],
    tips: [
      'FLOATING schedules are more common — they adapt to actual execution timing and prevent schedule drift',
      'FIXED schedules maintain a strict rhythm regardless of completion date — best for regulatory or statutory PMs',
      'For Dual strategy, the PM triggers on whichever condition is reached first (calendar OR meter), preventing both time-decay and usage-wear from being missed',
      'Statutory PMs should have 0 Grace Period Days since legal compliance dates cannot be rescheduled',
      'Start with a 7-day Lead Time for standard assets — increase for critical assets that need more planning lead time',
    ],
  },
  fields: {
    strategyType:
      'The PM trigger method. CALENDAR = time-based intervals (every 30 days, monthly, quarterly). METER = usage-based (every 500 runtime hours, 10,000 km). SEASONAL = specific time of year (monsoon prep, winter checks). STATUTORY = legal compliance dates that cannot be rescheduled. DUAL = both calendar AND meter, whichever triggers first.',
    frequencyValue:
      'The interval number for calendar-based PMs. Combined with Frequency Unit (Days/Weeks/Months/Years) to define the cycle. Example: value=3, unit=MONTHS means every 3 months.',
    scheduleType:
      'FIXED = next due date calculated from the original planned date regardless of when last completed (maintains strict rhythm). FLOATING = next due date calculated from when the work was last completed (more common, adapts to actual execution).',
    meterType:
      'The counter type that triggers this PM. RUNTIME_HOURS = operating hours. MILEAGE = distance traveled (vehicles). CYCLES = production cycles or strokes. PRODUCTION_COUNT = units produced.',
    meterInterval:
      'The usage threshold between PMs. Example: 500 means "every 500 hours" or "every 500 cycles" depending on meter type.',
    dualTrigger:
      'When enabled with DUAL strategy, the PM triggers when EITHER the calendar interval OR the meter interval is reached — whichever comes first. This prevents both time-based decay AND usage-based wear from being missed.',
    leadDays:
      'Days before the due date that the system auto-generates the Work Order. Gives planners time to organize technicians, parts, and access. Default: 7 days. Critical assets may need more lead time.',
    gracePeriodDays:
      'Days after the due date before the PM is flagged as overdue. Allows minor scheduling flexibility. Default: 3 days. Statutory PMs should have 0 grace period.',
    autoAssign:
      'When enabled, the generated Work Order is automatically assigned to a technician instead of staying in DRAFT. Assignment follows the configured rule (Primary Technician, Round Robin, or Skill Based).',
  },
};

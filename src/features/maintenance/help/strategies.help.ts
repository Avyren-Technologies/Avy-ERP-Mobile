import type { ScreenHelp } from './types';

export const strategiesHelp: ScreenHelp = {
  page: {
    title: 'Maintenance Strategies',
    description:
      'Define reusable maintenance strategies that govern how assets are maintained. Each strategy specifies the trigger mechanism (calendar, meter, condition, etc.) and can be linked to PM Schedules.',
    steps: [
      'View existing strategies in the list',
      'Click "+ Add Strategy" to create a new strategy',
      'Choose the strategy type that matches your maintenance approach',
      'Add a description and configure the trigger rules',
      'Link the strategy to PM Schedules for automatic work order generation',
    ],
    tips: [
      'Calendar-based strategies are the simplest starting point — schedule maintenance at fixed intervals',
      'Meter-based strategies are ideal for assets with variable usage patterns (vehicles, CNC machines)',
      'Condition-based strategies require sensor or inspection data but deliver the best cost efficiency',
      'Run-to-Failure is a deliberate choice for non-critical, low-cost assets where PM cost exceeds replacement cost',
    ],
  },
  fields: {
    strategyType:
      'PREVENTIVE_CALENDAR = time-based intervals. PREVENTIVE_METER = usage-based. CORRECTIVE = fix after defect. CONDITION_BASED = triggered by sensor/inspection readings. PREDICTIVE = ML/analytics-driven. SEASONAL = specific time of year. STATUTORY = legal compliance. AMC_MANAGED = vendor-managed under contract. RUN_TO_FAILURE = deliberate no-maintenance strategy for non-critical assets. SHUTDOWN_OVERHAUL = major maintenance during planned downtime.',
    triggerConfig:
      'JSON configuration for the trigger rules. For calendar: {"intervalDays": 30}. For meter: {"meterType": "RUNTIME_HOURS", "interval": 500}. For condition: {"parameter": "temperature", "threshold": 80}.',
  },
};

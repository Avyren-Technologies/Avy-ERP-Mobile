import type { ScreenHelp } from './types';

export const logReadingHelp: ScreenHelp = {
  page: {
    title: 'Log Meter Reading',
    description:
      'Record a meter or counter reading for an asset. Meter readings drive usage-based PM schedules — when the reading crosses the PM interval threshold, a Work Order is automatically generated.',
    prerequisites: [
      'Asset must have at least one meter configured (Runtime Hours, Mileage, Cycles, etc.)',
    ],
    steps: [
      'Select the meter type if the asset has multiple meters',
      'Enter the current reading value',
      'Submit — the system validates the reading is higher than the last recorded value',
    ],
    tips: [
      'Readings should increase monotonically — the system rejects values lower than the previous reading',
      'Regular meter logging ensures PM schedules trigger at the right time',
      'IoT-connected assets may auto-update readings — manual logging is a fallback',
    ],
  },
  fields: {
    meterValue:
      'The current meter reading. Must be greater than or equal to the last recorded value. Enter the exact value shown on the equipment counter or display.',
  },
};

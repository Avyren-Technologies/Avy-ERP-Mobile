import type { ScreenHelp } from './types';

export const reliabilityHelp: ScreenHelp = {
  page: {
    title: 'Reliability Metrics',
    description:
      'Per-asset reliability metrics including Mean Time Between Failures (MTBF), Mean Time To Repair (MTTR), Availability %, and Remaining Useful Life (RUL) estimates. Flags assets that may be candidates for replacement.',
    steps: [
      'Review the asset list sorted by reliability metrics',
      'Identify assets with low MTBF (frequent failures) that need PM strategy review',
      'Flag assets with high MTTR (slow repairs) for process improvement or technician training',
      'Check assets approaching end of design life or exceeding the Repair vs Replace cost threshold',
    ],
    tips: [
      'MTBF = average uptime hours between breakdowns (higher is better)',
      'MTTR = average repair duration in hours (lower is better)',
      'Assets where cumulative maintenance cost exceeds the Repair vs Replace threshold are flagged with a replacement indicator',
      'Combine reliability data with analytics trends to build a data-driven asset replacement plan',
    ],
  },
};

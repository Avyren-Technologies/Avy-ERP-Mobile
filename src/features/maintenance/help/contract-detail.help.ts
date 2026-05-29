import type { ScreenHelp } from './types';

export const contractDetailHelp: ScreenHelp = {
  page: {
    title: 'Contract Detail',
    description:
      'Full contract view showing vendor, type, coverage period, linked assets, scheduled visits, and cost recovery tracking. Provides a complete picture of the service agreement and its utilization.',
    steps: [
      'Review contract terms including vendor, contract type, start/end dates, and renewal terms',
      'Check the Assets tab for all equipment covered under this contract',
      'View the Visits tab for service history and upcoming scheduled visits',
      'Track utilization percentage to monitor how much of the agreed visit count has been consumed',
    ],
    tips: [
      'Linking assets to a contract means their maintenance cost can be partially recovered from the vendor',
      'Visit logs auto-update when PM Work Orders linked to this contract are completed',
    ],
  },
};

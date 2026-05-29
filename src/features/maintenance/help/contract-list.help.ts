import type { ScreenHelp } from './types';

export const contractListHelp: ScreenHelp = {
  page: {
    title: 'Service Contracts',
    description:
      'Lists all service contracts — Warranty, AMC, Rate Agreements, and One-Time service. Tracks vendor commitments, coverage scope, expiry dates, and visit utilization across your asset base.',
    prerequisites: [
      'Vendor references configured (or use free-text vendor entry)',
      'Assets registered in the Asset Register',
    ],
    steps: [
      'View all contracts in the list — each row shows vendor, contract type, coverage period, and status',
      'Filter by contract type (Warranty, AMC, Rate Agreement, One-Time) or status to narrow results',
      'Check the Expiry column to identify contracts approaching renewal',
      'Click any row to view full contract detail, linked assets, and visit history',
    ],
    tips: [
      'The system sends expiry alerts at 90, 60, and 30 days before contract end date',
      'Expired contracts are highlighted for immediate attention',
      'Contract utilization % shows how much of the agreed visit count has been used — plan renewals before hitting 100%',
    ],
  },
};

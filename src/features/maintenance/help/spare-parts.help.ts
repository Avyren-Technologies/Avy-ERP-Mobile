import type { ScreenHelp } from './types';

export const sparePartsHelp: ScreenHelp = {
  page: {
    title: 'Spare Parts',
    description:
      'Manage spare parts inventory linked to your maintenance assets. Track stock levels, reorder points, and consumption history to ensure critical spares are always available when needed for work orders and breakdown repairs.',
    prerequisites: [
      'At least one asset registered in the Asset Register',
      'Spare part categories configured (if applicable)',
    ],
    steps: [
      'Browse the spare parts list to see current stock levels',
      'Use search and filters to find specific parts by name, code, or linked asset',
      'Review stock status indicators — items below reorder point are highlighted',
      'Tap a spare part to view details including consumption history and linked assets',
    ],
    tips: [
      'Parts linked to critical or bottleneck assets should have higher safety stock levels',
      'Regular stock audits help maintain inventory accuracy and reduce emergency procurement',
      'Use consumption history to identify fast-moving parts and adjust reorder points accordingly',
    ],
  },
};

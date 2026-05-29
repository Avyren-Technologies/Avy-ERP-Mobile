import type { ScreenHelp } from './types';

export const addPartsHelp: ScreenHelp = {
  page: {
    title: 'Add Parts',
    description:
      'Record spare parts used during this Work Order. Parts costs contribute to the total WO cost and are tracked for inventory planning and ABC classification analysis.',
    steps: [
      'Enter the part name (and optionally part number)',
      'Set the quantity used',
      'Enter the unit cost if known',
      'Submit — the part is recorded and cost is auto-calculated',
    ],
    tips: [
      'Parts can be returned if unused — use the Return function on the WO detail screen',
      'Accurate part logging enables stockout prediction and reorder planning',
      'Total parts cost = quantity x unit cost, aggregated on the Cost tab',
    ],
  },
  fields: {
    partName:
      'Name or description of the spare part used. Use the standard part name from your inventory for consistent tracking.',
    unitCost:
      'Cost per single unit of this part. Used to calculate total parts cost on the Work Order.',
  },
};

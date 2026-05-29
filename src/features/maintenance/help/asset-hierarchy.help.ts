import type { ScreenHelp } from './types';

export const assetHierarchyHelp: ScreenHelp = {
  page: {
    title: 'Asset Hierarchy',
    description:
      'Visual tree view of parent-child relationships between assets. Hierarchies follow industry-standard structures: Plant → Line → Machine → Component (manufacturing), Building → Floor → System → Equipment (facilities), Company → Fleet Category → Vehicle → Component (fleet).',
    prerequisites: [
      'Assets registered with Parent Asset relationships configured',
      'At least 2 assets with a parent-child link to see the tree',
    ],
    steps: [
      'Browse the tree structure — expand/collapse nodes to navigate',
      'Click an asset node to view its details',
      'The hierarchy supports up to 6 levels of depth',
      'Use this view to understand dependencies — which components belong to which machines',
    ],
    tips: [
      'Cost rolls up the hierarchy — total maintenance cost at the machine level includes all component costs',
      'Cascading breakdown flag: when configured, a child asset breakdown can auto-flag the parent as "Partially Down"',
      'Transferring an asset to a new parent preserves all historical hierarchy associations with timestamps',
      'Plan PM schedules at the right hierarchy level — component-level PMs are more granular, machine-level PMs cover the whole unit',
    ],
  },
};

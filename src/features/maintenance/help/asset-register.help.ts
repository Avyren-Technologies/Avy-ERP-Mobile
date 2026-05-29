import type { ScreenHelp } from './types';

export const assetRegisterHelp: ScreenHelp = {
  page: {
    title: 'Asset Register',
    description:
      'The central registry of all maintainable assets in your organization — machines, vehicles, buildings, tools, utilities, and infrastructure. Every work order, PM schedule, and maintenance history record references assets from this register.',
    prerequisites: [
      'Configure Number Series for "Maintenance Asset" (Company Admin → Number Series)',
      'Set up Asset Categories, Sub-Categories, and Types via the Manage dropdown',
      'Optionally configure Asset Classes and Ownership Types via Manage dropdown',
      'Set up Locations in Company Admin → Locations (for asset location assignment)',
    ],
    steps: [
      'Click "+ Add Asset" to open the creation form',
      'Fill required fields: Asset Name and Asset Class',
      'Optionally fill Classification (Category, Criticality, Ownership), Location, Technical details, and Financial info',
      'Click "Create Asset" to save — an asset number is auto-generated from Number Series',
      'Use the Manage dropdown to create Categories, Types, and other master data on-the-fly',
      'Use Search and Filters (Asset Class, Criticality, Status) to find assets quickly',
      'Click the eye icon on any row to view full asset details',
    ],
    tips: [
      'Use "Sync Machines" to import machines from the Machine Master into the asset register',
      'Assets with Criticality = Critical get faster SLA escalation and stricter approval rules',
      'Mark bottleneck assets with the "Is Bottleneck" toggle for priority breakdown alerts',
      'Set up Categories and Types before bulk asset registration for consistent classification',
      'Financial fields (Purchase Cost, Replacement Value) enable Repair vs Replace analysis',
    ],
  },
  fields: {
    assetClass:
      'The broad classification of this asset (Machine, Vehicle, Building, Tool, etc.). Determines which industry-specific fields, maintenance strategies, and reporting groups apply.',
    criticality:
      'Risk-based importance level (Critical / High / Medium / Low). Derived from impact on production, safety, quality, cost, and redundancy. Drives approval matrix requirements, SLA escalation timelines, and PM scheduling priority.',
    isBottleneck:
      'Enable if this asset is a production bottleneck — its failure stops or severely degrades the entire production line. Bottleneck breakdowns trigger immediate priority alerts and are auto-escalated.',
    ownership:
      'Who owns or manages this asset. "Owned" = purchased by your company. "Leased" = rented from vendor (warranty terms may differ). "AMC Managed" = maintained under external service contract. "Customer Site" = deployed at a customer location with special tracking.',
    ptwClass:
      'Permit-to-Work classification required before maintenance begins (Hot Work, Confined Space, Electrical Isolation, etc.). Only applicable when "Permit Required" is checked. Required in chemical, steel, and foundry industries.',
    designLifeYears:
      'Expected operational lifespan in years from commissioning. Used by reliability analytics to calculate Remaining Useful Life (RUL) and flag assets approaching end-of-life for replacement planning.',
    purchaseCost:
      'Original acquisition cost. Combined with accumulated maintenance cost to calculate the Repair vs Replace ratio — when cumulative maintenance exceeds the configured threshold (default 80%) of replacement value, the system flags for replacement review.',
    replacementValue:
      'Current market cost to replace this asset with an equivalent new one. Used in Repair vs Replace analysis, insurance valuation, and capital budgeting.',
    failureCodeSet:
      'Links this asset to a predefined hierarchy of failure modes, causes, and corrective actions. Used during breakdown closure for standardized root cause analysis. Configure sets in Maintenance Config → Failure Codes.',
    condition:
      'Current physical condition assessment (New / Good / Fair / Poor). Updated during inspections. Poor condition assets may trigger condition-based maintenance alerts.',
    ratedCapacity:
      'Maximum designed output capacity (e.g., "500 units/hr", "100 kW"). Operating consistently above rated capacity accelerates wear and may warrant more frequent PM.',
  },
};

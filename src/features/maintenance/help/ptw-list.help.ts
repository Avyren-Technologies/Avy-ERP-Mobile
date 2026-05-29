import type { ScreenHelp } from './types';

export const ptwListHelp: ScreenHelp = {
  page: {
    title: 'Permit-to-Work',
    description:
      'Permit-to-Work management for safety-critical maintenance. PTW is required before hazardous work can begin in industries like chemicals, steel, and foundry. Ensures all safety protocols are authorized and documented before work starts.',
    prerequisites: [
      'PTW feature enabled in Maintenance Config → Feature Toggles',
      'PTW Classes configured via Asset Register → Manage PTW Classes',
    ],
    steps: [
      'View all permits by status — Requested, Under Review, Issued, Active, Closed, Expired, or Revoked',
      'Click any permit to view its full detail or to approve/reject it',
    ],
    tips: [
      'A work order requiring PTW cannot start until the permit is ISSUED and ACTIVE',
      'PTW classes (Hot Work, Confined Space, Electrical Isolation, etc.) define the safety requirements for each type of hazardous work',
      'Expired permits auto-revoke — work must stop immediately until a new permit is issued',
    ],
  },
  fields: {
    ptwClass:
      'The type of hazardous work requiring authorization. HOT_WORK = welding, cutting, grinding near flammables. CONFINED_SPACE = tanks, pits, vessels with limited access. ELECTRICAL_ISOLATION = work on live or potentially live equipment. PRESSURE_RELEASE = work on pressurized systems. GENERAL_WORK = other safety-sensitive activities.',
  },
};

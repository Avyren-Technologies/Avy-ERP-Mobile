import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

// Strictly aligned with Prisma `VisitStatus` enum. Non-existent values like
// PRE_REGISTERED, APPROVED, OVERDUE belong to derived state (approvalStatus
// / overstay) and have a separate badge below.
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  EXPECTED: { label: 'Expected', bg: '#DBEAFE', text: '#1D4ED8' },
  ARRIVED: { label: 'Arrived', bg: '#FEF3C7', text: '#B45309' },
  CHECKED_IN: { label: 'Checked In', bg: '#D1FAE5', text: '#047857' },
  CHECKED_OUT: { label: 'Checked Out', bg: '#F3F4F6', text: '#6B7280' },
  AUTO_CHECKED_OUT: { label: 'Auto Out', bg: '#F3F4F6', text: '#6B7280' },
  NO_SHOW: { label: 'No Show', bg: '#F3F4F6', text: '#9CA3AF' },
  CANCELLED: { label: 'Cancelled', bg: '#F3F4F6', text: '#9CA3AF' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', text: '#DC2626' },
};

const APPROVAL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Pending Approval', bg: colors.warning[50], text: colors.warning[700] },
  APPROVED: { label: 'Approved', bg: colors.primary[50], text: colors.primary[700] },
  AUTO_APPROVED: { label: 'Auto-Approved', bg: colors.primary[50], text: colors.primary[700] },
  REJECTED: { label: 'Rejected', bg: colors.danger[50], text: colors.danger[700] },
};

export function VisitStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: (status ?? '').replace(/_/g, ' '), bg: '#F3F4F6', text: '#6B7280' };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text className="font-inter text-[10px] font-bold" style={{ color: cfg.text }}>
        {cfg.label}
      </Text>
    </View>
  );
}

export function ApprovalStatusBadge({ status }: { status: string }) {
  const cfg = APPROVAL_CONFIG[status];
  if (!cfg) return null;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text className="font-inter text-[10px] font-bold" style={{ color: cfg.text }}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
});

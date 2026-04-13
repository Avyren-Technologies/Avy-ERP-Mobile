import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  EXPECTED: { label: 'Expected', bg: '#DBEAFE', text: '#1D4ED8' },
  ARRIVED: { label: 'Arrived', bg: '#FEF3C7', text: '#B45309' },
  CHECKED_IN: { label: 'Checked In', bg: '#D1FAE5', text: '#047857' },
  CHECKED_OUT: { label: 'Checked Out', bg: '#F3F4F6', text: '#6B7280' },
  NO_SHOW: { label: 'No Show', bg: '#F3F4F6', text: '#9CA3AF' },
  CANCELLED: { label: 'Cancelled', bg: '#F3F4F6', text: '#9CA3AF' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', text: '#DC2626' },
  AUTO_CHECKED_OUT: { label: 'Auto Out', bg: '#F3F4F6', text: '#6B7280' },
  PRE_REGISTERED: { label: 'Pre-Registered', bg: colors.info[50], text: colors.info[700] },
  APPROVED: { label: 'Approved', bg: colors.primary[50], text: colors.primary[700] },
  OVERDUE: { label: 'Overdue', bg: colors.danger[50], text: colors.danger[700] },
};

export function VisitStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#F3F4F6', text: '#6B7280' };
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

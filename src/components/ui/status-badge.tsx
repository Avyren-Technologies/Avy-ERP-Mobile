/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

type StatusType = 'active' | 'trial' | 'suspended' | 'expired' | 'cancelled' | 'paid' | 'pending' | 'overdue';

interface StatusBadgeProps {
    status: StatusType;
    size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<StatusType, { label: string; bg: string; text: string; dot: string }> = {
    active: {
        label: 'Active',
        bg: colors.success[50],
        text: colors.success[700],
        dot: colors.success[500],
    },
    trial: {
        label: 'Trial',
        bg: colors.info[50],
        text: colors.info[700],
        dot: colors.info[500],
    },
    suspended: {
        label: 'Suspended',
        bg: colors.warning[50],
        text: colors.warning[700],
        dot: colors.warning[500],
    },
    expired: {
        label: 'Expired',
        bg: colors.danger[50],
        text: colors.danger[700],
        dot: colors.danger[500],
    },
    cancelled: {
        label: 'Cancelled',
        bg: colors.neutral[100],
        text: colors.neutral[600],
        dot: colors.neutral[400],
    },
    paid: {
        label: 'Paid',
        bg: colors.success[50],
        text: colors.success[700],
        dot: colors.success[500],
    },
    pending: {
        label: 'Pending',
        bg: colors.warning[50],
        text: colors.warning[700],
        dot: colors.warning[500],
    },
    overdue: {
        label: 'Overdue',
        bg: colors.danger[50],
        text: colors.danger[700],
        dot: colors.danger[500],
    },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    const isSmall = size === 'sm';

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: config.bg },
                isSmall && styles.badgeSmall,
            ]}
        >
            <View style={[styles.dot, { backgroundColor: config.dot }, isSmall && styles.dotSmall]} />
            <Text
                style={{ color: config.text }}
                className={`font-inter font-bold ${isSmall ? 'text-[10px]' : 'text-xs'}`}
            >
                {config.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 6,
    },
    badgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    dotSmall: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
});

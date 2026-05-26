import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

const WO_STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; dotColor: string }> = {
    DRAFT: { label: 'Draft', bgColor: colors.neutral[100], textColor: colors.neutral[600], dotColor: colors.neutral[400] },
    PLANNED: { label: 'Planned', bgColor: colors.info[50], textColor: colors.info[700], dotColor: colors.info[500] },
    ASSIGNED: { label: 'Assigned', bgColor: '#EFF6FF', textColor: '#1D4ED8', dotColor: '#3B82F6' },
    ACKNOWLEDGED: { label: 'Acknowledged', bgColor: '#F0FDF4', textColor: '#15803D', dotColor: '#22C55E' },
    IN_PROGRESS: { label: 'In Progress', bgColor: colors.warning[50], textColor: colors.warning[700], dotColor: colors.warning[500] },
    ON_HOLD: { label: 'On Hold', bgColor: '#FFF7ED', textColor: '#C2410C', dotColor: '#F97316' },
    PENDING_REVIEW: { label: 'Pending Review', bgColor: colors.accent[50], textColor: colors.accent[700], dotColor: colors.accent[500] },
    COMPLETED: { label: 'Completed', bgColor: colors.success[50], textColor: colors.success[700], dotColor: colors.success[500] },
    AWAITING_QA: { label: 'Awaiting QA', bgColor: '#F5F3FF', textColor: '#6D28D9', dotColor: '#8B5CF6' },
    QA_REVIEW: { label: 'QA Review', bgColor: '#F5F3FF', textColor: '#6D28D9', dotColor: '#8B5CF6' },
    CLOSED: { label: 'Closed', bgColor: colors.neutral[100], textColor: colors.neutral[600], dotColor: colors.neutral[500] },
    CANCELLED: { label: 'Cancelled', bgColor: colors.danger[50], textColor: colors.danger[700], dotColor: colors.danger[500] },
    REJECTED: { label: 'Rejected', bgColor: colors.danger[50], textColor: colors.danger[700], dotColor: colors.danger[500] },
    DECLINED: { label: 'Declined', bgColor: colors.danger[50], textColor: colors.danger[600], dotColor: colors.danger[400] },
    REOPENED: { label: 'Reopened', bgColor: colors.warning[50], textColor: colors.warning[700], dotColor: colors.warning[500] },
};

export function WOStatusBadge({ status }: { status: string }) {
    const config = WO_STATUS_CONFIG[status];
    const label = config?.label ?? (status || 'Unknown').replace(/_/g, ' ');
    const bgColor = config?.bgColor ?? colors.neutral[100];
    const textColor = config?.textColor ?? colors.neutral[600];
    const dotColor = config?.dotColor ?? colors.neutral[400];

    return (
        <View style={[styles.badge, { backgroundColor: bgColor }]}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text className="font-inter" style={[styles.label, { color: textColor }]}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 100,
        gap: 5,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
    },
});

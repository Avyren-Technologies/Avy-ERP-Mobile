import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

const OPERATIONAL_CONFIG: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
    RUNNING: { label: 'Running', dotColor: colors.success[500], bgColor: colors.success[50], textColor: colors.success[700] },
    IDLE: { label: 'Idle', dotColor: colors.neutral[400], bgColor: colors.neutral[100], textColor: colors.neutral[600] },
    BREAKDOWN: { label: 'Breakdown', dotColor: colors.danger[500], bgColor: colors.danger[50], textColor: colors.danger[700] },
    SHUTDOWN: { label: 'Shutdown', dotColor: colors.warning[500], bgColor: colors.warning[50], textColor: colors.warning[700] },
    INACTIVE: { label: 'Inactive', dotColor: colors.neutral[400], bgColor: colors.neutral[50], textColor: colors.neutral[500] },
    RETIRED: { label: 'Retired', dotColor: colors.neutral[400], bgColor: colors.neutral[50], textColor: colors.neutral[500] },
};

const MAINTENANCE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    NO_ACTION: { label: 'No Action', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
    PM_DUE: { label: 'PM Due', bgColor: colors.warning[50], textColor: colors.warning[700] },
    IN_PROGRESS: { label: 'In Progress', bgColor: '#EFF6FF', textColor: '#1D4ED8' },
    WAITING_PARTS: { label: 'Waiting Parts', bgColor: colors.warning[50], textColor: colors.warning[700] },
    CLOSED: { label: 'Closed', bgColor: colors.success[50], textColor: colors.success[700] },
};

export function AssetOperationalBadge({ status }: { status: string }) {
    const config = OPERATIONAL_CONFIG[status];
    const label = config?.label ?? (status || 'Unknown').replace(/_/g, ' ');
    const dotColor = config?.dotColor ?? colors.neutral[400];
    const bgColor = config?.bgColor ?? colors.neutral[100];
    const textColor = config?.textColor ?? colors.neutral[600];

    return (
        <View style={[styles.badge, { backgroundColor: bgColor }]}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text className="font-inter" style={[styles.label, { color: textColor }]}>
                {label}
            </Text>
        </View>
    );
}

export function AssetMaintenanceBadge({ status }: { status: string }) {
    const config = MAINTENANCE_CONFIG[status];
    const label = config?.label ?? (status || 'Unknown').replace(/_/g, ' ');
    const bgColor = config?.bgColor ?? colors.neutral[100];
    const textColor = config?.textColor ?? colors.neutral[600];

    return (
        <View style={[styles.smallBadge, { backgroundColor: bgColor }]}>
            <Text className="font-inter" style={[styles.smallLabel, { color: textColor }]}>
                {label}
            </Text>
        </View>
    );
}

export function AssetStatusBadge({ operationalStatus, maintenanceStatus }: { operationalStatus: string; maintenanceStatus?: string }) {
    return (
        <View style={styles.container}>
            <AssetOperationalBadge status={operationalStatus} />
            {maintenanceStatus ? <AssetMaintenanceBadge status={maintenanceStatus} /> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 100,
        gap: 5,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    smallBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 100,
    },
    smallLabel: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
});

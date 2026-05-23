import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

const PRIORITY_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    EMERGENCY: { label: 'Emergency', bgColor: colors.danger[50], textColor: colors.danger[700] },
    HIGH: { label: 'High', bgColor: colors.warning[50], textColor: colors.warning[700] },
    MEDIUM: { label: 'Medium', bgColor: '#FFFBEB', textColor: '#B45309' },
    LOW: { label: 'Low', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
};

export function PriorityBadge({ priority }: { priority: string }) {
    const config = PRIORITY_CONFIG[priority];
    const label = config?.label ?? (priority || 'Unknown').replace(/_/g, ' ');
    const bgColor = config?.bgColor ?? colors.neutral[100];
    const textColor = config?.textColor ?? colors.neutral[600];

    return (
        <View style={[styles.badge, { backgroundColor: bgColor }]}>
            <Text className="font-inter" style={[styles.label, { color: textColor }]}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 100,
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
});

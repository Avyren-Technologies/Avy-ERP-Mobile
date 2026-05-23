import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

const CRITICALITY_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    CRITICAL: { label: 'Critical', bgColor: colors.danger[50], textColor: colors.danger[700] },
    HIGH: { label: 'High', bgColor: colors.warning[50], textColor: colors.warning[700] },
    MEDIUM: { label: 'Medium', bgColor: '#FFFBEB', textColor: '#B45309' },
    LOW: { label: 'Low', bgColor: colors.success[50], textColor: colors.success[700] },
};

export function CriticalityBadge({ criticality }: { criticality: string }) {
    const config = CRITICALITY_CONFIG[criticality];
    const label = config?.label ?? (criticality || 'Unknown').replace(/_/g, ' ');
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

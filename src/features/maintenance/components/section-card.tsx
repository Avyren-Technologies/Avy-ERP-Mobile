import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

export function SectionCard({
    title,
    children,
    isDark,
}: {
    title: string;
    children: React.ReactNode;
    isDark: boolean;
}) {
    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.primary[900] : colors.primary[50],
                },
            ]}
        >
            <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {title}
            </Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        marginTop: 16,
        gap: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
});

import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useAssets } from '@/features/maintenance/api/use-maintenance-queries';
import { AssetOperationalBadge } from '@/features/maintenance/shared/asset-status-badge';

interface AssetPickerProps {
    onSelect: (assetId: string) => void;
    selectedAssetId?: string;
    placeholder?: string;
}

export function AssetPicker({ onSelect, selectedAssetId, placeholder = 'Search assets...' }: AssetPickerProps) {
    const [search, setSearch] = useState('');
    const { data, isLoading } = useAssets({ search, limit: 20 });

    const assets: any[] = (data as any)?.data ?? [];

    const handleSelect = useCallback((id: string) => {
        onSelect(id);
    }, [onSelect]);

    const renderItem = useCallback(({ item }: { item: any }) => {
        const isSelected = item.id === selectedAssetId;
        return (
            <Pressable
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => handleSelect(item.id)}
            >
                <View style={styles.rowContent}>
                    <View style={styles.rowHeader}>
                        <Text className="font-inter" style={styles.assetName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <AssetOperationalBadge status={item.operationalStatus ?? 'IDLE'} />
                    </View>
                    <View style={styles.rowMeta}>
                        <Text className="font-inter" style={styles.metaText}>
                            {item.assetNumber}
                        </Text>
                        {item.assetClass ? (
                            <Text className="font-inter" style={styles.metaText}>
                                {item.assetClass}
                            </Text>
                        ) : null}
                    </View>
                </View>
            </Pressable>
        );
    }, [selectedAssetId, handleSelect]);

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.searchInput}
                placeholder={placeholder}
                placeholderTextColor={colors.neutral[400]}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
            />
            <FlatList
                data={assets}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                style={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text className="font-inter" style={styles.emptyText}>
                            {isLoading ? 'Loading...' : 'No assets found'}
                        </Text>
                    </View>
                }
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchInput: {
        fontFamily: 'Inter',
        fontSize: 14,
        color: colors.neutral[900],
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 8,
    },
    list: {
        flex: 1,
    },
    row: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    rowSelected: {
        backgroundColor: colors.primary[50],
    },
    rowContent: {
        gap: 4,
    },
    rowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    assetName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral[900],
        flex: 1,
    },
    rowMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metaText: {
        fontSize: 12,
        color: colors.neutral[500],
    },
    empty: {
        paddingVertical: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: colors.neutral[400],
    },
});

/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
    ActivityIndicator,
    Modal as RNModal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import type { EmployeeOption } from '@/features/maintenance/work-order-parts-labour';
import { useIsDark } from '@/hooks/use-is-dark';

type Props = {
    label: string;
    required?: boolean;
    value: string;
    displayName: string;
    onChange: (id: string, name: string) => void;
    employees: EmployeeOption[];
    loading?: boolean;
    error?: string;
    placeholder?: string;
};

export function EmployeePickerField({
    label,
    required,
    value,
    displayName,
    onChange,
    employees,
    loading,
    error,
    placeholder = 'Tap to search & select a technician...',
}: Props) {
    const isDark = useIsDark();
    const [showList, setShowList] = React.useState(false);
    const [query, setQuery] = React.useState('');

    const filtered = React.useMemo(() => {
        if (!query.trim()) return employees;
        const q = query.toLowerCase();
        return employees.filter(
            (e) =>
                e.name.toLowerCase().includes(q) ||
                e.code.toLowerCase().includes(q) ||
                e.sublabel.toLowerCase().includes(q),
        );
    }, [employees, query]);

    const selected = employees.find((e) => e.id === value);

    return (
        <View style={styles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                {label}
                {required ? <Text className="text-danger-500"> *</Text> : null}
            </Text>
            <Pressable
                onPress={() => setShowList(true)}
                style={[
                    styles.trigger,
                    {
                        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                        borderColor: error
                            ? colors.danger[400]
                            : isDark
                              ? colors.neutral[700]
                              : colors.neutral[200],
                    },
                ]}
            >
                <Text
                    className={`font-inter text-sm ${displayName ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                >
                    {loading ? 'Loading employees...' : displayName || placeholder}
                </Text>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        stroke={colors.neutral[400]}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Pressable>
            {selected?.sublabel ? (
                <Text className="mt-1.5 font-inter text-xs text-neutral-400">{selected.sublabel}</Text>
            ) : null}
            {error ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{error}</Text> : null}

            <RNModal visible={showList} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowList(false)}>
                <View style={[styles.modal, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                        <Pressable onPress={() => { setShowList(false); setQuery(''); }}>
                            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
                        </Pressable>
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">Select Technician</Text>
                        <View style={{ width: 52 }} />
                    </View>
                    <View
                        style={[
                            styles.search,
                            {
                                backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                                borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                            },
                        ]}
                    >
                        <TextInput
                            style={{
                                flex: 1,
                                fontFamily: 'Inter',
                                fontSize: 14,
                                color: isDark ? colors.white : colors.primary[950],
                            }}
                            placeholder="Search by name, ID or department..."
                            placeholderTextColor={colors.neutral[400]}
                            value={query}
                            onChangeText={setQuery}
                            autoFocus
                        />
                    </View>
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                        {loading ? (
                            <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 24 }} />
                        ) : filtered.length === 0 ? (
                            <Text className="font-inter text-sm text-neutral-400 text-center mt-6">No employees found</Text>
                        ) : (
                            filtered.map((emp) => (
                                <Pressable
                                    key={emp.id}
                                    onPress={() => {
                                        onChange(emp.id, emp.name);
                                        setShowList(false);
                                        setQuery('');
                                    }}
                                    style={[
                                        styles.row,
                                        {
                                            backgroundColor:
                                                emp.id === value
                                                    ? isDark
                                                        ? colors.primary[900]
                                                        : colors.primary[50]
                                                    : 'transparent',
                                        },
                                    ]}
                                >
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{emp.name}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-400">{emp.sublabel}</Text>
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
                </View>
            </RNModal>
        </View>
    );
}

const styles = StyleSheet.create({
    field: { marginBottom: 16 },
    trigger: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modal: { flex: 1 },
    modalHeader: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
    },
    search: {
        margin: 16,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    row: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 6,
    },
});

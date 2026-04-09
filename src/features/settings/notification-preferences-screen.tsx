import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { showSuccess, showErrorMessage, showError } from '@/components/ui/utils';
import {
    notificationApi,
    type NotificationPreferenceData,
    type NotificationPreferencesResponse,
} from '@/lib/api/notifications';
import colors from '@/components/ui/colors';

/** Separate root key — notification list/unread invalidations should NOT refetch preferences. */
export const notificationPreferencesKey = ['notification-preferences'] as const;

interface EnvelopeShape {
    data?: NotificationPreferencesResponse;
    success?: boolean;
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

interface ToggleRowProps {
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    disabledReason?: string;
    onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, disabled, disabledReason, onChange }: ToggleRowProps) {
    return (
        <View style={styles.row}>
            <View style={styles.rowText}>
                <Text className="font-inter" style={styles.rowLabel}>
                    {label}
                </Text>
                <Text className="font-inter" style={styles.rowDesc}>
                    {description}
                </Text>
                {disabled && disabledReason ? (
                    <Text className="font-inter" style={styles.rowWarning}>
                        {disabledReason}
                    </Text>
                ) : null}
            </View>
            <Switch
                value={checked}
                onValueChange={onChange}
                disabled={disabled}
                trackColor={{ true: colors.primary[500], false: '#CBD5E1' }}
                thumbColor="#FFFFFF"
            />
        </View>
    );
}

interface RadioRowProps {
    label: string;
    description: string;
    selected: boolean;
    onPress: () => void;
}

function RadioRow({ label, description, selected, onPress }: RadioRowProps) {
    return (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.rowText}>
                <Text className="font-inter" style={styles.rowLabel}>
                    {label}
                </Text>
                <Text className="font-inter" style={styles.rowDesc}>
                    {description}
                </Text>
            </View>
            <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
            </View>
        </TouchableOpacity>
    );
}

export function NotificationPreferencesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: notificationPreferencesKey,
        queryFn: () => notificationApi.getPreferences(),
        staleTime: 30_000,
    });

    const envelope = data as EnvelopeShape | undefined;
    const preference = envelope?.data?.preference;
    const companyMasters = envelope?.data?.companyMasters;

    // Local draft state for time inputs (commit on blur only, not per keystroke)
    const [quietStartDraft, setQuietStartDraft] = useState<string | null>(null);
    const [quietEndDraft, setQuietEndDraft] = useState<string | null>(null);
    const [quietStartError, setQuietStartError] = useState(false);
    const [quietEndError, setQuietEndError] = useState(false);

    const updateMutation = useMutation({
        mutationFn: (patch: Partial<NotificationPreferenceData>) => notificationApi.updatePreferences(patch),

        // Optimistic update with rollback on failure
        onMutate: async (patch) => {
            await queryClient.cancelQueries({ queryKey: notificationPreferencesKey });
            const previous = queryClient.getQueryData<EnvelopeShape>(notificationPreferencesKey);
            if (previous?.data) {
                queryClient.setQueryData<EnvelopeShape>(notificationPreferencesKey, {
                    ...previous,
                    data: {
                        ...previous.data,
                        preference: { ...previous.data.preference, ...patch },
                    },
                });
            }
            return { previous };
        },
        onError: (err, _patch, ctx) => {
            if (ctx?.previous) {
                queryClient.setQueryData(notificationPreferencesKey, ctx.previous);
            }
            // Axios error shape → showError, else fallback text
            const axiosErr = err as { isAxiosError?: boolean };
            if (axiosErr?.isAxiosError) {
                showError(err as any);
            } else {
                showErrorMessage('Could not update preferences');
            }
        },
        onSuccess: (result) => {
            const existing = queryClient.getQueryData<EnvelopeShape>(notificationPreferencesKey);
            if (existing?.data) {
                const resultData = (result as EnvelopeShape | undefined)?.data;
                if (resultData) {
                    queryClient.setQueryData<EnvelopeShape>(notificationPreferencesKey, {
                        ...existing,
                        data: {
                            ...existing.data,
                            preference: resultData as unknown as NotificationPreferenceData,
                        },
                    });
                }
            }
        },
    });

    const testMutation = useMutation({
        mutationFn: () => notificationApi.sendTestNotification(),
        onSuccess: () => showSuccess('Test notification sent'),
        onError: (err) => {
            const axiosErr = err as { isAxiosError?: boolean };
            if (axiosErr?.isAxiosError) {
                showError(err as any);
            } else {
                showErrorMessage('Could not send test notification');
            }
        },
    });

    const update = (patch: Partial<NotificationPreferenceData>) => {
        updateMutation.mutate(patch);
    };

    if (isError) {
        return (
            <View style={styles.errorContainer}>
                <Text className="font-inter" style={styles.errorText}>
                    Failed to load preferences.
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                    <Text className="font-inter" style={styles.retryText}>
                        Retry
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isLoading || !preference || !companyMasters) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
        );
    }

    const commitQuietStart = () => {
        const val = quietStartDraft;
        if (val === null || val === preference.quietHoursStart) {
            setQuietStartDraft(null);
            setQuietStartError(false);
            return;
        }
        if (val === '' || TIME_REGEX.test(val)) {
            setQuietStartError(false);
            setQuietStartDraft(null);
            update({ quietHoursStart: val === '' ? null : val });
        } else {
            // Invalid — keep the draft visible with an error border so the user
            // can correct it, and surface an error toast.
            setQuietStartError(true);
            showErrorMessage('Start time must be HH:MM (24-hour)');
        }
    };

    const commitQuietEnd = () => {
        const val = quietEndDraft;
        if (val === null || val === preference.quietHoursEnd) {
            setQuietEndDraft(null);
            setQuietEndError(false);
            return;
        }
        if (val === '' || TIME_REGEX.test(val)) {
            setQuietEndError(false);
            setQuietEndDraft(null);
            update({ quietHoursEnd: val === '' ? null : val });
        } else {
            setQuietEndError(true);
            showErrorMessage('End time must be HH:MM (24-hour)');
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
                        <ChevronLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <Text className="font-inter" style={styles.title}>
                    Notification Preferences
                </Text>
                <Text className="font-inter" style={styles.subtitle}>
                    Control how and when you receive notifications.
                </Text>
            </LinearGradient>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <Text className="font-inter" style={styles.sectionTitle}>
                    Delivery Channels
                </Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowText}>
                            <Text className="font-inter" style={styles.rowLabel}>
                                In-App Notifications
                            </Text>
                            <Text className="font-inter" style={styles.rowDesc}>
                                Bell icon history is always shown — the system of record.
                            </Text>
                        </View>
                        <View style={styles.alwaysOnBadge}>
                            <Text className="font-inter" style={styles.alwaysOnText}>
                                Always on
                            </Text>
                        </View>
                    </View>
                    <ToggleRow
                        label="Push Notifications"
                        description="Lock-screen alerts on your devices."
                        checked={preference.pushEnabled}
                        disabled={!companyMasters.push}
                        disabledReason={!companyMasters.push ? 'Disabled by company administrator' : undefined}
                        onChange={(v) => update({ pushEnabled: v })}
                    />
                    <ToggleRow
                        label="Email Notifications"
                        description="Email alerts for important events."
                        checked={preference.emailEnabled}
                        disabled={!companyMasters.email}
                        disabledReason={!companyMasters.email ? 'Disabled by company administrator' : undefined}
                        onChange={(v) => update({ emailEnabled: v })}
                    />
                    <ToggleRow
                        label="SMS Notifications"
                        description="Text message alerts (if enabled by your company)."
                        checked={preference.smsEnabled}
                        disabled={!companyMasters.sms}
                        disabledReason={!companyMasters.sms ? 'Disabled by company administrator' : undefined}
                        onChange={(v) => update({ smsEnabled: v })}
                    />
                    <ToggleRow
                        label="WhatsApp Notifications"
                        description="WhatsApp alerts (if enabled by your company)."
                        checked={preference.whatsappEnabled}
                        disabled={!companyMasters.whatsapp}
                        disabledReason={!companyMasters.whatsapp ? 'Disabled by company administrator' : undefined}
                        onChange={(v) => update({ whatsappEnabled: v })}
                    />
                </View>

                <Text className="font-inter" style={styles.sectionTitle}>
                    Device Delivery
                </Text>
                <View style={styles.card}>
                    <RadioRow
                        label="All Devices"
                        description="Send to every signed-in device."
                        selected={preference.deviceStrategy === 'ALL'}
                        onPress={() => update({ deviceStrategy: 'ALL' })}
                    />
                    <RadioRow
                        label="Latest Device Only"
                        description="Only the most recently active device receives push notifications."
                        selected={preference.deviceStrategy === 'LATEST_ONLY'}
                        onPress={() => update({ deviceStrategy: 'LATEST_ONLY' })}
                    />
                </View>

                <Text className="font-inter" style={styles.sectionTitle}>
                    Quiet Hours
                </Text>
                <View style={styles.card}>
                    <ToggleRow
                        label="Enable Quiet Hours"
                        description="Suppress non-critical notifications during the set window. Critical alerts still arrive."
                        checked={preference.quietHoursEnabled}
                        onChange={(v) => update({ quietHoursEnabled: v })}
                    />
                    {preference.quietHoursEnabled ? (
                        <View style={styles.timeRow}>
                            <View style={styles.timeField}>
                                <Text className="font-inter" style={styles.timeLabel}>
                                    Start (HH:MM)
                                </Text>
                                <TextInput
                                    value={quietStartDraft ?? preference.quietHoursStart ?? ''}
                                    onChangeText={(text) => {
                                        setQuietStartDraft(text);
                                        if (quietStartError) setQuietStartError(false);
                                    }}
                                    onBlur={commitQuietStart}
                                    placeholder="22:00"
                                    style={[styles.timeInput, quietStartError && styles.timeInputError]}
                                    maxLength={5}
                                    keyboardType="numbers-and-punctuation"
                                />
                            </View>
                            <View style={styles.timeField}>
                                <Text className="font-inter" style={styles.timeLabel}>
                                    End (HH:MM)
                                </Text>
                                <TextInput
                                    value={quietEndDraft ?? preference.quietHoursEnd ?? ''}
                                    onChangeText={(text) => {
                                        setQuietEndDraft(text);
                                        if (quietEndError) setQuietEndError(false);
                                    }}
                                    onBlur={commitQuietEnd}
                                    placeholder="07:00"
                                    style={[styles.timeInput, quietEndError && styles.timeInputError]}
                                    maxLength={5}
                                    keyboardType="numbers-and-punctuation"
                                />
                            </View>
                        </View>
                    ) : null}
                </View>

                <Text className="font-inter" style={styles.sectionTitle}>
                    Test Notification
                </Text>
                <View style={styles.card}>
                    <Text className="font-inter" style={styles.testDesc}>
                        Send a test notification to yourself to verify delivery through your enabled channels.
                    </Text>
                    <TouchableOpacity
                        style={styles.testBtn}
                        onPress={() => testMutation.mutate()}
                        disabled={testMutation.isPending}
                        activeOpacity={0.8}
                    >
                        <Text className="font-inter" style={styles.testBtnText}>
                            {testMutation.isPending ? 'Sending…' : 'Send Test Notification'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    errorText: { fontSize: 16, color: '#DC2626', marginBottom: 16 },
    retryBtn: {
        backgroundColor: colors.primary[500],
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
    },
    retryText: { color: '#FFFFFF', fontWeight: '600' },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    backBtn: { padding: 4, marginLeft: -4 },
    title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 4 },
    subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 16,
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    rowText: { flex: 1, marginRight: 12 },
    rowLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
    rowDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
    rowWarning: { fontSize: 11, color: '#D97706', marginTop: 4 },
    alwaysOnBadge: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    alwaysOnText: { fontSize: 11, fontWeight: '600', color: '#4338CA' },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: { borderColor: colors.primary[500] },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[500] },
    timeRow: { flexDirection: 'row', padding: 12, gap: 12 },
    timeField: { flex: 1 },
    timeLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
    timeInput: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#0F172A',
        backgroundColor: '#FFFFFF',
    },
    timeInputError: {
        borderColor: '#DC2626',
        borderWidth: 2,
    },
    testDesc: { fontSize: 13, color: '#64748B', padding: 14, paddingBottom: 8 },
    testBtn: {
        backgroundColor: colors.primary[500],
        paddingVertical: 14,
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    testBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View, TouchableOpacity, TextInput } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { notificationApi, type NotificationPreferenceData, type NotificationPreferencesResponse } from '@/lib/api/notifications';
import colors from '@/components/ui/colors';

const PREF_KEY = ['notifications', 'preferences'] as const;

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
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
        {disabled && disabledReason ? (
          <Text style={styles.rowWarning}>{disabledReason}</Text>
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
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
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

  const { data, isLoading } = useQuery({
    queryKey: PREF_KEY,
    queryFn: () => notificationApi.getPreferences(),
    staleTime: 30_000,
  });

  const [pref, setPref] = useState<NotificationPreferenceData | null>(null);

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<NotificationPreferenceData>) => notificationApi.updatePreferences(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PREF_KEY });
    },
    onError: (err: any) => {
      Alert.alert('Update failed', err?.message ?? 'Could not update preferences');
    },
  });

  const testMutation = useMutation({
    mutationFn: () => notificationApi.sendTestNotification(),
    onSuccess: () => Alert.alert('Test notification sent', 'Check your notification bell to see it.'),
    onError: (err: any) => Alert.alert('Test failed', err?.message ?? 'Could not send test notification'),
  });

  useEffect(() => {
    const envelope = data as any;
    const loaded: NotificationPreferencesResponse | undefined =
      envelope?.data ?? envelope;
    if (loaded?.preference) setPref(loaded.preference);
  }, [data]);

  const envelope = data as any;
  const companyMasters = (envelope?.data?.companyMasters ?? envelope?.companyMasters) as
    | NotificationPreferencesResponse['companyMasters']
    | undefined;

  const update = (patch: Partial<NotificationPreferenceData>) => {
    if (!pref) return;
    setPref({ ...pref, ...patch });
    updateMutation.mutate(patch);
  };

  if (isLoading || !pref || !companyMasters) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Notification Preferences</Text>
        <Text style={styles.subtitle}>
          Control how and when you receive notifications.
        </Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Delivery Channels</Text>
        <View style={styles.card}>
          <ToggleRow
            label="In-App Notifications"
            description="Always enabled — in-app is the system of record."
            checked={pref.inAppEnabled}
            disabled={true}
            disabledReason="Cannot be disabled — shown in bell icon."
            onChange={() => {}}
          />
          <ToggleRow
            label="Push Notifications"
            description="Lock-screen alerts on your devices."
            checked={pref.pushEnabled}
            disabled={!companyMasters.push}
            disabledReason={!companyMasters.push ? 'Disabled by company administrator' : undefined}
            onChange={(v) => update({ pushEnabled: v })}
          />
          <ToggleRow
            label="Email Notifications"
            description="Email alerts for important events."
            checked={pref.emailEnabled}
            disabled={!companyMasters.email}
            disabledReason={!companyMasters.email ? 'Disabled by company administrator' : undefined}
            onChange={(v) => update({ emailEnabled: v })}
          />
          <ToggleRow
            label="SMS Notifications"
            description="Text message alerts (if enabled by your company)."
            checked={pref.smsEnabled}
            disabled={!companyMasters.sms}
            disabledReason={!companyMasters.sms ? 'Disabled by company administrator' : undefined}
            onChange={(v) => update({ smsEnabled: v })}
          />
          <ToggleRow
            label="WhatsApp Notifications"
            description="WhatsApp alerts (if enabled by your company)."
            checked={pref.whatsappEnabled}
            disabled={!companyMasters.whatsapp}
            disabledReason={!companyMasters.whatsapp ? 'Disabled by company administrator' : undefined}
            onChange={(v) => update({ whatsappEnabled: v })}
          />
        </View>

        <Text style={styles.sectionTitle}>Device Delivery</Text>
        <View style={styles.card}>
          <RadioRow
            label="All Devices"
            description="Send to every signed-in device."
            selected={pref.deviceStrategy === 'ALL'}
            onPress={() => update({ deviceStrategy: 'ALL' })}
          />
          <RadioRow
            label="Latest Device Only"
            description="Only the most recently active device receives push notifications."
            selected={pref.deviceStrategy === 'LATEST_ONLY'}
            onPress={() => update({ deviceStrategy: 'LATEST_ONLY' })}
          />
        </View>

        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <View style={styles.card}>
          <ToggleRow
            label="Enable Quiet Hours"
            description="Suppress non-critical notifications during the set window. Critical alerts still arrive."
            checked={pref.quietHoursEnabled}
            onChange={(v) => update({ quietHoursEnabled: v })}
          />
          {pref.quietHoursEnabled ? (
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Start (HH:MM)</Text>
                <TextInput
                  value={pref.quietHoursStart ?? ''}
                  onChangeText={(text) => update({ quietHoursStart: text })}
                  placeholder="22:00"
                  style={styles.timeInput}
                  maxLength={5}
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>End (HH:MM)</Text>
                <TextInput
                  value={pref.quietHoursEnd ?? ''}
                  onChangeText={(text) => update({ quietHoursEnd: text })}
                  placeholder="07:00"
                  style={styles.timeInput}
                  maxLength={5}
                />
              </View>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Test Notification</Text>
        <View style={styles.card}>
          <Text style={styles.testDesc}>
            Send a test notification to yourself to verify delivery through your enabled channels.
          </Text>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.testBtnText}>
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter', fontWeight: '500' },
  title: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Inter', fontWeight: '700', marginTop: 4 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'Inter', marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter',
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
  rowLabel: { fontSize: 15, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A' },
  rowDesc: { fontSize: 12, fontFamily: 'Inter', color: '#64748B', marginTop: 2 },
  rowWarning: { fontSize: 11, fontFamily: 'Inter', color: '#D97706', marginTop: 4 },
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
  timeLabel: { fontSize: 12, fontFamily: 'Inter', color: '#64748B', marginBottom: 4 },
  timeInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  testDesc: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#64748B',
    padding: 14,
    paddingBottom: 8,
  },
  testBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  testBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
});

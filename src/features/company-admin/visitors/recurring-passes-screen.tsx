/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { DropdownField } from '@/components/ui/dropdown-field';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';

import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { useCreateRecurringPass, useRevokeRecurringPass, useCheckInRecurringPass } from '@/features/company-admin/api/use-visitor-mutations';
import { useRecurringPasses, useGates } from '@/features/company-admin/api/use-visitor-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface RecurringPassItem {
  id: string;
  passNumber: string;
  visitorName: string;
  visitorCompany: string;
  visitorMobile: string;
  passType: string;
  validFrom: string;
  validUntil: string;
  status: string;
  hostEmployeeId: string;
  purpose: string;
  plantId: string;
  qrCode?: string;
}

// ============ STATUS CONFIG ============

const PASS_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: 'Active', bg: colors.success[50], text: colors.success[700] },
  EXPIRED: { label: 'Expired', bg: colors.neutral[100], text: colors.neutral[500] },
  REVOKED: { label: 'Revoked', bg: colors.danger[50], text: colors.danger[700] },
};

const PASS_TYPE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'QUARTERLY', label: 'Quarterly' },
  { key: 'ANNUAL', label: 'Annual' },
];

// ============ CREATE MODAL ============

function CreatePassModal({
  visible,
  onClose,
  onSave,
  isSaving,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: Record<string, unknown>) => void;
  readonly isSaving: boolean;
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const [visitorName, setVisitorName] = React.useState('');
  const [visitorMobile, setVisitorMobile] = React.useState('');
  const [visitorEmail, setVisitorEmail] = React.useState('');
  const [visitorCompany, setVisitorCompany] = React.useState('');
  const [passType, setPassType] = React.useState('MONTHLY');
  const [hostEmployeeId, setHostEmployeeId] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [validFrom, setValidFrom] = React.useState('');
  const [validUntil, setValidUntil] = React.useState('');
  const [plantId, setPlantId] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { data: employeesResponse } = useEmployees({ limit: 500 });
  const employeeOptions = React.useMemo(() => {
    const raw = (employeesResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({
      id: e.id,
      name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeCode || e.id,
    }));
  }, [employeesResponse]);

  const { data: locationsResponse } = useCompanyLocations();
  const locationOptions = React.useMemo(() => {
    const raw = (locationsResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((l: any) => ({ id: l.id, name: l.name ?? l.code ?? l.id }));
  }, [locationsResponse]);

  React.useEffect(() => {
    if (visible) {
      setVisitorName(''); setVisitorMobile(''); setVisitorEmail(''); setVisitorCompany(''); setPassType('MONTHLY');
      setHostEmployeeId(''); setPurpose(''); setValidFrom(''); setValidUntil(''); setPlantId(''); setErrors({});
    }
  }, [visible]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!visitorName.trim()) e.visitorName = 'Visitor name is required';
    if (!visitorMobile.trim()) e.visitorMobile = 'Mobile number is required';
    if (!visitorCompany.trim()) e.visitorCompany = 'Company is required';
    if (!hostEmployeeId) e.hostEmployeeId = 'Host employee is required';
    if (!purpose.trim()) e.purpose = 'Purpose is required';
    if (!validFrom.trim()) e.validFrom = 'Valid from date is required';
    if (!validUntil.trim()) e.validUntil = 'Valid until date is required';
    if (!plantId) e.plantId = 'Plant is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      visitorName: visitorName.trim(),
      visitorMobile: visitorMobile.trim(),
      visitorEmail: visitorEmail.trim() || undefined,
      visitorCompany: visitorCompany.trim(),
      passType,
      hostEmployeeId,
      purpose: purpose.trim(),
      validFrom,
      validUntil,
      plantId,
      allowedDays: [1, 2, 3, 4, 5],
    });
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.white }}>
        <LinearGradient colors={[colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} />

        <View style={[formStyles.modalHeader, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={onClose} style={formStyles.backBtn} hitSlop={12}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">New Recurring Pass</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}>
            {/* Visitor Name */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Visitor Name <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.visitorName && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Full name" placeholderTextColor={colors.neutral[400]} value={visitorName} onChangeText={(v) => { setVisitorName(v); if (errors.visitorName) setErrors(prev => ({ ...prev, visitorName: '' })); }} />
              </View>
              {!!errors.visitorName && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.visitorName}</Text>}
            </View>

            {/* Mobile */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Mobile <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.visitorMobile && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Phone number" placeholderTextColor={colors.neutral[400]} value={visitorMobile} onChangeText={(v) => { setVisitorMobile(v); if (errors.visitorMobile) setErrors(prev => ({ ...prev, visitorMobile: '' })); }} keyboardType="phone-pad" />
              </View>
              {!!errors.visitorMobile && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.visitorMobile}</Text>}
            </View>

            {/* Email */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Email <Text className="font-inter text-[10px] text-neutral-400 normal-case">(for pass delivery)</Text>
              </Text>
              <View style={formStyles.inputWrap}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="visitor@company.com" placeholderTextColor={colors.neutral[400]} value={visitorEmail} onChangeText={setVisitorEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>

            {/* Company */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Company <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.visitorCompany && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Visitor's company" placeholderTextColor={colors.neutral[400]} value={visitorCompany} onChangeText={(v) => { setVisitorCompany(v); if (errors.visitorCompany) setErrors(prev => ({ ...prev, visitorCompany: '' })); }} />
              </View>
              {!!errors.visitorCompany && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.visitorCompany}</Text>}
            </View>

            {/* Pass Type */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Pass Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'].map(pt => {
                  const selected = pt === passType;
                  return (
                    <Pressable key={pt} onPress={() => setPassType(pt)} style={[formStyles.chip, selected && formStyles.chipActive]}>
                      <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{pt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Host Employee */}
            <DropdownField
              label="Host Employee"
              selected={hostEmployeeId}
              onSelect={(v) => { setHostEmployeeId(v); if (errors.hostEmployeeId) setErrors(prev => ({ ...prev, hostEmployeeId: '' })); }}
              options={employeeOptions}
              placeholder="Select host employee..."
              required
              error={errors.hostEmployeeId}
            />

            {/* Purpose */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Purpose <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.purpose && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Purpose of visits" placeholderTextColor={colors.neutral[400]} value={purpose} onChangeText={(v) => { setPurpose(v); if (errors.purpose) setErrors(prev => ({ ...prev, purpose: '' })); }} />
              </View>
              {!!errors.purpose && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.purpose}</Text>}
            </View>

            {/* Valid From */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Valid From <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.validFrom && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={validFrom} onChangeText={(v) => { setValidFrom(v); if (errors.validFrom) setErrors(prev => ({ ...prev, validFrom: '' })); }} />
              </View>
              {!!errors.validFrom && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.validFrom}</Text>}
            </View>

            {/* Valid Until */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Valid Until <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.validUntil && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={validUntil} onChangeText={(v) => { setValidUntil(v); if (errors.validUntil) setErrors(prev => ({ ...prev, validUntil: '' })); }} />
              </View>
              {!!errors.validUntil && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.validUntil}</Text>}
            </View>

            {/* Location (Plant) */}
            <DropdownField
              label="Location (Plant)"
              selected={plantId}
              onSelect={(v) => { setPlantId(v); if (errors.plantId) setErrors(prev => ({ ...prev, plantId: '' })); }}
              options={locationOptions}
              placeholder="Select location..."
              required
              error={errors.plantId}
            />

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
              <Pressable onPress={onClose} style={formStyles.cancelBtn}>
                <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">DISCARD</Text>
              </Pressable>
              <Pressable onPress={handleSave} disabled={isSaving} style={[formStyles.saveBtn, isSaving && { opacity: 0.5 }]}>
                <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Creating...' : 'CREATE'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ============ PASS CARD ============

function PassCard({
  item,
  index,
  onRevoke,
  onCheckIn,
  onShowQr,
  fmt,
}: {
  readonly item: RecurringPassItem;
  readonly index: number;
  readonly onRevoke: () => void;
  readonly onCheckIn: () => void;
  readonly onShowQr: () => void;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  const cfg = PASS_STATUS_CONFIG[item.status] ?? { label: item.status, bg: colors.neutral[100], text: colors.neutral[500] };

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <View style={cardStyles.card}>
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.visitorName}</Text>
              {item.passNumber ? (
                <View style={cardStyles.codeBadge}>
                  <Text className="font-inter text-[10px] font-bold text-primary-600">{item.passNumber}</Text>
                </View>
              ) : null}
            </View>
            {item.visitorCompany ? (
              <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.visitorCompany}</Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[cardStyles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text className="font-inter text-[10px] font-bold" style={{ color: cfg.text }}>{cfg.label}</Text>
            </View>
            {item.qrCode ? (
              <Pressable onPress={onShowQr} hitSlop={8}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14h3v3h-3zM14 17h3v3h-3zM17 20h3v3h-3z" stroke={colors.accent[500]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            ) : null}
            {item.status === 'ACTIVE' ? (
              <Pressable onPress={onRevoke} hitSlop={8}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M18.36 5.64a9 9 0 11-12.73 0M12 2v10" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={cardStyles.cardMeta}>
          <View style={cardStyles.metaChip}>
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.passType}</Text>
          </View>
          {item.purpose ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.purpose}</Text>
            </View>
          ) : null}
          {item.validFrom ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">From: {fmt.date(item.validFrom)}</Text>
            </View>
          ) : null}
          {item.validUntil ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Until: {fmt.date(item.validUntil)}</Text>
            </View>
          ) : null}
        </View>

        {item.status === 'ACTIVE' ? (
          <Pressable onPress={onCheckIn} style={cardStyles.checkInBtn}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text className="font-inter text-xs font-bold text-white">Check In</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function RecurringPassesScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const fmt = useCompanyFormatter();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [qrTarget, setQrTarget] = React.useState<RecurringPassItem | null>(null);
  const [checkInTarget, setCheckInTarget] = React.useState<RecurringPassItem | null>(null);
  const [checkInGateId, setCheckInGateId] = React.useState('');

  const queryParams = React.useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search.trim()) p.search = search.trim();
    if (typeFilter) p.passType = typeFilter;
    return p;
  }, [search, typeFilter]);

  const { data: response, isLoading, error, refetch, isFetching } = useRecurringPasses(queryParams);
  const createMutation = useCreateRecurringPass();
  const revokeMutation = useRevokeRecurringPass();
  const checkInMutation = useCheckInRecurringPass();
  const { data: gatesResponse } = useGates();
  const gateOptions = React.useMemo(() => {
    const raw = (gatesResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((g: any) => ({ id: g.id, name: `${g.name ?? ''} (${g.code ?? ''})` }));
  }, [gatesResponse]);

  const items: RecurringPassItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((p: any) => ({
      id: p.id ?? '',
      passNumber: p.passNumber ?? '',
      visitorName: p.visitorName ?? '',
      visitorCompany: p.visitorCompany ?? '',
      visitorMobile: p.visitorMobile ?? '',
      passType: p.passType ?? '',
      validFrom: p.validFrom ?? '',
      validUntil: p.validUntil ?? '',
      status: p.status ?? 'ACTIVE',
      hostEmployeeId: p.hostEmployeeName ?? p.hostEmployeeId ?? '',
      purpose: p.purpose ?? '',
      plantId: p.plantId ?? '',
      qrCode: p.qrCode ?? undefined,
    }));
  }, [response]);

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => { setShowCreateModal(false); showSuccess('Recurring pass created'); },
    });
  };

  const handleRevoke = (item: RecurringPassItem) => {
    showConfirm({
      title: 'Revoke Pass',
      message: `Revoke pass "${item.passNumber}" for ${item.visitorName}? This cannot be undone.`,
      confirmText: 'Revoke',
      variant: 'danger',
      onConfirm: () => revokeMutation.mutate({ id: item.id, reason: 'Revoked by admin' }, {
        onSuccess: () => showSuccess('Pass revoked'),
      }),
    });
  };

  const handleCheckIn = () => {
    if (!checkInTarget || !checkInGateId) return;
    checkInMutation.mutate(
      { id: checkInTarget.id, data: { gateId: checkInGateId } },
      {
        onSuccess: () => {
          showSuccess('Visitor checked in via recurring pass');
          setCheckInTarget(null);
          setCheckInGateId('');
        },
      },
    );
  };

  const handleShareQr = async (item: RecurringPassItem) => {
    try {
      await Share.share({
        message: `Recurring Pass: ${item.passNumber}\nVisitor: ${item.visitorName}\nCompany: ${item.visitorCompany}`,
        title: `Pass ${item.passNumber}`,
      });
    } catch {
      // User cancelled share
    }
  };

  const renderItem = ({ item, index }: { readonly item: RecurringPassItem; readonly index: number }) => (
    <PassCard
      item={item}
      index={index}
      onRevoke={() => handleRevoke(item)}
      onCheckIn={() => setCheckInTarget(item)}
      onShowQr={() => setQrTarget(item)}
      fmt={fmt}
    />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Recurring Passes</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} pass{items.length !== 1 ? 'es' : ''}</Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, company, pass number..."
          filters={PASS_TYPE_FILTERS}
          activeFilter={typeFilter}
          onFilterChange={setTypeFilter}
        />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim() || typeFilter) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No passes match your filters." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No recurring passes" message="Create your first recurring pass." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Recurring Passes" onMenuPress={toggle} />

      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
      />

      <FAB onPress={() => setShowCreateModal(true)} />

      <CreatePassModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} isSaving={createMutation.isPending} />

      <ConfirmModal {...confirmModalProps} />

      {/* QR Code Modal */}
      <Modal visible={!!qrTarget} transparent animationType="fade" onRequestClose={() => setQrTarget(null)}>
        <View style={modalStyles.overlay}>
          <Animated.View entering={FadeInUp.duration(300)} style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">Pass QR Code</Text>
              <Pressable onPress={() => setQrTarget(null)} hitSlop={12}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M18 6L6 18M6 6l12 12" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>
            {qrTarget?.qrCode ? (
              <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24 }}>
                <View style={modalStyles.qrWrapper}>
                  <Image source={{ uri: qrTarget.qrCode }} style={{ width: 200, height: 200 }} resizeMode="contain" />
                </View>
                <Text className="mt-4 font-inter text-sm font-bold text-primary-950 dark:text-white">{qrTarget.passNumber}</Text>
                <Text className="mt-1 font-inter text-sm font-semibold text-neutral-700 dark:text-neutral-300">{qrTarget.visitorName}</Text>
                {qrTarget.visitorCompany ? (
                  <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">{qrTarget.visitorCompany}</Text>
                ) : null}
                <Text className="mt-2 font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                  {qrTarget.validFrom ? fmt.date(qrTarget.validFrom) : '---'} to {qrTarget.validUntil ? fmt.date(qrTarget.validUntil) : '---'}
                </Text>
                <Pressable onPress={() => handleShareQr(qrTarget)} style={modalStyles.shareBtn}>
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text className="font-inter text-sm font-bold text-white">Share</Text>
                </Pressable>
              </View>
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      {/* Check-In Gate Modal */}
      <Modal visible={!!checkInTarget} transparent animationType="fade" onRequestClose={() => { setCheckInTarget(null); setCheckInGateId(''); }}>
        <View style={modalStyles.overlay}>
          <Animated.View entering={FadeInUp.duration(300)} style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">Check In via Pass</Text>
              <Pressable onPress={() => { setCheckInTarget(null); setCheckInGateId(''); }} hitSlop={12}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M18 6L6 18M6 6l12 12" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
              <Text className="mb-4 font-inter text-sm text-neutral-500 dark:text-neutral-400">
                Check in <Text className="font-inter font-bold text-primary-950 dark:text-white">{checkInTarget?.visitorName}</Text> at which gate?
              </Text>
              <DropdownField
                label="Gate"
                selected={checkInGateId}
                onSelect={setCheckInGateId}
                options={gateOptions}
                placeholder="Select gate..."
                required
              />
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
                <Pressable
                  onPress={() => { setCheckInTarget(null); setCheckInGateId(''); }}
                  style={modalStyles.cancelBtn}
                >
                  <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">CANCEL</Text>
                </Pressable>
                <Pressable
                  onPress={handleCheckIn}
                  disabled={checkInMutation.isPending || !checkInGateId}
                  style={[modalStyles.confirmBtn, (checkInMutation.isPending || !checkInGateId) && { opacity: 0.5 }]}
                >
                  <Text className="font-inter text-sm font-bold text-white">
                    {checkInMutation.isPending ? 'Checking In...' : 'CHECK IN'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  listContent: { paddingHorizontal: 24 },
});

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: colors.primary[50] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  codeBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  checkInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.success[600] },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { backgroundColor: colors.white, borderRadius: 24, width: '100%', maxWidth: 360, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  qrWrapper: { backgroundColor: colors.white, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[100] },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, backgroundColor: colors.primary[600] },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
  confirmBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: colors.success[600], justifyContent: 'center', alignItems: 'center' },
});

const formStyles = StyleSheet.create({
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
  saveBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

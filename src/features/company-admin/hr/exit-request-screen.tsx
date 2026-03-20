/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';

import { useExitRequests } from '@/features/company-admin/api/use-offboarding-queries';
import { useCreateExitRequest, useUpdateExitRequest } from '@/features/company-admin/api/use-offboarding-mutations';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';

// ============ TYPES ============

type SeparationType = 'Resignation' | 'Retirement' | 'Termination' | 'Layoff' | 'Death';
type ExitStatus = 'Initiated' | 'Notice Period' | 'Clearance Pending' | 'Interview Done' | 'F&F Pending' | 'Closed';

interface ExitRequestItem {
  id: string;
  employeeId: string;
  employeeName: string;
  separationType: SeparationType;
  resignationDate: string;
  lastWorkingDate: string;
  noticePeriodDays: number;
  noticeWaiver: boolean;
  status: ExitStatus;
  createdAt: string;
}

// ============ CONSTANTS ============

const SEPARATION_TYPES: SeparationType[] = ['Resignation', 'Retirement', 'Termination', 'Layoff', 'Death'];
const STATUS_FILTERS: ('All' | ExitStatus)[] = ['All', 'Initiated', 'Notice Period', 'Clearance Pending', 'Interview Done', 'F&F Pending', 'Closed'];

const SEPARATION_COLORS: Record<SeparationType, { bg: string; text: string }> = {
  Resignation: { bg: colors.info[50], text: colors.info[700] },
  Retirement: { bg: colors.success[50], text: colors.success[700] },
  Termination: { bg: colors.danger[50], text: colors.danger[700] },
  Layoff: { bg: colors.warning[50], text: colors.warning[700] },
  Death: { bg: colors.neutral[100], text: colors.neutral[600] },
};

const STATUS_COLORS: Record<ExitStatus, { bg: string; text: string; dot: string }> = {
  'Initiated': { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
  'Notice Period': { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
  'Clearance Pending': { bg: colors.accent[50], text: colors.accent[700], dot: colors.accent[500] },
  'Interview Done': { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
  'F&F Pending': { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
  'Closed': { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
};

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: ExitStatus }) {
  const scheme = STATUS_COLORS[status] ?? STATUS_COLORS.Initiated;
  return (
    <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: scheme.dot }]} />
      <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
    </View>
  );
}

function SeparationBadge({ type }: { type: SeparationType }) {
  const scheme = SEPARATION_COLORS[type] ?? SEPARATION_COLORS.Resignation;
  return (
    <View style={[styles.separationBadge, { backgroundColor: scheme.bg }]}>
      <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{type}</Text>
    </View>
  );
}

function AvatarCircle({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={styles.avatar}>
      <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
    </View>
  );
}

function Dropdown({
  label, value, options, onSelect, placeholder, required,
}: {
  label: string; value: string; options: { id: string; label: string }[];
  onSelect: (id: string) => void; placeholder?: string; required?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');

  const filteredOptions = React.useMemo(() => {
    if (!searchText.trim()) return options;
    const q = searchText.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, searchText]);

  return (
    <View style={styles.fieldWrap}>
      <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
        {label} {required && <Text className="text-danger-500">*</Text>}
      </Text>
      <Pressable onPress={() => { setOpen(true); setSearchText(''); }} style={styles.dropdownBtn}>
        <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
          {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
        </Text>
        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
          <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
            <View style={styles.sheetHandle} />
            <Text className="font-inter text-base font-bold text-primary-950 mb-3">{label}</Text>
            <View style={[styles.inputWrap, { marginBottom: 12 }]}>
              <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={searchText} onChangeText={setSearchText} autoCapitalize="none" />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredOptions.map(opt => (
                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                  <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt.label}</Text>
                </Pressable>
              ))}
              {filteredOptions.length === 0 && (
                <Text className="py-4 text-center font-inter text-sm text-neutral-400">No options found</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
  return (
    <View style={styles.fieldWrap}>
      <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => {
          const selected = opt === value;
          return (
            <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
              <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ============ INITIATE EXIT MODAL ============

function InitiateExitModal({
  visible, onClose, onSave, isSaving, employeeOptions,
}: {
  visible: boolean; onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  isSaving: boolean;
  employeeOptions: { id: string; label: string }[];
}) {
  const insets = useSafeAreaInsets();
  const [employeeId, setEmployeeId] = React.useState('');
  const [separationType, setSeparationType] = React.useState<SeparationType>('Resignation');
  const [resignationDate, setResignationDate] = React.useState('');
  const [lastWorkingDate, setLastWorkingDate] = React.useState('');
  const [noticeWaiver, setNoticeWaiver] = React.useState(false);
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (visible) {
      setEmployeeId(''); setSeparationType('Resignation'); setResignationDate('');
      setLastWorkingDate(''); setNoticeWaiver(false); setReason('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.formSheet, { paddingBottom: insets.bottom + 16, maxHeight: '85%' }]}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Initiate Exit</Text>

            <Dropdown
              label="Employee" value={employeeId} options={employeeOptions}
              onSelect={setEmployeeId} placeholder="Select Employee" required
            />

            <ChipSelector
              label="Separation Type" options={SEPARATION_TYPES as unknown as string[]}
              value={separationType} onSelect={(v) => setSeparationType(v as SeparationType)}
            />

            <View style={styles.fieldWrap}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                Resignation Date <Text className="text-danger-500">*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <TextInput style={styles.textInput} value={resignationDate} onChangeText={setResignationDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} />
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Last Working Date</Text>
              <View style={styles.inputWrap}>
                <TextInput style={styles.textInput} value={lastWorkingDate} onChangeText={setLastWorkingDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} />
              </View>
            </View>

            <View style={[styles.fieldWrap, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text className="font-inter text-sm font-semibold text-primary-900">Notice Period Waiver</Text>
              <Switch value={noticeWaiver} onValueChange={setNoticeWaiver} trackColor={{ true: colors.primary[500], false: colors.neutral[200] }} />
            </View>

            <View style={styles.fieldWrap}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Reason / Notes</Text>
              <View style={styles.inputWrap}>
                <TextInput style={[styles.textInput, { minHeight: 60 }]} value={reason} onChangeText={setReason}
                  placeholder="Optional notes..." placeholderTextColor={colors.neutral[400]} multiline />
              </View>
            </View>

            <Pressable
              onPress={() => onSave({ employeeId, separationType, resignationDate, lastWorkingDate, noticeWaiver, reason })}
              disabled={isSaving || !employeeId || !resignationDate}
              style={[styles.saveBtn, (!employeeId || !resignationDate) && { opacity: 0.5 }]}
            >
              <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Submit'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============ EXIT REQUEST CARD ============

function ExitRequestCard({ item, index, onPress }: { item: ExitRequestItem; index: number; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <Pressable onPress={onPress} style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <AvatarCircle name={item.employeeName} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <SeparationBadge type={item.separationType} />
              <StatusBadge status={item.status} />
            </View>
          </View>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.cardField}>
            <Text className="font-inter text-[10px] text-neutral-400">Resignation Date</Text>
            <Text className="font-inter text-xs font-semibold text-primary-900">{item.resignationDate || '--'}</Text>
          </View>
          <View style={styles.cardField}>
            <Text className="font-inter text-[10px] text-neutral-400">Last Working Day</Text>
            <Text className="font-inter text-xs font-semibold text-primary-900">{item.lastWorkingDate || '--'}</Text>
          </View>
          <View style={styles.cardField}>
            <Text className="font-inter text-[10px] text-neutral-400">Notice (days)</Text>
            <Text className="font-inter text-xs font-semibold text-primary-900">{item.noticePeriodDays ?? '--'}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============ MAIN SCREEN ============

export function ExitRequestScreen() {
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const router = useRouter();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'All' | ExitStatus>('All');
  const [showForm, setShowForm] = React.useState(false);

  const { data: exitData, isLoading, refetch } = useExitRequests();
  const { data: empData } = useEmployees();
  const createMutation = useCreateExitRequest();

  const confirmModal = useConfirmModal();

  const exitRequests: ExitRequestItem[] = React.useMemo(() => {
    const raw = (exitData as any)?.data ?? (exitData as any) ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [exitData]);

  const employeeOptions = React.useMemo(() => {
    const raw = (empData as any)?.data ?? (empData as any) ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({ id: e.id, label: e.name || `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() }));
  }, [empData]);

  const filtered = React.useMemo(() => {
    let list = exitRequests;
    if (statusFilter !== 'All') list = list.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.employeeName?.toLowerCase().includes(q));
    }
    return list;
  }, [exitRequests, statusFilter, search]);

  const handleSave = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => { setShowForm(false); refetch(); },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <HamburgerButton onPress={toggle} />
          <Text className="font-inter text-white text-lg font-bold ml-3">Exit Requests</Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search employees..." />
        </View>
      </LinearGradient>

      {/* Status filter chips */}
      <Animated.View entering={FadeInUp.delay(80).duration(350)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {STATUS_FILTERS.map(s => {
            const active = s === statusFilter;
            return (
              <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{s}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* List */}
      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState title="No exit requests" message="Tap + to initiate an exit" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <ExitRequestCard item={item} index={index} onPress={() => router.push(`/company/hr/clearance-dashboard?exitRequestId=${item.id}` as any)} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary[500]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB onPress={() => setShowForm(true)} />

      <InitiateExitModal
        visible={showForm} onClose={() => setShowForm(false)}
        onSave={handleSave} isSaving={createMutation.isPending}
        employeeOptions={employeeOptions}
      />

      <ConfirmModal {...confirmModal.modalProps} />
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gradient.surface },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.neutral[100],
    shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardField: { flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 100, gap: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  separationBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100,
    borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.white,
  },
  filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  formSheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200],
    alignSelf: 'center', marginBottom: 16,
  },
  fieldWrap: { marginBottom: 16 },
  inputWrap: {
    borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 12,
    backgroundColor: colors.neutral[50], paddingHorizontal: 14,
  },
  textInput: {
    fontFamily: 'Inter', fontSize: 14, color: colors.primary[950],
    paddingVertical: 12,
  },
  dropdownBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 12,
    backgroundColor: colors.neutral[50], paddingHorizontal: 14, paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
    borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.neutral[50],
  },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  saveBtn: {
    backgroundColor: colors.primary[600], borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
});

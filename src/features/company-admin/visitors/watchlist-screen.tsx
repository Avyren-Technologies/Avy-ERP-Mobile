/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';

import { useCreateWatchlistEntry } from '@/features/company-admin/api/use-visitor-mutations';
import { useWatchlist } from '@/features/company-admin/api/use-visitor-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface WatchlistItem {
  id: string;
  personName: string;
  mobileNumber: string;
  email: string;
  idNumber: string;
  reason: string;
  type: string; // BLOCKLIST | WATCHLIST
  blockDuration: string; // PERMANENT | UNTIL_DATE
  expiryDate: string;
  createdBy: string;
  createdAt: string;
}

// ============ ADD ENTRY MODAL ============

function AddEntryModal({
  visible,
  onClose,
  onSubmit,
  isPending,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: Record<string, unknown>) => void;
  readonly isPending: boolean;
}) {
  const isDark = useIsDark();
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [entryType, setEntryType] = React.useState('BLOCKLIST');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) { setName(''); setPhone(''); setEmail(''); setReason(''); setEntryType('BLOCKLIST'); setErrors({}); }
  }, [visible]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!reason.trim()) e.reason = 'Reason is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      personName: name.trim(),
      mobileNumber: phone.trim() || undefined,
      email: email.trim() || undefined,
      reason: reason.trim(),
      type: entryType,
      blockDuration: 'PERMANENT',
      appliesToAllPlants: true,
      plantIds: [],
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[formStyles.sheet, { paddingBottom: 40 }]}>
            <View style={formStyles.sheetHandle} />
            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-4">Add to Watchlist</Text>

            {/* Type */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Type</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['BLOCKLIST', 'WATCHLIST'].map(t => {
                  const selected = t === entryType;
                  return (
                    <Pressable key={t} onPress={() => setEntryType(t)} style={[formStyles.chip, selected && (t === 'BLOCKLIST' ? formStyles.chipDanger : formStyles.chipWarning)]}>
                      <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{t === 'BLOCKLIST' ? 'BLOCKLIST' : 'WATCHLIST'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Name */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Name <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.name && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Visitor name" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={(v) => { setName(v); if (errors.name) setErrors(prev => ({ ...prev, name: '' })); }} />
              </View>
              {!!errors.name && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.name}</Text>}
            </View>

            {/* Phone */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Phone</Text>
              <View style={formStyles.inputWrap}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Phone number" placeholderTextColor={colors.neutral[400]} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </View>
            </View>

            {/* Reason */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Reason <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, { height: 80 }, !!errors.reason && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }, { textAlignVertical: 'top' }]} placeholder="Why is this person flagged?" placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={(v) => { setReason(v); if (errors.reason) setErrors(prev => ({ ...prev, reason: '' })); }} multiline />
              </View>
              {!!errors.reason && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.reason}</Text>}
            </View>

            <Pressable onPress={handleSubmit} disabled={isPending} style={[formStyles.submitBtn, isPending && { opacity: 0.5 }]}>
              <Text className="font-inter text-sm font-bold text-white">{isPending ? 'Adding...' : 'ADD ENTRY'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ============ WATCHLIST CARD ============

function WatchlistCard({
  item,
  index,
}: {
  readonly item: WatchlistItem;
  readonly index: number;
}) {
  const isBlocked = item.type === 'BLOCKLIST';
  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <View style={[cardStyles.card, { borderLeftColor: isBlocked ? colors.danger[500] : colors.warning[500], borderLeftWidth: 3 }]}>
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.personName}</Text>
            {item.mobileNumber ? (
              <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.mobileNumber}</Text>
            ) : null}
          </View>
          <View style={[cardStyles.typeBadge, { backgroundColor: isBlocked ? colors.danger[50] : colors.warning[50] }]}>
            <Text className={`font-inter text-[10px] font-bold ${isBlocked ? 'text-danger-700' : 'text-warning-700'}`}>{isBlocked ? 'Blocked' : 'Watch'}</Text>
          </View>
        </View>
        <Text className="mt-2 font-inter text-xs text-neutral-600 dark:text-neutral-300">{item.reason}</Text>
        {item.blockDuration === 'UNTIL_DATE' && item.expiryDate ? (
          <Text className="mt-1 font-inter text-[10px] text-neutral-400">Expires: {item.expiryDate.split('T')[0]}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function WatchlistScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();

  const [search, setSearch] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'' | 'BLOCKLIST' | 'WATCHLIST'>('');
  const [showAddModal, setShowAddModal] = React.useState(false);

  const queryParams = React.useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search.trim()) p.search = search.trim();
    if (activeTab) p.type = activeTab;
    return p;
  }, [search, activeTab]);

  const { data: response, isLoading, error, refetch, isFetching } = useWatchlist(queryParams);
  const createMutation = useCreateWatchlistEntry();

  const items: WatchlistItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((w: any) => ({
      id: w.id ?? '',
      personName: w.personName ?? '',
      mobileNumber: w.mobileNumber ?? '',
      email: w.email ?? '',
      idNumber: w.idNumber ?? '',
      reason: w.reason ?? '',
      type: w.type ?? 'BLOCKLIST',
      blockDuration: w.blockDuration ?? 'PERMANENT',
      expiryDate: w.expiryDate ?? '',
      createdBy: w.createdBy ?? '',
      createdAt: w.createdAt ?? '',
    }));
  }, [response]);

  const handleAdd = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => { setShowAddModal(false); showSuccess('Watchlist entry added'); },
    });
  };

  const renderItem = ({ item, index }: { readonly item: WatchlistItem; readonly index: number }) => (
    <WatchlistCard item={item} index={index} />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Watchlist</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} entr{items.length !== 1 ? 'ies' : 'y'}</Text>

      {/* Tabs */}
      <View style={s.tabRow}>
        {[
          { key: '' as const, label: 'All' },
          { key: 'BLOCKLIST' as const, label: 'Blocked' },
          { key: 'WATCHLIST' as const, label: 'Watch' },
        ].map(tab => (
          <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[s.tab, activeTab === tab.key && s.tabActive]}>
            <Text className={`font-inter text-xs font-bold ${activeTab === tab.key ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ marginTop: 12 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or phone..." />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim() || activeTab) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No watchlist entries match your filters." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No watchlist entries" message="Add visitors to block or flag." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Watchlist" onMenuPress={toggle} />

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

      <FAB onPress={() => setShowAddModal(true)} />

      <AddEntryModal visible={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleAdd} isPending={createMutation.isPending} />
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  listContent: { paddingHorizontal: 24 },
  tabRow: { flexDirection: 'row', marginTop: 16, backgroundColor: isDark ? '#1A1730' : colors.neutral[100], borderRadius: 12, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: colors.primary[600] },
});

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
});

const formStyles = StyleSheet.create({
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
  chipDanger: { backgroundColor: colors.danger[600], borderColor: colors.danger[600] },
  chipWarning: { backgroundColor: colors.warning[600], borderColor: colors.warning[600] },
  submitBtn: { height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', marginTop: 8 },
});

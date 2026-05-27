import { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, ScrollView, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft, Factory, Zap, Copy, Check, AlertCircle, Eye, X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useIndustryTemplates, useIndustryTemplate } from '@/features/inventory/api/use-inventory-queries';
import {
  useActivateIndustryTemplate,
  useCloneIndustryTemplate,
  useUpdateFieldConfig,
  useSeedIndustryTemplates,
} from '@/features/inventory/api/use-inventory-mutations';

type FilterType = 'all' | 'system' | 'custom';

const FEFO_COLORS: Record<string, { bg: string; text: string }> = {
  OFF: { bg: '#f5f5f5', text: '#737373' },
  SOFT: { bg: '#fef3c7', text: '#b45309' },
  HARD: { bg: '#fee2e2', text: '#b91c1c' },
};

export function IndustryTemplateConfigScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [detailTab, setDetailTab] = useState<'overview' | 'fields' | 'defaults'>('overview');

  const { data: templatesData, isLoading, refetch, isRefetching } = useIndustryTemplates();
  const templates: any[] = (templatesData as any)?.data || [];

  const { data: detailData, isLoading: detailLoading } = useIndustryTemplate(selectedId);
  const detail: any = (detailData as any)?.data || null;

  const activateMutation = useActivateIndustryTemplate();
  const cloneMutation = useCloneIndustryTemplate();
  const updateFieldMutation = useUpdateFieldConfig();
  const seedMutation = useSeedIndustryTemplates();

  const filtered = useMemo(() => {
    if (filter === 'system') return templates.filter((t: any) => t.isSystem);
    if (filter === 'custom') return templates.filter((t: any) => !t.isSystem);
    return templates;
  }, [templates, filter]);

  const openDetail = useCallback((id: string) => {
    setSelectedId(id);
    setDetailTab('overview');
    bottomSheetRef.current?.expand();
  }, []);

  const handleActivate = () => {
    if (!selectedId) return;
    activateMutation.mutate(selectedId);
  };

  const handleClone = () => {
    if (!selectedId || !detail) return;
    cloneMutation.mutate({ id: selectedId, data: { displayName: `${detail.displayName} (Copy)` } });
  };

  const handleFieldToggle = (fieldId: string, field: string, value: boolean) => {
    if (!selectedId) return;
    updateFieldMutation.mutate({ templateId: selectedId, fieldId, data: { [field]: value } });
  };

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const isActive = item.isActive;
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <TouchableOpacity
          style={[styles.card, isActive && styles.activeCard]}
          onPress={() => openDetail(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, isActive && { backgroundColor: '#eef2ff' }]}>
              <Factory color={isActive ? colors.primary[600] : colors.neutral[500]} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text className="text-sm font-bold font-inter text-neutral-900" numberOfLines={1} style={{ flex: 1 }}>
                  {item.displayName || item.industryType}
                </Text>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text className="text-[10px] font-bold font-inter" style={{ color: colors.primary[700] }}>Active</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs font-inter text-neutral-500" numberOfLines={1}>{item.description || '--'}</Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={[styles.typeBadge, item.isSystem ? { backgroundColor: '#dbeafe' } : { backgroundColor: '#ede9fe' }]}>
              <Text className="text-[10px] font-bold font-inter" style={{ color: item.isSystem ? '#1d4ed8' : '#6d28d9' }}>
                {item.isSystem ? 'System' : 'Custom'}
              </Text>
            </View>
            {item.fefoEnforcement && item.fefoEnforcement !== 'OFF' && (
              <View style={[styles.typeBadge, { backgroundColor: FEFO_COLORS[item.fefoEnforcement]?.bg || '#f5f5f5' }]}>
                <Text className="text-[10px] font-bold font-inter" style={{ color: FEFO_COLORS[item.fefoEnforcement]?.text || '#737373' }}>
                  FEFO: {item.fefoEnforcement}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [openDetail]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3" style={{ flex: 1 }}>Industry Templates</Text>
          <TouchableOpacity
            onPress={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            style={styles.seedBtn}
          >
            {seedMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-xs font-bold text-white font-inter">Seed</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {(['all', 'system', 'custom'] as FilterType[]).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
            >
              <Text className="text-xs font-semibold font-inter capitalize" style={{ color: filter === f ? colors.primary[600] : 'rgba(255,255,255,0.7)' }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={<EmptyState title="No Templates" message="No industry templates found" />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Bottom Sheet Detail */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['60%', '90%']}
        enablePanDownToClose
        backgroundStyle={{ borderRadius: 24, backgroundColor: '#fff' }}
        handleIndicatorStyle={{ backgroundColor: colors.neutral[300] }}
      >
        {detail ? (
          <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {/* Detail Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Factory color={colors.primary[500]} size={22} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text className="text-lg font-bold font-inter text-neutral-900">{detail.displayName || detail.industryType}</Text>
                <Text className="text-xs font-inter text-neutral-500">{detail.industryType} template</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {!detail.isActive && (
                <TouchableOpacity
                  onPress={handleActivate}
                  disabled={activateMutation.isPending}
                  style={[styles.actionBtn, { backgroundColor: colors.primary[600] }]}
                >
                  {activateMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Zap color="#fff" size={14} />
                      <Text className="text-xs font-bold text-white font-inter">Activate</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleClone} disabled={cloneMutation.isPending} style={[styles.actionBtn, styles.outlineBtn]}>
                {cloneMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.neutral[600]} />
                ) : (
                  <>
                    <Copy color={colors.neutral[600]} size={14} />
                    <Text className="text-xs font-bold font-inter text-neutral-600">Clone</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              {(['overview', 'fields', 'defaults'] as const).map(tab => (
                <TouchableOpacity key={tab} onPress={() => setDetailTab(tab)} style={[styles.tab, detailTab === tab && styles.tabActive]}>
                  <Text className="text-xs font-semibold font-inter capitalize" style={{ color: detailTab === tab ? colors.primary[600] : colors.neutral[400] }}>
                    {tab === 'fields' ? 'Fields' : tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            {detailTab === 'overview' && (
              <View style={{ gap: 16 }}>
                <Text className="text-sm font-inter text-neutral-700">{detail.description || 'No description'}</Text>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <ExtBadge label="Production" enabled={detail.enableProduction} />
                  <ExtBadge label="Tool Room" enabled={detail.enableToolRoom} />
                </View>

                {detail.fefoEnforcement && (
                  <View>
                    <Text className="text-xs font-semibold font-inter text-neutral-500 mb-1">FEFO Enforcement</Text>
                    <View style={[styles.typeBadge, { backgroundColor: FEFO_COLORS[detail.fefoEnforcement]?.bg || '#f5f5f5' }]}>
                      <Text className="text-xs font-bold font-inter" style={{ color: FEFO_COLORS[detail.fefoEnforcement]?.text || '#737373' }}>
                        {detail.fefoEnforcement}
                      </Text>
                    </View>
                  </View>
                )}

                {detail.activatedStatuses?.length > 0 && (
                  <View>
                    <Text className="text-xs font-semibold font-inter text-neutral-500 mb-1">Activated Statuses</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {detail.activatedStatuses.map((s: string) => (
                        <View key={s} style={[styles.typeBadge, { backgroundColor: '#d1fae5' }]}>
                          <Text className="text-[10px] font-bold font-inter" style={{ color: '#047857' }}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {detail.activatedReports?.length > 0 && (
                  <View>
                    <Text className="text-xs font-semibold font-inter text-neutral-500 mb-1">Activated Reports</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {detail.activatedReports.map((r: string) => (
                        <View key={r} style={[styles.typeBadge, { backgroundColor: '#e0f2fe' }]}>
                          <Text className="text-[10px] font-bold font-inter" style={{ color: '#0369a1' }}>{r}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {detailTab === 'fields' && (
              <View style={{ gap: 12 }}>
                {detail.isSystem && (
                  <View style={styles.warningBox}>
                    <AlertCircle color="#b45309" size={14} />
                    <Text className="text-xs font-inter" style={{ color: '#b45309', flex: 1 }}>System templates are read-only. Clone to edit.</Text>
                  </View>
                )}
                {(detail.fieldConfigs || []).length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Eye color={colors.neutral[300]} size={28} />
                    <Text className="text-xs font-inter text-neutral-400 mt-2">No field configurations</Text>
                  </View>
                ) : (
                  (detail.fieldConfigs || []).map((f: any) => (
                    <View key={f.id} style={styles.fieldCard}>
                      <Text className="text-sm font-semibold font-inter text-neutral-800">{f.fieldName}</Text>
                      <Text className="text-[10px] font-inter text-neutral-400">{f.sectionName || 'General'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text className="text-[10px] font-inter text-neutral-500">Visible</Text>
                          <Switch
                            value={f.isVisible}
                            onValueChange={v => handleFieldToggle(f.id, 'isVisible', v)}
                            disabled={detail.isSystem}
                            trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                            thumbColor={f.isVisible ? colors.primary[600] : '#f4f3f4'}
                            style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                          />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text className="text-[10px] font-inter text-neutral-500">Required</Text>
                          <Switch
                            value={f.isMandatory}
                            onValueChange={v => handleFieldToggle(f.id, 'isMandatory', v)}
                            disabled={detail.isSystem}
                            trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                            thumbColor={f.isMandatory ? colors.primary[600] : '#f4f3f4'}
                            style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                          />
                        </View>
                      </View>
                      {f.defaultValue && (
                        <Text className="text-[10px] font-inter text-neutral-400 mt-1">Default: {f.defaultValue}</Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {detailTab === 'defaults' && (
              <View style={{ gap: 8 }}>
                {Object.entries(detail.defaultItemPolicyOverrides || {}).length === 0 ? (
                  <Text className="text-sm font-inter text-neutral-400">No defaults configured</Text>
                ) : (
                  Object.entries(detail.defaultItemPolicyOverrides || {}).map(([key, value]) => (
                    <View key={key} style={styles.defaultRow}>
                      <Text className="text-xs font-inter text-neutral-600" style={{ flex: 1 }}>{key}</Text>
                      {typeof value === 'boolean' ? (
                        <View style={[styles.typeBadge, { backgroundColor: value ? '#d1fae5' : '#f5f5f5' }]}>
                          <Text className="text-[10px] font-bold font-inter" style={{ color: value ? '#047857' : '#737373' }}>
                            {value ? 'ON' : 'OFF'}
                          </Text>
                        </View>
                      ) : (
                        <Text className="text-xs font-bold font-inter text-neutral-800">{String(value)}</Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </BottomSheetScrollView>
        ) : detailLoading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

function ExtBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={[styles.extBadge, enabled ? { backgroundColor: '#d1fae5' } : { backgroundColor: '#f5f5f5' }]}>
      {enabled ? <Check color="#047857" size={12} /> : <AlertCircle color="#737373" size={12} />}
      <Text className="text-xs font-semibold font-inter" style={{ color: enabled ? '#047857' : '#737373' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  seedBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' },
  filterRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  filterTab: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
  filterTabActive: { backgroundColor: 'rgba(255,255,255,0.95)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f0efee',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  activeCard: { borderColor: '#c7d2fe', backgroundColor: '#fafbff' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  activeBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  cardFooter: { flexDirection: 'row', gap: 6, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  outlineBtn: { borderWidth: 1, borderColor: '#d4d4d4', backgroundColor: '#fff' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0efee', marginBottom: 16, gap: 4 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary[500] },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  fieldCard: { backgroundColor: '#fafafa', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#f0efee' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#f0efee' },
  extBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});

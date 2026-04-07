/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AnimatedRN, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Line } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useCanPerform } from '@/hooks/use-can-perform';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { adminAttendanceApi, adminAttendanceKeys } from '@/lib/api/admin-attendance';
import { client } from '@/lib/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* ── Helpers ── */

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
};

/* ── Icons ── */

const svgProps = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const SearchIcon = ({ s = 18, c = colors.neutral[400] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Circle cx="11" cy="11" r="8" /><Line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
);
const UserIcon = ({ s = 18, c = colors.primary[600] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><Circle cx="12" cy="7" r="4" /></Svg>
);
const UsersIcon = ({ s = 18, c = '#fff' }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M23 21v-2a4 4 0 00-3-3.87" /><Path d="M16 3.13a4 4 0 010 7.75" /></Svg>
);
const CheckCircleIcon = ({ s = 18, c = colors.success[500] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><Path d="M22 4L12 14.01l-3-3" /></Svg>
);
const ClockIcon = ({ s = 18, c = colors.primary[500] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Circle cx="12" cy="12" r="10" /><Path d="M12 6v6l4 2" /></Svg>
);
const MapPinIcon = ({ s = 16, c = colors.primary[500] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><Circle cx="12" cy="10" r="3" /></Svg>
);
const ShieldIcon = ({ s = 14, c = colors.success[600] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>
);
const ActivityIcon = ({ s = 16, c = colors.primary[600] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Svg>
);
const XIcon = ({ s = 16, c = colors.neutral[400] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Line x1="18" y1="6" x2="6" y2="18" /><Line x1="6" y1="6" x2="18" y2="18" /></Svg>
);
const CheckSquareIcon = ({ s = 18, c = colors.primary[500] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M9 11l3 3L22 4" /><Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></Svg>
);
const SquareIcon = ({ s = 18, c = colors.neutral[300] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" /></Svg>
);

/* ── Status Badge ── */

type AttStatus = 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NOT_LINKED';

function StatusBadge({ status }: { status: AttStatus }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    NOT_CHECKED_IN: { bg: colors.neutral[100], fg: colors.neutral[600], label: 'Not Checked In' },
    CHECKED_IN: { bg: colors.success[50], fg: colors.success[700], label: 'Checked In' },
    CHECKED_OUT: { bg: colors.primary[50], fg: colors.primary[700], label: 'Checked Out' },
    NOT_LINKED: { bg: colors.warning[50], fg: colors.warning[700], label: 'Not Linked' },
  };
  const c = map[status] ?? map.NOT_CHECKED_IN;
  return (
    <View style={[$.badge, { backgroundColor: c.bg }]}>
      <Text className="font-inter text-xs font-bold" style={{ color: c.fg }}>{c.label}</Text>
    </View>
  );
}

/* ── Success Overlay ── */

function SuccessOverlay({ message }: { message: string }) {
  return (
    <AnimatedRN.View entering={FadeInDown.duration(300)} style={$.successOverlay}>
      <CheckCircleIcon s={48} c={colors.success[500]} />
      <Text className="font-inter text-lg font-bold" style={{ color: colors.success[700], marginTop: 12 }}>{message}</Text>
      <Text className="font-inter text-sm" style={{ color: colors.neutral[500], marginTop: 4 }}>Resetting in 3 seconds...</Text>
    </AnimatedRN.View>
  );
}

/* ── Employee Card ── */

function EmployeeInfoCard({
  employee,
  todayRecord,
  resolvedPolicy,
  shift,
  location,
  status,
  fmt,
}: {
  employee: any;
  todayRecord: any;
  resolvedPolicy: any;
  shift: any;
  location: any;
  status: AttStatus;
  fmt: any;
}) {
  const photoUrl = employee?.profilePhotoUrl;
  const name = employee?.fullName ?? `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim();
  const initials = getInitials(name || 'U');

  return (
    <AnimatedRN.View entering={FadeInDown.duration(400).delay(100)} style={$.card}>
      <View style={$.empHeader}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={$.empPhoto} />
        ) : (
          <View style={$.empPhotoPlaceholder}>
            <Text className="font-inter text-base font-bold" style={{ color: colors.primary[600] }}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text className="font-inter text-base font-bold" style={{ color: colors.primary[950] }}>{name}</Text>
          {employee?.employeeCode && (
            <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>{employee.employeeCode}</Text>
          )}
        </View>
        <StatusBadge status={status} />
      </View>

      {/* Department & Designation */}
      <View style={$.empDetails}>
        {employee?.departmentName && (
          <View style={$.detailPill}>
            <Text className="font-inter text-xs" style={{ color: colors.primary[700] }}>{employee.departmentName}</Text>
          </View>
        )}
        {employee?.designationName && (
          <View style={$.detailPill}>
            <Text className="font-inter text-xs" style={{ color: colors.primary[700] }}>{employee.designationName}</Text>
          </View>
        )}
      </View>

      {/* Shift Info */}
      {shift && (
        <View style={$.shiftRow}>
          <ClockIcon s={14} c={colors.primary[500]} />
          <Text className="font-inter text-xs font-semibold" style={{ color: colors.primary[700] }}>
            {shift.name}
          </Text>
          <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>
            {shift.startTime ? fmt.shiftTime(shift.startTime) : '--'} - {shift.endTime ? fmt.shiftTime(shift.endTime) : '--'}
          </Text>
        </View>
      )}

      {/* Location & Geofence */}
      {location && (
        <View style={$.shiftRow}>
          <MapPinIcon s={14} c={colors.accent[600]} />
          <Text className="font-inter text-xs font-semibold" style={{ color: colors.accent[700] }}>{location.name}</Text>
          {location.geoEnabled && (
            <View style={$.geoPill}>
              <ShieldIcon s={10} c={colors.success[600]} />
              <Text className="font-inter text-xs" style={{ color: colors.success[700] }}>Geofence</Text>
            </View>
          )}
        </View>
      )}

      {/* Policy pills */}
      {resolvedPolicy && (
        <View style={$.policyRow}>
          {resolvedPolicy.gpsRequired && (
            <View style={[$.policyPill, { backgroundColor: colors.primary[50] }]}>
              <Text className="font-inter text-xs" style={{ color: colors.primary[700] }}>GPS Required</Text>
            </View>
          )}
          {resolvedPolicy.selfieRequired && (
            <View style={[$.policyPill, { backgroundColor: colors.accent[50] }]}>
              <Text className="font-inter text-xs" style={{ color: colors.accent[700] }}>Selfie Required</Text>
            </View>
          )}
        </View>
      )}

      {/* Today Record summary */}
      {todayRecord && (
        <View style={$.todayRecordRow}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>Check In</Text>
            <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>
              {todayRecord.punchIn ? fmt.time(todayRecord.punchIn) : '--:--'}
            </Text>
          </View>
          <View style={$.vDiv} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>Check Out</Text>
            <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>
              {todayRecord.punchOut ? fmt.time(todayRecord.punchOut) : '--:--'}
            </Text>
          </View>
          <View style={$.vDiv} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>Worked</Text>
            <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>
              {todayRecord.workedHours != null ? `${Number(todayRecord.workedHours).toFixed(1)}h` : '--'}
            </Text>
          </View>
        </View>
      )}
    </AnimatedRN.View>
  );
}

/* ── Main Screen ── */

export function AdminAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const qc = useQueryClient();
  const fmt = useCompanyFormatter();

  // Permission-based mode detection
  const canConfigure = useCanPerform('hr:create');
  const canCreate = useCanPerform('attendance:mark');

  // State
  const [search, setSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState('');
  const [remarks, setRemarks] = React.useState('');
  const [bulkMode, setBulkMode] = React.useState(false);
  const [bulkSelected, setBulkSelected] = React.useState<string[]>([]);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');

  const debouncedSearch = useDebounce(search, 300);

  // GPS
  const [geo, setGeo] = React.useState<{ lat: number; lng: number } | null>(null);
  const geoFetched = React.useRef(false);
  React.useEffect(() => {
    if (geoFetched.current) return;
    geoFetched.current = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setGeo({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {
        // Location unavailable — admin can still mark with skipValidation
      }
    })();
  }, []);

  // Employee search
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['employees', 'search', debouncedSearch],
    queryFn: () => client.get('/hr/employees', { params: { search: debouncedSearch, limit: 10 } }),
    enabled: debouncedSearch.length >= 2,
  });

  const employees: any[] = (searchResults as any)?.data ?? [];

  // Selected employee status
  const { data: empStatusData, isPending: isStatusLoading } = useQuery({
    queryKey: adminAttendanceKeys.employeeStatus(selectedId),
    queryFn: () => adminAttendanceApi.getEmployeeStatus(selectedId),
    enabled: !!selectedId,
  });

  const empStatus = (empStatusData as any)?.data;
  const employee = empStatus?.employee;
  const todayRecord = empStatus?.todayRecord;
  const resolvedPolicy = empStatus?.resolvedPolicy;
  const empShift = empStatus?.shift;
  const empLocation = empStatus?.location;
  const attStatus: AttStatus = empStatus?.status ?? 'NOT_CHECKED_IN';
  const nextAction: 'CHECK_IN' | 'CHECK_OUT' = attStatus === 'CHECKED_IN' ? 'CHECK_OUT' : 'CHECK_IN';

  // Mark mutation
  const markMut = useMutation({
    mutationFn: (data: Parameters<typeof adminAttendanceApi.mark>[0]) =>
      adminAttendanceApi.mark(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAttendanceKeys.all });
      const msg = nextAction === 'CHECK_IN' ? 'Checked In Successfully' : 'Checked Out Successfully';
      setSuccessMessage(msg);
      setShowSuccess(true);
      setErrorMessage('');
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedId('');
        setSearch('');
        setRemarks('');
      }, 3000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to mark attendance';
      setErrorMessage(msg);
    },
  });

  // Bulk mark mutation
  const bulkMarkMut = useMutation({
    mutationFn: (data: Parameters<typeof adminAttendanceApi.bulkMark>[0]) =>
      adminAttendanceApi.bulkMark(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: adminAttendanceKeys.all });
      const count = (res as any)?.data?.results?.length ?? bulkSelected.length;
      setSuccessMessage(`Bulk action completed for ${count} employee(s)`);
      setShowSuccess(true);
      setErrorMessage('');
      setBulkSelected([]);
      setTimeout(() => {
        setShowSuccess(false);
        setSearch('');
        setRemarks('');
      }, 3000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Bulk action failed';
      setErrorMessage(msg);
    },
  });

  // Today's activity log
  const { data: logData, isPending: isLogLoading } = useQuery({
    queryKey: adminAttendanceKeys.todayLog({ page: 1 }),
    queryFn: () => adminAttendanceApi.getTodayLog({ page: 1, limit: 20 }),
  });
  const todayLogs: any[] = (logData as any)?.data ?? [];

  // Handlers
  const handleSelectEmployee = React.useCallback((emp: any) => {
    if (bulkMode) {
      setBulkSelected((prev) =>
        prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id],
      );
    } else {
      setSelectedId(emp.id);
      setSearch('');
    }
  }, [bulkMode]);

  const handleMark = React.useCallback(() => {
    if (!selectedId) return;
    markMut.mutate({
      employeeId: selectedId,
      action: nextAction,
      latitude: geo?.lat,
      longitude: geo?.lng,
      remarks: remarks || undefined,
      skipValidation: canConfigure,
    });
  }, [selectedId, nextAction, geo, remarks, canConfigure, markMut]);

  const handleBulkMark = React.useCallback((action: 'CHECK_IN' | 'CHECK_OUT') => {
    if (bulkSelected.length === 0) return;
    bulkMarkMut.mutate({
      employeeIds: bulkSelected,
      action,
      remarks: remarks || 'Bulk marked by admin',
    });
  }, [bulkSelected, remarks, bulkMarkMut]);

  const handleClearSelection = React.useCallback(() => {
    setSelectedId('');
    setSearch('');
    setRemarks('');
    setErrorMessage('');
  }, []);

  const isBusy = markMut.isPending || bulkMarkMut.isPending;

  // Determine mode label
  const modeLabel = canConfigure ? 'Admin' : canCreate ? 'Kiosk' : 'View Only';
  const modeBg = canConfigure ? colors.accent[500] : canCreate ? colors.success[500] : colors.neutral[400];

  return (
    <View style={$.root}>
      {/* Header */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[$.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={$.headerRow}>
          <HamburgerButton onPress={toggle} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text className="font-inter text-white text-lg font-bold">Mark Attendance</Text>
            <Text className="font-inter text-white/70 text-xs mt-0.5">Admin Attendance Management</Text>
          </View>
          <View style={[$.modeBadge, { backgroundColor: modeBg }]}>
            <Text className="font-inter text-white text-xs font-bold">{modeLabel}</Text>
          </View>
        </View>

        {/* Bulk mode toggle */}
        {canConfigure && (
          <View style={$.bulkToggleRow}>
            <UsersIcon s={16} c="rgba(255,255,255,0.8)" />
            <Text className="font-inter text-white/80 text-xs" style={{ flex: 1, marginLeft: 8 }}>Bulk Mode</Text>
            <Switch
              value={bulkMode}
              onValueChange={(v) => {
                setBulkMode(v);
                setSelectedId('');
                setBulkSelected([]);
                setSearch('');
              }}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.accent[400] }}
              thumbColor={colors.white}
            />
          </View>
        )}
      </LinearGradient>

      {/* Success Overlay */}
      {showSuccess && <SuccessOverlay message={successMessage} />}

      {!showSuccess && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[$.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Input */}
          <AnimatedRN.View entering={FadeInDown.duration(400)} style={$.searchContainer}>
            <View style={$.searchBox}>
              <SearchIcon />
              <TextInput
                style={$.searchInput}
                placeholder="Search employee by name or code..."
                placeholderTextColor={colors.neutral[400]}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                  <XIcon />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results Dropdown */}
            {debouncedSearch.length >= 2 && !selectedId && (
              <View style={$.searchDropdown}>
                {isSearching && (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.primary[500]} size="small" />
                  </View>
                )}
                {!isSearching && employees.length === 0 && (
                  <View style={{ padding: 16 }}>
                    <Text className="font-inter text-sm text-center" style={{ color: colors.neutral[500] }}>No employees found</Text>
                  </View>
                )}
                {!isSearching && employees.map((emp: any) => {
                  const empName = emp.fullName ?? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
                  const isSelected = bulkMode && bulkSelected.includes(emp.id);
                  return (
                    <TouchableOpacity
                      key={emp.id}
                      style={[$.searchItem, isSelected && { backgroundColor: colors.primary[50] }]}
                      onPress={() => handleSelectEmployee(emp)}
                    >
                      {bulkMode && (
                        <View style={{ marginRight: 10 }}>
                          {isSelected ? <CheckSquareIcon /> : <SquareIcon />}
                        </View>
                      )}
                      <View style={$.searchItemAvatar}>
                        <Text className="font-inter text-xs font-bold" style={{ color: colors.primary[600] }}>
                          {getInitials(empName || 'U')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }}>{empName}</Text>
                        <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>
                          {emp.employeeCode}{emp.department?.name ? ` - ${emp.department.name}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </AnimatedRN.View>

          {/* Bulk Mode Selected Count */}
          {bulkMode && bulkSelected.length > 0 && (
            <AnimatedRN.View entering={FadeInDown.duration(300)} style={$.bulkInfoCard}>
              <UsersIcon s={18} c={colors.primary[600]} />
              <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[700], flex: 1, marginLeft: 10 }}>
                {bulkSelected.length} employee(s) selected
              </Text>
              <TouchableOpacity onPress={() => setBulkSelected([])}>
                <Text className="font-inter text-xs font-semibold" style={{ color: colors.danger[600] }}>Clear</Text>
              </TouchableOpacity>
            </AnimatedRN.View>
          )}

          {/* Single Employee Card */}
          {!bulkMode && selectedId && (
            <>
              {isStatusLoading ? (
                <SkeletonCard />
              ) : employee ? (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <TouchableOpacity onPress={handleClearSelection} style={$.clearBtn}>
                      <XIcon s={14} c={colors.neutral[500]} />
                      <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <EmployeeInfoCard
                    employee={employee}
                    todayRecord={todayRecord}
                    resolvedPolicy={resolvedPolicy}
                    shift={empShift}
                    location={empLocation}
                    status={attStatus}
                    fmt={fmt}
                  />
                </>
              ) : null}
            </>
          )}

          {/* Error Message */}
          {errorMessage.length > 0 && (
            <AnimatedRN.View entering={FadeInDown.duration(300)} style={$.errorBox}>
              <Text className="font-inter text-sm" style={{ color: colors.danger[700] }}>{errorMessage}</Text>
            </AnimatedRN.View>
          )}

          {/* Remarks Input */}
          {((!bulkMode && selectedId && employee) || (bulkMode && bulkSelected.length > 0)) && (
            <AnimatedRN.View entering={FadeInDown.duration(400).delay(200)} style={$.remarksCard}>
              <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950], marginBottom: 8 }}>Remarks</Text>
              <TextInput
                style={$.remarksInput}
                placeholder="Add remarks (optional)..."
                placeholderTextColor={colors.neutral[400]}
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </AnimatedRN.View>
          )}

          {/* Action Button — Single */}
          {!bulkMode && selectedId && employee && attStatus !== 'CHECKED_OUT' && (
            <AnimatedRN.View entering={FadeInUp.duration(400).delay(300)}>
              <TouchableOpacity
                style={[$.actionBtn, {
                  backgroundColor: nextAction === 'CHECK_IN' ? colors.success[500] : colors.danger[500],
                }]}
                onPress={handleMark}
                disabled={isBusy}
                activeOpacity={0.8}
              >
                {isBusy ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    {nextAction === 'CHECK_IN' ? <CheckCircleIcon s={22} c="#fff" /> : <ClockIcon s={22} c="#fff" />}
                    <Text className="font-inter text-base font-bold" style={{ color: colors.white, marginLeft: 10 }}>
                      {nextAction === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </AnimatedRN.View>
          )}

          {/* Already checked out message */}
          {!bulkMode && selectedId && employee && attStatus === 'CHECKED_OUT' && (
            <AnimatedRN.View entering={FadeInDown.duration(300)} style={$.infoBox}>
              <CheckCircleIcon s={18} c={colors.success[500]} />
              <Text className="font-inter text-sm" style={{ color: colors.success[700], marginLeft: 8 }}>
                Employee has completed their shift for today.
              </Text>
            </AnimatedRN.View>
          )}

          {/* Action Buttons — Bulk */}
          {bulkMode && bulkSelected.length > 0 && (
            <AnimatedRN.View entering={FadeInUp.duration(400).delay(200)} style={$.bulkActions}>
              <TouchableOpacity
                style={[$.bulkBtn, { backgroundColor: colors.success[500] }]}
                onPress={() => handleBulkMark('CHECK_IN')}
                disabled={isBusy}
                activeOpacity={0.8}
              >
                {bulkMarkMut.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <CheckCircleIcon s={18} c="#fff" />
                    <Text className="font-inter text-sm font-bold" style={{ color: colors.white, marginLeft: 8 }}>Bulk Check In</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[$.bulkBtn, { backgroundColor: colors.danger[500] }]}
                onPress={() => handleBulkMark('CHECK_OUT')}
                disabled={isBusy}
                activeOpacity={0.8}
              >
                {bulkMarkMut.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <ClockIcon s={18} c="#fff" />
                    <Text className="font-inter text-sm font-bold" style={{ color: colors.white, marginLeft: 8 }}>Bulk Check Out</Text>
                  </>
                )}
              </TouchableOpacity>
            </AnimatedRN.View>
          )}

          {/* Today's Activity Log */}
          <AnimatedRN.View entering={FadeInDown.duration(400).delay(400)} style={{ marginTop: 24 }}>
            <View style={$.cardHead}>
              <View style={$.cardIcon}><ActivityIcon /></View>
              <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>Today&apos;s Activity Log</Text>
            </View>

            {isLogLoading ? (
              <SkeletonCard />
            ) : todayLogs.length === 0 ? (
              <View style={$.emptyLog}>
                <Text className="font-inter text-sm" style={{ color: colors.neutral[400] }}>No attendance records for today</Text>
              </View>
            ) : (
              <View style={$.logList}>
                {todayLogs.map((log: any) => {
                  const logName = log.employee?.fullName ?? `${log.employee?.firstName ?? ''} ${log.employee?.lastName ?? ''}`.trim();
                  const logStatus: AttStatus = log.status ?? 'NOT_CHECKED_IN';
                  return (
                    <View key={log.id} style={$.logItem}>
                      <View style={$.logAvatar}>
                        <Text className="font-inter text-xs font-bold" style={{ color: colors.primary[600] }}>
                          {getInitials(logName || 'U')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }}>{logName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          {log.punchIn && (
                            <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>
                              In: {fmt.time(log.punchIn)}
                            </Text>
                          )}
                          {log.punchOut && (
                            <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>
                              Out: {fmt.time(log.punchOut)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <StatusBadge status={logStatus} />
                    </View>
                  );
                })}
              </View>
            )}
          </AnimatedRN.View>
        </ScrollView>
      )}
    </View>
  );
}

/* ── Styles ── */

const $ = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gradient.surface },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bulkToggleRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  content: { padding: 20, gap: 12 },

  // Search
  searchContainer: { zIndex: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.neutral[200],
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  searchInput: {
    flex: 1, marginLeft: 10, fontSize: 14, color: colors.primary[950],
    fontFamily: 'Inter_400Regular', padding: 0,
  },
  searchDropdown: {
    backgroundColor: colors.white, borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: colors.neutral[200],
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
    maxHeight: 300, overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
  },
  searchItemAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[50],
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },

  // Bulk
  bulkInfoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary[50],
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.primary[200],
  },
  bulkActions: { flexDirection: 'row', gap: 12 },
  bulkBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12,
  },

  // Employee card
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.neutral[100],
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  empHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  empPhoto: { width: 48, height: 48, borderRadius: 24 },
  empPhotoPlaceholder: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary[50],
    justifyContent: 'center', alignItems: 'center',
  },
  empDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  detailPill: {
    backgroundColor: colors.primary[50], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  shiftRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6,
  },
  geoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.success[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  policyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 6 },
  policyPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  todayRecordRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.neutral[100],
  },
  vDiv: { width: 1, height: 28, backgroundColor: colors.neutral[200] },

  // Badge
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16,
  },

  // Remarks
  remarksCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.neutral[100],
  },
  remarksInput: {
    fontSize: 14, color: colors.primary[950], fontFamily: 'Inter_400Regular',
    minHeight: 60, padding: 0, textAlignVertical: 'top',
  },

  // Action button
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },

  // Clear button
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4,
  },

  // Info / Error boxes
  infoBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success[50],
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.success[200],
  },
  errorBox: {
    backgroundColor: colors.danger[50], borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.danger[200],
  },

  // Success overlay
  successOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40,
  },

  // Today log
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  emptyLog: {
    backgroundColor: colors.white, borderRadius: 12, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: colors.neutral[100],
  },
  logList: {
    backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.neutral[100],
  },
  logItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
  },
  logAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50],
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
});

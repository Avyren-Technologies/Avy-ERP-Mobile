/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as React from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AnimatedRN, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Line } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { R2Image } from '@/components/ui/r2-image';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useCanPerform } from '@/hooks/use-can-perform';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useCompanyShifts } from '@/features/company-admin/api/use-company-admin-queries';
import { adminAttendanceApi, adminAttendanceKeys } from '@/lib/api/admin-attendance';
import { client } from '@/lib/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsDark } from '@/hooks/use-is-dark';

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
const LockIcon = ({ s = 14, c = colors.warning[600] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z" /><Path d="M7 11V7a5 5 0 0110 0v4" /></Svg>
);
const BookIcon = ({ s = 16, c = '#fff' }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><Path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></Svg>
);
const ChevronDownIcon = ({ s = 14, c = colors.neutral[500] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M6 9l6 6 6-6" /></Svg>
);
const SaveIcon = ({ s = 14, c = colors.success[500] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><Path d="M17 21v-8H7v8" /><Path d="M7 3v5h8" /></Svg>
);
const CalendarIcon = ({ s = 16, c = colors.primary[500] }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" /><Line x1="16" y1="2" x2="16" y2="6" /><Line x1="8" y1="2" x2="8" y2="6" /><Line x1="3" y1="10" x2="21" y2="10" /></Svg>
);

/* ── Book Types ── */

type HalfDayStatus = 'PRESENT' | 'ABSENT' | 'ON_LEAVE';

interface BookRowState {
  firstHalf: HalfDayStatus;
  firstHalfLeaveTypeId?: string;
  secondHalf: HalfDayStatus;
  secondHalfLeaveTypeId?: string;
  punchInOverride: string;
  punchOutOverride: string;
  remarks: string;
  forceOverride: boolean;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
  existingRecordUpdatedAt?: string;
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function deriveBookStatus(firstHalf: HalfDayStatus, secondHalf: HalfDayStatus): { label: string; bg: string; fg: string } {
  if (firstHalf === 'PRESENT' && secondHalf === 'PRESENT') {
    return { label: 'Present', bg: colors.success[50], fg: colors.success[700] };
  }
  if (firstHalf === 'ABSENT' && secondHalf === 'ABSENT') {
    return { label: 'Absent', bg: colors.danger[50], fg: colors.danger[700] };
  }
  if (firstHalf === 'ON_LEAVE' && secondHalf === 'ON_LEAVE') {
    return { label: 'On Leave', bg: colors.primary[50], fg: colors.primary[700] };
  }
  if ((firstHalf === 'PRESENT' || secondHalf === 'PRESENT') && (firstHalf !== 'PRESENT' || secondHalf !== 'PRESENT')) {
    return { label: 'Half Day', bg: colors.warning[50], fg: colors.warning[700] };
  }
  return { label: 'Mixed', bg: colors.neutral[100], fg: colors.neutral[700] };
}

const HALF_STATUS_OPTIONS: Array<{ label: string; value: HalfDayStatus }> = [
  { label: 'Present', value: 'PRESENT' },
  { label: 'Absent', value: 'ABSENT' },
  { label: 'On Leave', value: 'ON_LEAVE' },
];

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
        <R2Image
          fileKey={photoUrl}
          style={$.empPhoto}
          fallback={
            <View style={$.empPhotoPlaceholder}>
              <Text className="font-inter text-base font-bold" style={{ color: colors.primary[600] }}>{initials}</Text>
            </View>
          }
        />
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
  const isDark = useIsDark();
  const $ = _createStyles(isDark);

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
  const [mode, setMode] = React.useState<'single' | 'bulk' | 'book'>('single');
  const [bulkSelected, setBulkSelected] = React.useState<string[]>([]);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');

  // Book mode state
  const [bookDate, setBookDate] = React.useState(getTodayDateString);
  const [bookShiftFilter, setBookShiftFilter] = React.useState('All');
  const [bookSearch, setBookSearch] = React.useState('');
  const [bookPage, setBookPage] = React.useState(1);
  const [bookRowStates, setBookRowStates] = React.useState<Record<string, BookRowState>>({});
  const [halfPickerVisible, setHalfPickerVisible] = React.useState<{ empId: string; half: 'first' | 'second' } | null>(null);
  const [leavePickerVisible, setLeavePickerVisible] = React.useState<{ empId: string; half: 'first' | 'second'; balances: any[] } | null>(null);

  const autoSaveTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const savedTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedSearch = useDebounce(search, 300);
  const debouncedBookSearch = useDebounce(bookSearch, 300);

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

  // Company shifts for book mode filter
  const shiftsQuery = useCompanyShifts();
  const companyShifts: Array<{ id: string; name: string; startTime: string; endTime: string }> = (shiftsQuery.data as any)?.data ?? [];

  // Book data query
  const bookQueryParams = React.useMemo(() => ({
    date: bookDate,
    shiftId: bookShiftFilter !== 'All' ? bookShiftFilter : undefined,
    departmentId: undefined,
    designationId: undefined,
    search: debouncedBookSearch || undefined,
    page: bookPage,
    limit: 25,
  }), [bookDate, bookShiftFilter, debouncedBookSearch, bookPage]);

  const { data: bookData, isPending: isBookLoading } = useQuery({
    queryKey: adminAttendanceKeys.book(bookQueryParams as unknown as Record<string, unknown>),
    queryFn: () => adminAttendanceApi.fetchBook(bookQueryParams),
    enabled: mode === 'book',
  });
  const bookEmployees: any[] = (bookData as any)?.data ?? [];
  const bookMeta = (bookData as any)?.meta;

  // Initialize row states from fetched book employees
  React.useEffect(() => {
    if (mode !== 'book' || !bookEmployees.length) return;
    setBookRowStates(prev => {
      const next = { ...prev };
      for (const emp of bookEmployees) {
        if (next[emp.employeeId] && next[emp.employeeId].dirty) continue;
        const firstHalfRecord = emp.existingRecord?.halves?.find((h: any) => h.half === 'FIRST_HALF');
        const secondHalfRecord = emp.existingRecord?.halves?.find((h: any) => h.half === 'SECOND_HALF');
        next[emp.employeeId] = {
          firstHalf: (firstHalfRecord?.status as HalfDayStatus) ?? 'PRESENT',
          firstHalfLeaveTypeId: firstHalfRecord?.leaveTypeId ?? undefined,
          secondHalf: (secondHalfRecord?.status as HalfDayStatus) ?? 'PRESENT',
          secondHalfLeaveTypeId: secondHalfRecord?.leaveTypeId ?? undefined,
          punchInOverride: '',
          punchOutOverride: '',
          remarks: '',
          forceOverride: false,
          dirty: false,
          saving: false,
          saved: false,
          error: null,
          existingRecordUpdatedAt: emp.existingRecord?.updatedAt,
        };
      }
      return next;
    });
  }, [bookEmployees, mode]);

  // Book mark mutation (single row auto-save)
  const bookMarkMut = useMutation({
    mutationFn: (data: Parameters<typeof adminAttendanceApi.bookMark>[0]) =>
      adminAttendanceApi.bookMark(data),
    onSuccess: (_res: any, variables: any) => {
      const empId = variables.employeeId;
      setBookRowStates(prev => ({
        ...prev,
        [empId]: { ...prev[empId], saving: false, saved: true, dirty: false, error: null },
      }));
      if (savedTimers.current[empId]) clearTimeout(savedTimers.current[empId]);
      savedTimers.current[empId] = setTimeout(() => {
        setBookRowStates(prev => prev[empId] ? ({
          ...prev,
          [empId]: { ...prev[empId], saved: false },
        }) : prev);
      }, 3000);
      qc.invalidateQueries({ queryKey: adminAttendanceKeys.book() });
    },
    onError: (err: any, variables: any) => {
      const empId = variables.employeeId;
      const message = err?.response?.data?.message ?? err?.message ?? 'Save failed';
      setBookRowStates(prev => ({
        ...prev,
        [empId]: { ...prev[empId], saving: false, error: message },
      }));
    },
  });

  // Book save all mutation
  const bookSaveAllMut = useMutation({
    mutationFn: (data: Parameters<typeof adminAttendanceApi.bookSaveAll>[0]) =>
      adminAttendanceApi.bookSaveAll(data),
    onSuccess: () => {
      setBookRowStates(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (next[key].dirty) {
            next[key] = { ...next[key], dirty: false, saved: true, saving: false, error: null };
          }
        }
        return next;
      });
      qc.invalidateQueries({ queryKey: adminAttendanceKeys.book() });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Save all failed';
      setErrorMessage(msg);
    },
  });

  // Book mode handlers
  const updateBookRow = React.useCallback((employeeId: string, updates: Partial<BookRowState>) => {
    setBookRowStates(prev => {
      const current = prev[employeeId];
      if (!current) return prev;
      return { ...prev, [employeeId]: { ...current, ...updates, dirty: true, saved: false, error: null } };
    });

    if (autoSaveTimers.current[employeeId]) {
      clearTimeout(autoSaveTimers.current[employeeId]);
    }
    autoSaveTimers.current[employeeId] = setTimeout(() => {
      setBookRowStates(prev => {
        const row = prev[employeeId];
        if (!row || !row.dirty) return prev;
        const merged = { ...row, ...updates };
        bookMarkMut.mutate({
          employeeId,
          date: bookDate,
          firstHalf: { status: merged.firstHalf, leaveTypeId: merged.firstHalf === 'ON_LEAVE' ? merged.firstHalfLeaveTypeId : undefined },
          secondHalf: { status: merged.secondHalf, leaveTypeId: merged.secondHalf === 'ON_LEAVE' ? merged.secondHalfLeaveTypeId : undefined },
          punchInOverride: merged.punchInOverride || undefined,
          punchOutOverride: merged.punchOutOverride || undefined,
          remarks: merged.remarks || undefined,
          forceOverride: merged.forceOverride || undefined,
          existingRecordUpdatedAt: merged.existingRecordUpdatedAt,
        });
        return { ...prev, [employeeId]: { ...row, saving: true } };
      });
    }, 500);
  }, [bookDate, bookMarkMut]);

  const handleBookOverride = React.useCallback((employeeId: string) => {
    updateBookRow(employeeId, { forceOverride: true });
  }, [updateBookRow]);

  const handleSaveAllUnsaved = React.useCallback(() => {
    const dirtyEntries = Object.entries(bookRowStates)
      .filter(([, row]) => row.dirty && !row.saving)
      .map(([empId, row]) => ({
        employeeId: empId,
        firstHalf: { status: row.firstHalf, leaveTypeId: row.firstHalf === 'ON_LEAVE' ? row.firstHalfLeaveTypeId : undefined },
        secondHalf: { status: row.secondHalf, leaveTypeId: row.secondHalf === 'ON_LEAVE' ? row.secondHalfLeaveTypeId : undefined },
        punchInOverride: row.punchInOverride || undefined,
        punchOutOverride: row.punchOutOverride || undefined,
        remarks: row.remarks || undefined,
        forceOverride: row.forceOverride || undefined,
        existingRecordUpdatedAt: row.existingRecordUpdatedAt,
      }));
    if (dirtyEntries.length === 0) return;
    bookSaveAllMut.mutate({ date: bookDate, entries: dirtyEntries });
  }, [bookRowStates, bookDate, bookSaveAllMut]);

  const dirtyCount = React.useMemo(() => Object.values(bookRowStates).filter(r => r.dirty && !r.saving).length, [bookRowStates]);

  // Handlers
  const handleSelectEmployee = React.useCallback((emp: any) => {
    if (mode === 'bulk') {
      setBulkSelected((prev) =>
        prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id],
      );
    } else {
      setSelectedId(emp.id);
      setSearch('');
    }
  }, [mode]);

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

        {/* Mode Segmented Control */}
        {canConfigure && (
          <View style={$.segmentedRow}>
            {([
              { key: 'single' as const, label: 'Single', icon: <UserIcon s={14} c={mode === 'single' ? colors.primary[700] : 'rgba(255,255,255,0.7)'} /> },
              { key: 'bulk' as const, label: 'Bulk', icon: <UsersIcon s={14} c={mode === 'bulk' ? colors.primary[700] : 'rgba(255,255,255,0.7)'} /> },
              { key: 'book' as const, label: 'Book', icon: <BookIcon s={14} c={mode === 'book' ? colors.primary[700] : 'rgba(255,255,255,0.7)'} /> },
            ]).map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[$.segmentBtn, mode === item.key && $.segmentBtnActive]}
                onPress={() => {
                  setMode(item.key);
                  setSelectedId('');
                  setBulkSelected([]);
                  setSearch('');
                  setErrorMessage('');
                }}
                activeOpacity={0.7}
              >
                {item.icon}
                <Text
                  className={`font-inter text-xs font-semibold ${mode === item.key ? '' : ''}`}
                  style={{ color: mode === item.key ? colors.primary[700] : 'rgba(255,255,255,0.8)', marginLeft: 4 }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Success Overlay */}
      {showSuccess && <SuccessOverlay message={successMessage} />}

      {!showSuccess && mode === 'book' && (
        <>
          {/* Book Mode UI */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[$.content, { paddingBottom: insets.bottom + (dirtyCount > 0 ? 80 : 24) }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Date Picker */}
            <AnimatedRN.View entering={FadeInDown.duration(400)}>
              <TouchableOpacity
                style={$.bookDateBtn}
                onPress={() => {
                  // Use a simple approach: navigate date by showing a TextInput
                }}
                activeOpacity={1}
              >
                <TouchableOpacity
                  onPress={() => {
                    const d = new Date(bookDate);
                    d.setDate(d.getDate() - 1);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    setBookDate(`${y}-${m}-${dd}`);
                    setBookRowStates({});
                    setBookPage(1);
                  }}
                  style={$.bookDateArrow}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                  <CalendarIcon s={16} c={colors.primary[600]} />
                  <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>{fmt.date(bookDate + 'T00:00:00Z')}</Text>
                  {bookDate === getTodayDateString() && (
                    <View style={{ backgroundColor: colors.primary[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text className="font-inter text-xs font-semibold" style={{ color: colors.primary[600] }}>Today</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const d = new Date(bookDate);
                    d.setDate(d.getDate() + 1);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    setBookDate(`${y}-${m}-${dd}`);
                    setBookRowStates({});
                    setBookPage(1);
                  }}
                  style={$.bookDateArrow}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </TouchableOpacity>
              </TouchableOpacity>
            </AnimatedRN.View>

            {/* Shift Filter Chips */}
            {companyShifts.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                <TouchableOpacity
                  onPress={() => { setBookShiftFilter('All'); setBookPage(1); }}
                  style={[$.filterChip, bookShiftFilter === 'All' && $.filterChipActive]}
                >
                  <Text className={`font-inter text-xs font-semibold`} style={{ color: bookShiftFilter === 'All' ? colors.white : colors.neutral[600] }}>All Shifts</Text>
                </TouchableOpacity>
                {companyShifts.map(s => {
                  const active = bookShiftFilter === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => { setBookShiftFilter(s.id); setBookPage(1); }}
                      style={[$.filterChip, active && $.filterChipActive]}
                    >
                      <Text className="font-inter text-xs font-semibold" style={{ color: active ? colors.white : colors.neutral[600] }}>{s.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Book Search */}
            <View style={$.searchBox}>
              <SearchIcon s={16} />
              <TextInput
                style={$.searchInput}
                placeholder="Search by name or code..."
                placeholderTextColor={colors.neutral[400]}
                value={bookSearch}
                onChangeText={setBookSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {bookSearch.length > 0 && (
                <TouchableOpacity onPress={() => setBookSearch('')} hitSlop={8}>
                  <XIcon s={14} />
                </TouchableOpacity>
              )}
            </View>

            {/* Error Message */}
            {errorMessage.length > 0 && (
              <AnimatedRN.View entering={FadeInDown.duration(300)} style={$.errorBox}>
                <Text className="font-inter text-sm" style={{ color: colors.danger[700] }}>{errorMessage}</Text>
              </AnimatedRN.View>
            )}

            {/* Book Employee Cards */}
            {isBookLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : bookEmployees.length === 0 ? (
              <View style={$.emptyLog}>
                <Text className="font-inter text-sm" style={{ color: colors.neutral[400] }}>No employees found for this date</Text>
              </View>
            ) : (
              <>
                {bookEmployees.map((emp: any, index: number) => {
                  const row = bookRowStates[emp.employeeId];
                  const isLocked = emp.existingRecord?.isLocked === true;
                  const isNonBookSource = emp.existingRecord && emp.existingRecord.source !== 'HR_BOOK';
                  const locked = isLocked || (isNonBookSource && !row?.forceOverride);
                  const derivedStatus = row ? deriveBookStatus(row.firstHalf, row.secondHalf) : null;
                  const shiftInfo = emp.shift;
                  const leaveBalances: any[] = emp.leaveBalances ?? [];

                  return (
                    <AnimatedRN.View
                      key={emp.employeeId}
                      entering={FadeInDown.duration(350).delay(50 + index * 30)}
                      style={[
                        $.bookCard,
                        row?.dirty && $.bookCardDirty,
                        row?.error && $.bookCardError,
                      ]}
                    >
                      {/* Card Header */}
                      <View style={$.bookCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                          {locked && <LockIcon s={14} c={colors.warning[600]} />}
                          <R2Image
                            fileKey={emp.profilePhotoUrl}
                            style={{ width: 36, height: 36, borderRadius: 18 }}
                            fallback={
                              <View style={[$.empPhotoPlaceholder, { width: 36, height: 36, borderRadius: 18 }]}>
                                <Text className="font-inter text-xs font-bold" style={{ color: colors.primary[600] }}>
                                  {getInitials(emp.employeeName || 'U')}
                                </Text>
                              </View>
                            }
                          />
                          <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>{emp.employeeName}</Text>
                            <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>{emp.employeeCode}</Text>
                          </View>
                        </View>

                        {/* Save status indicator */}
                        <View style={{ alignItems: 'center' }}>
                          {row?.saving && <ActivityIndicator size="small" color={colors.primary[500]} />}
                          {row?.saved && !row.saving && <CheckCircleIcon s={16} c={colors.success[500]} />}
                          {isNonBookSource && !isLocked && (
                            <View style={{ backgroundColor: colors.info[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 2 }}>
                              <Text className="font-inter text-xs" style={{ color: colors.info[700] }}>
                                {emp.existingRecord?.source === 'BIOMETRIC' ? 'Biometric' : emp.existingRecord?.source === 'MOBILE' ? 'Mobile' : 'Auto'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Shift Info */}
                      {shiftInfo && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <ClockIcon s={12} c={colors.primary[400]} />
                          <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>
                            {shiftInfo.name} ({shiftInfo.startTime ? fmt.shiftTime(shiftInfo.startTime) : '--'} - {shiftInfo.endTime ? fmt.shiftTime(shiftInfo.endTime) : '--'})
                          </Text>
                        </View>
                      )}

                      {/* Department & Designation */}
                      {(emp.department || emp.designation) && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                          {emp.department && (
                            <View style={$.detailPill}>
                              <Text className="font-inter text-xs" style={{ color: colors.primary[700] }}>{emp.department.name}</Text>
                            </View>
                          )}
                          {emp.designation && (
                            <View style={$.detailPill}>
                              <Text className="font-inter text-xs" style={{ color: colors.primary[700] }}>{emp.designation.name}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Half-day dropdowns */}
                      {row && (
                        <View style={{ gap: 8 }}>
                          {/* First Half */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-xs font-semibold" style={{ color: colors.neutral[600], width: 72 }}>First Half</Text>
                            <TouchableOpacity
                              style={[$.halfDropdown, locked && $.halfDropdownDisabled]}
                              onPress={() => { if (!locked) setHalfPickerVisible({ empId: emp.employeeId, half: 'first' }); }}
                              disabled={locked}
                              activeOpacity={0.7}
                            >
                              <Text className="font-inter text-xs font-semibold" style={{ color: locked ? colors.neutral[400] : colors.primary[950], flex: 1 }}>
                                {row.firstHalf === 'PRESENT' ? 'Present' : row.firstHalf === 'ABSENT' ? 'Absent' : 'On Leave'}
                              </Text>
                              {!locked && <ChevronDownIcon s={12} />}
                            </TouchableOpacity>
                            {row.firstHalf === 'ON_LEAVE' && (
                              <TouchableOpacity
                                style={$.leaveTypeBtn}
                                onPress={() => { if (!locked) setLeavePickerVisible({ empId: emp.employeeId, half: 'first', balances: leaveBalances }); }}
                                disabled={locked}
                              >
                                <Text className="font-inter text-xs" style={{ color: colors.accent[700] }} numberOfLines={1}>
                                  {row.firstHalfLeaveTypeId
                                    ? (leaveBalances.find((lb: any) => lb.leaveTypeId === row.firstHalfLeaveTypeId)?.leaveTypeName ?? 'Select')
                                    : 'Select'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Second Half */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-xs font-semibold" style={{ color: colors.neutral[600], width: 72 }}>Second Half</Text>
                            <TouchableOpacity
                              style={[$.halfDropdown, locked && $.halfDropdownDisabled]}
                              onPress={() => { if (!locked) setHalfPickerVisible({ empId: emp.employeeId, half: 'second' }); }}
                              disabled={locked}
                              activeOpacity={0.7}
                            >
                              <Text className="font-inter text-xs font-semibold" style={{ color: locked ? colors.neutral[400] : colors.primary[950], flex: 1 }}>
                                {row.secondHalf === 'PRESENT' ? 'Present' : row.secondHalf === 'ABSENT' ? 'Absent' : 'On Leave'}
                              </Text>
                              {!locked && <ChevronDownIcon s={12} />}
                            </TouchableOpacity>
                            {row.secondHalf === 'ON_LEAVE' && (
                              <TouchableOpacity
                                style={$.leaveTypeBtn}
                                onPress={() => { if (!locked) setLeavePickerVisible({ empId: emp.employeeId, half: 'second', balances: leaveBalances }); }}
                                disabled={locked}
                              >
                                <Text className="font-inter text-xs" style={{ color: colors.accent[700] }} numberOfLines={1}>
                                  {row.secondHalfLeaveTypeId
                                    ? (leaveBalances.find((lb: any) => lb.leaveTypeId === row.secondHalfLeaveTypeId)?.leaveTypeName ?? 'Select')
                                    : 'Select'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Derived Status */}
                          {derivedStatus && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                              <View style={[$.bookStatusBadge, { backgroundColor: derivedStatus.bg }]}>
                                <Text className="font-inter text-xs font-bold" style={{ color: derivedStatus.fg }}>{derivedStatus.label}</Text>
                              </View>

                              {/* Override button for non-book sources */}
                              {isNonBookSource && !isLocked && !row.forceOverride && (
                                <TouchableOpacity
                                  style={$.overrideBtn}
                                  onPress={() => handleBookOverride(emp.employeeId)}
                                  activeOpacity={0.7}
                                >
                                  <Text className="font-inter text-xs font-semibold" style={{ color: colors.warning[700] }}>Override</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}

                          {/* Error message */}
                          {row.error && (
                            <View style={{ backgroundColor: colors.danger[50], borderRadius: 8, padding: 8, marginTop: 4 }}>
                              <Text className="font-inter text-xs" style={{ color: colors.danger[700] }}>{row.error}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </AnimatedRN.View>
                  );
                })}

                {/* Pagination */}
                {bookMeta && bookMeta.totalPages > 1 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={() => setBookPage(p => Math.max(1, p - 1))}
                      disabled={bookPage <= 1}
                      style={[$.paginationBtn, bookPage <= 1 && { opacity: 0.4 }]}
                    >
                      <Text className="font-inter text-xs font-semibold" style={{ color: colors.primary[700] }}>Previous</Text>
                    </TouchableOpacity>
                    <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>
                      Page {bookPage} of {bookMeta.totalPages}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setBookPage(p => Math.min(bookMeta.totalPages, p + 1))}
                      disabled={bookPage >= bookMeta.totalPages}
                      style={[$.paginationBtn, bookPage >= bookMeta.totalPages && { opacity: 0.4 }]}
                    >
                      <Text className="font-inter text-xs font-semibold" style={{ color: colors.primary[700] }}>Next</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Sticky Save All Footer */}
          {dirtyCount > 0 && (
            <View style={[$.saveAllFooter, { paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity
                style={$.saveAllBtn}
                onPress={handleSaveAllUnsaved}
                disabled={bookSaveAllMut.isPending}
                activeOpacity={0.8}
              >
                {bookSaveAllMut.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <SaveIcon s={18} c="#fff" />
                    <Text className="font-inter text-sm font-bold" style={{ color: colors.white, marginLeft: 8 }}>
                      Save All Unsaved ({dirtyCount})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Half Status Picker Modal */}
          {halfPickerVisible && (
            <RNModal visible transparent animationType="fade" onRequestClose={() => setHalfPickerVisible(null)}>
              <View style={$.pickerOverlay}>
                <Pressable style={{ ...StyleSheet.absoluteFillObject }} onPress={() => setHalfPickerVisible(null)} />
                <View style={$.pickerCard}>
                  <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950], marginBottom: 12 }}>
                    {halfPickerVisible.half === 'first' ? 'First Half' : 'Second Half'} Status
                  </Text>
                  {HALF_STATUS_OPTIONS.map(opt => {
                    const currentRow = bookRowStates[halfPickerVisible.empId];
                    const currentVal = halfPickerVisible.half === 'first' ? currentRow?.firstHalf : currentRow?.secondHalf;
                    const isSelected = currentVal === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[$.pickerOption, isSelected && $.pickerOptionSelected]}
                        onPress={() => {
                          const field = halfPickerVisible.half === 'first' ? 'firstHalf' : 'secondHalf';
                          const leaveField = halfPickerVisible.half === 'first' ? 'firstHalfLeaveTypeId' : 'secondHalfLeaveTypeId';
                          updateBookRow(halfPickerVisible.empId, {
                            [field]: opt.value,
                            [leaveField]: undefined,
                          } as Partial<BookRowState>);
                          setHalfPickerVisible(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text className={`font-inter text-sm ${isSelected ? 'font-bold' : 'font-medium'}`} style={{ color: isSelected ? colors.primary[700] : colors.primary[950] }}>
                          {opt.label}
                        </Text>
                        {isSelected && <CheckCircleIcon s={16} c={colors.primary[600]} />}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity onPress={() => setHalfPickerVisible(null)} style={{ marginTop: 8, alignSelf: 'center', padding: 8 }}>
                    <Text className="font-inter text-xs font-semibold" style={{ color: colors.neutral[500] }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </RNModal>
          )}

          {/* Leave Type Picker Modal */}
          {leavePickerVisible && (
            <RNModal visible transparent animationType="fade" onRequestClose={() => setLeavePickerVisible(null)}>
              <View style={$.pickerOverlay}>
                <Pressable style={{ ...StyleSheet.absoluteFillObject }} onPress={() => setLeavePickerVisible(null)} />
                <View style={$.pickerCard}>
                  <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950], marginBottom: 12 }}>
                    Select Leave Type
                  </Text>
                  {leavePickerVisible.balances.length === 0 ? (
                    <Text className="font-inter text-sm" style={{ color: colors.neutral[400], textAlign: 'center', paddingVertical: 16 }}>No leave balances available</Text>
                  ) : (
                    leavePickerVisible.balances.map((lb: any) => {
                      const currentRow = bookRowStates[leavePickerVisible.empId];
                      const currentVal = leavePickerVisible.half === 'first' ? currentRow?.firstHalfLeaveTypeId : currentRow?.secondHalfLeaveTypeId;
                      const isSelected = currentVal === lb.leaveTypeId;
                      return (
                        <TouchableOpacity
                          key={lb.leaveTypeId}
                          style={[$.pickerOption, isSelected && $.pickerOptionSelected]}
                          onPress={() => {
                            const field = leavePickerVisible.half === 'first' ? 'firstHalfLeaveTypeId' : 'secondHalfLeaveTypeId';
                            updateBookRow(leavePickerVisible.empId, { [field]: lb.leaveTypeId } as Partial<BookRowState>);
                            setLeavePickerVisible(null);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text className={`font-inter text-sm ${isSelected ? 'font-bold' : 'font-medium'}`} style={{ color: isSelected ? colors.primary[700] : colors.primary[950] }}>
                              {lb.leaveTypeName}
                            </Text>
                            <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>Balance: {lb.balance}</Text>
                          </View>
                          {isSelected && <CheckCircleIcon s={16} c={colors.primary[600]} />}
                        </TouchableOpacity>
                      );
                    })
                  )}
                  <TouchableOpacity onPress={() => setLeavePickerVisible(null)} style={{ marginTop: 8, alignSelf: 'center', padding: 8 }}>
                    <Text className="font-inter text-xs font-semibold" style={{ color: colors.neutral[500] }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </RNModal>
          )}
        </>
      )}

      {!showSuccess && mode !== 'book' && (
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
                  const isSelected = mode === 'bulk' && bulkSelected.includes(emp.id);
                  return (
                    <TouchableOpacity
                      key={emp.id}
                      style={[$.searchItem, isSelected && { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}
                      onPress={() => handleSelectEmployee(emp)}
                    >
                      {mode === 'bulk' && (
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
          {mode === 'bulk' && bulkSelected.length > 0 && (
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
          {mode === 'single' && selectedId && (
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
          {((mode === 'single' && selectedId && employee) || (mode === 'bulk' && bulkSelected.length > 0)) && (
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
          {mode === 'single' && selectedId && employee && attStatus !== 'CHECKED_OUT' && (
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
          {mode === 'single' && selectedId && employee && attStatus === 'CHECKED_OUT' && (
            <AnimatedRN.View entering={FadeInDown.duration(300)} style={$.infoBox}>
              <CheckCircleIcon s={18} c={colors.success[500]} />
              <Text className="font-inter text-sm" style={{ color: colors.success[700], marginLeft: 8 }}>
                Employee has completed their shift for today.
              </Text>
            </AnimatedRN.View>
          )}

          {/* Action Buttons — Bulk */}
          {mode === 'bulk' && bulkSelected.length > 0 && (
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

const _createStyles = (isDark: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  segmentedRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    padding: 3, gap: 2,
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2,
  },
  content: { padding: 20, gap: 12 },

  // Search
  searchContainer: { zIndex: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1A1730' : colors.white,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  searchInput: {
    flex: 1, marginLeft: 10, fontSize: 14, color: colors.primary[950],
    fontFamily: 'Inter_400Regular', padding: 0,
  },
  searchDropdown: {
    backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
    maxHeight: 300, overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
  },
  searchItemAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },

  // Bulk
  bulkInfoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
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
    backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  empHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  empPhoto: { width: 48, height: 48, borderRadius: 24 },
  empPhotoPlaceholder: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    justifyContent: 'center', alignItems: 'center',
  },
  empDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  detailPill: {
    backgroundColor: isDark ? colors.primary[900] : colors.primary[50], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
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
    backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
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
    width: 32, height: 32, borderRadius: 8, backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  emptyLog: {
    backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 12, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
  },
  logList: {
    backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
  },
  logItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
  },
  logAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },

  // Book mode
  bookDateBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 10,
    borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  bookDateArrow: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: isDark ? '#1A1730' : colors.neutral[100],
    borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  bookCard: {
    backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
    shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 1 }, shadowRadius: 6, elevation: 1,
  },
  bookCardDirty: {
    borderColor: colors.warning[400], borderWidth: 1.5,
  },
  bookCardError: {
    borderColor: colors.danger[400], borderWidth: 1.5,
  },
  bookCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  halfDropdown: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
  },
  halfDropdownDisabled: {
    opacity: 0.5, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
  },
  leaveTypeBtn: {
    maxWidth: 100, paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: isDark ? colors.accent[900] : colors.accent[50],
    borderRadius: 6, borderWidth: 1, borderColor: colors.accent[200],
  },
  bookStatusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  overrideBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: isDark ? colors.warning[900] : colors.warning[50],
    borderRadius: 8, borderWidth: 1, borderColor: colors.warning[300],
  },
  paginationBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    borderWidth: 1, borderColor: isDark ? colors.primary[800] : colors.primary[200],
  },
  saveAllFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: isDark ? '#0F0D1A' : colors.white,
    borderTopWidth: 1, borderTopColor: isDark ? colors.neutral[800] : colors.neutral[200],
    paddingHorizontal: 20, paddingTop: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: -4 }, shadowRadius: 12, elevation: 8,
  },
  saveAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14,
    shadowColor: colors.primary[700], shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 4,
  },
  pickerOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(8, 15, 40, 0.28)', paddingHorizontal: 28,
  },
  pickerCard: {
    width: '100%', maxWidth: 300, borderRadius: 16,
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    padding: 16,
    shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 20,
  },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4,
  },
  pickerOptionSelected: {
    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
  },
});
const $ = _createStyles(false);

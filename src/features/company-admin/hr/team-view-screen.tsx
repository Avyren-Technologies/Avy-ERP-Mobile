/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useApproveRequest, useRejectRequest } from '@/features/company-admin/api/use-ess-mutations';
import {
    usePendingMssApprovals,
    useTeamAttendance,
    useTeamLeaveCalendar,
    useTeamMembers,
    useApprovalRequests,
} from '@/features/company-admin/api/use-ess-queries';

// ============ TYPES ============

interface TeamMember {
    id: string;
    name: string;
    designation: string;
    status: 'Active' | 'On Leave' | 'Absent';
}

interface MSSApproval {
    id: string;
    employeeName: string;
    type: string;
    summary: string;
    submittedDate: string;
}

interface TeamAttendanceData {
    present: number;
    absent: number;
    onLeave: number;
    late: number;
    total: number;
}

interface TeamLeaveItem {
    employeeName: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    days: number;
}

// ============ CONSTANTS ============

const MEMBER_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    Active: { bg: colors.success[50], text: colors.success[700] },
    'On Leave': { bg: colors.info[50], text: colors.info[700] },
    Absent: { bg: colors.danger[50], text: colors.danger[700] },
};

// ============ SHARED ATOMS ============

function SectionCard({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</Text>
                {count !== undefined && (
                    <View style={styles.countBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{count}</Text></View>
                )}
            </View>
            {children}
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

// ============ MAIN COMPONENT ============

export function TeamViewScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [approvalTab, setApprovalTab] = React.useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

    const { data: membersResponse, isLoading: membersLoading, refetch: membersRefetch, isFetching: membersFetching } = useTeamMembers();
    const { data: pendingApprovalsResponse, isFetching: pendingFetching } = usePendingMssApprovals();
    const { data: historyResponse, isFetching: historyFetching } = useApprovalRequests({ status: approvalTab });
    const { data: attendanceResponse } = useTeamAttendance();
    const { data: calendarResponse } = useTeamLeaveCalendar();
    const approveMutation = useApproveRequest();
    const rejectMutation = useRejectRequest();

    const isLoading = membersLoading;
    const isFetching = membersFetching;

    // Parse team members
    const members: TeamMember[] = React.useMemo(() => {
        const raw = (membersResponse as any)?.data ?? membersResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((m: any) => ({
            id: m.id ?? '',
            name: m.name ?? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim(),
            designation: typeof m.designation === 'object' && m.designation !== null
                ? (m.designation.name ?? m.designation.title ?? '')
                : (m.designation ?? m.jobTitle ?? m.position ?? ''),
            status: m.status ?? 'Active',
        }));
    }, [membersResponse]);

    // Parse approvals based on current tab
    const approvals: MSSApproval[] = React.useMemo(() => {
        let raw: any[];
        if (approvalTab === 'PENDING') {
            raw = (pendingApprovalsResponse as any)?.data ?? pendingApprovalsResponse ?? [];
        } else {
            raw = (historyResponse as any)?.data ?? historyResponse ?? [];
            if (!Array.isArray(raw) && (historyResponse as any)?.data?.items) {
                raw = (historyResponse as any).data.items;
            }
        }
        
        if (!Array.isArray(raw)) return [];
        return raw.map((a: any) => ({
            id: a.id ?? '', 
            employeeName: a.employeeName ?? a.requesterName ?? a.employee?.name ?? 'Unknown',
            type: a.type ?? a.entityType ?? 'Request', 
            summary: a.summary ?? a.description ?? a.reason ?? '',
            submittedDate: a.submittedDate ?? a.createdAt ?? '',
        }));
    }, [pendingApprovalsResponse, historyResponse, approvalTab]);

    // Parse team attendance — only show if data actually came back
    const hasAttendanceData = React.useMemo(() => {
        const raw: any = (attendanceResponse as any)?.data ?? attendanceResponse;
        return raw && typeof raw === 'object' && !Array.isArray(raw) &&
            (raw.present !== undefined || raw.total !== undefined);
    }, [attendanceResponse]);

    const teamAttendance: TeamAttendanceData = React.useMemo(() => {
        const raw: any = (attendanceResponse as any)?.data ?? attendanceResponse ?? {};
        return {
            present: raw.present ?? 0, absent: raw.absent ?? 0,
            onLeave: raw.onLeave ?? 0, late: raw.late ?? 0, total: raw.total ?? members.length,
        };
    }, [attendanceResponse, members.length]);

    // Parse team leave calendar
    const teamLeaves: TeamLeaveItem[] = React.useMemo(() => {
        const raw = (calendarResponse as any)?.data ?? calendarResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((l: any) => ({
            employeeName: l.employeeName ?? '', leaveType: l.leaveType ?? l.type ?? '',
            fromDate: l.fromDate ?? '', toDate: l.toDate ?? '', days: l.days ?? 0,
        }));
    }, [calendarResponse]);

    const handleApprove = (item: MSSApproval) => {
        showConfirm({
            title: 'Approve', message: `Approve ${item.type} request from ${item.employeeName}?`,
            confirmText: 'Approve', variant: 'primary',
            onConfirm: () => approveMutation.mutate({ id: item.id }),
        });
    };

    const handleReject = (item: MSSApproval) => {
        showConfirm({
            title: 'Reject', message: `Reject ${item.type} request from ${item.employeeName}?`,
            confirmText: 'Reject', variant: 'danger',
            onConfirm: () => rejectMutation.mutate({ id: item.id }),
        });
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="Team View" onMenuPress={toggle} />
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    const attendancePct = teamAttendance.total > 0 ? Math.round((teamAttendance.present / teamAttendance.total) * 100) : 0;

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Team View" onMenuPress={toggle} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                refreshControl={<RefreshControl refreshing={(isFetching || pendingFetching || historyFetching) && !isLoading} onRefresh={() => membersRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            >
                {/* Team Attendance Summary — only show if data available */}
                {hasAttendanceData ? (
                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    <SectionCard title="Today's Team Attendance">
                        <View style={styles.kpiGrid}>
                            <View style={[styles.kpiCard, { borderLeftColor: colors.success[500], borderLeftWidth: 3 }]}>
                                <Text className="font-inter text-xl font-bold text-success-600">{teamAttendance.present}</Text>
                                <Text className="font-inter text-[10px] font-bold uppercase text-neutral-500">Present</Text>
                            </View>
                            <View style={[styles.kpiCard, { borderLeftColor: colors.danger[500], borderLeftWidth: 3 }]}>
                                <Text className="font-inter text-xl font-bold text-danger-600">{teamAttendance.absent}</Text>
                                <Text className="font-inter text-[10px] font-bold uppercase text-neutral-500">Absent</Text>
                            </View>
                            <View style={[styles.kpiCard, { borderLeftColor: colors.info[500], borderLeftWidth: 3 }]}>
                                <Text className="font-inter text-xl font-bold text-info-600">{teamAttendance.onLeave}</Text>
                                <Text className="font-inter text-[10px] font-bold uppercase text-neutral-500">On Leave</Text>
                            </View>
                            <View style={[styles.kpiCard, { borderLeftColor: colors.warning[500], borderLeftWidth: 3 }]}>
                                <Text className="font-inter text-xl font-bold text-warning-600">{teamAttendance.late}</Text>
                                <Text className="font-inter text-[10px] font-bold uppercase text-neutral-500">Late</Text>
                            </View>
                        </View>
                        <View style={styles.attBarWrap}>
                            <View style={styles.attBarBg}>
                                <View style={[styles.attBarFill, { width: `${attendancePct}%` as any }]} />
                            </View>
                            <Text className="ml-3 font-inter text-xs font-bold text-primary-700">{attendancePct}%</Text>
                        </View>
                    </SectionCard>
                </Animated.View>
                ) : null}

                {/* Approvals Section */}
                <Animated.View entering={FadeInUp.duration(350).delay(200)}>
                    <SectionCard title="Approvals Queue" count={approvals.length}>
                        {/* Tab Selector */}
                        <View style={styles.tabContainer}>
                            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
                                <Pressable
                                    key={tab}
                                    onPress={() => setApprovalTab(tab)}
                                    style={[styles.tabButton, approvalTab === tab && styles.tabButtonActive]}
                                >
                                    <Text className={`font-inter text-[10px] font-bold ${approvalTab === tab ? 'text-white' : 'text-primary-700'}`}>
                                        {tab}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {approvals.length === 0 ? (
                            <Text className="py-6 text-center font-inter text-xs text-neutral-400">
                                No {approvalTab.toLowerCase()} requests
                            </Text>
                        ) : (
                            approvals.map(a => (
                                <View key={a.id} style={styles.approvalItem}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                        <AvatarCircle name={a.employeeName} />
                                        <View style={{ flex: 1 }}>
                                            <Text className="font-inter text-sm font-semibold text-primary-950" numberOfLines={1}>{a.employeeName}</Text>
                                            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 2 }}>
                                                <View style={styles.typeBadge}><Text className="font-inter text-[10px] font-bold text-info-700">{a.type}</Text></View>
                                                <Text className="font-inter text-[10px] text-neutral-400">{new Date(a.submittedDate).toLocaleDateString()}</Text>
                                            </View>
                                            {a.summary ? <Text className="mt-1 font-inter text-xs text-neutral-500" numberOfLines={1}>{a.summary}</Text> : null}
                                        </View>
                                    </View>
                                    {approvalTab === 'PENDING' && (
                                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                                            <Pressable onPress={() => handleApprove(a)} style={styles.approveBtn}>
                                                <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                            </Pressable>
                                            <Pressable onPress={() => handleReject(a)} style={styles.rejectActionBtn}>
                                                <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </SectionCard>
                </Animated.View>

                {/* Team Members */}
                <Animated.View entering={FadeInUp.duration(350).delay(300)}>
                    <SectionCard title="Team Members" count={members.length}>
                        {members.length === 0 ? (
                            <Text className="py-4 text-center font-inter text-xs text-neutral-400">No team members</Text>
                        ) : (
                            members.map(m => {
                                const sc = MEMBER_STATUS_COLORS[m.status] ?? MEMBER_STATUS_COLORS.Active;
                                return (
                                    <View key={m.id} style={styles.memberRow}>
                                        <AvatarCircle name={m.name} />
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text className="font-inter text-sm font-semibold text-primary-950" numberOfLines={1}>{m.name}</Text>
                                            <Text className="font-inter text-[10px] text-neutral-500">{m.designation}</Text>
                                        </View>
                                        <View style={[styles.memberStatusBadge, { backgroundColor: sc.bg }]}>
                                            <Text style={{ color: sc.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{m.status}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </SectionCard>
                </Animated.View>

                {/* Team Leave Calendar */}
                <Animated.View entering={FadeInUp.duration(350).delay(400)}>
                    <SectionCard title="Upcoming Team Leaves" count={teamLeaves.length}>
                        {teamLeaves.length === 0 ? (
                            <Text className="py-4 text-center font-inter text-xs text-neutral-400">No upcoming leaves</Text>
                        ) : (
                            teamLeaves.map((l, i) => (
                                <View key={i} style={styles.leaveRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950">{l.employeeName}</Text>
                                        <Text className="font-inter text-[10px] text-neutral-500">{l.leaveType} {'\u2022'} {l.fromDate} to {l.toDate}</Text>
                                    </View>
                                    <View style={styles.daysBadge}><Text className="font-inter text-xs font-bold text-primary-600">{l.days}d</Text></View>
                                </View>
                            ))
                        )}
                    </SectionCard>
                </Animated.View>
            </ScrollView>
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingTop: 8, paddingBottom: 16 },
    scrollContent: { paddingHorizontal: 24 },
    sectionCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    countBadge: { backgroundColor: colors.primary[50], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    kpiCard: {
        flex: 1, minWidth: '45%', backgroundColor: colors.neutral[50], borderRadius: 12, padding: 10,
        borderWidth: 1, borderColor: colors.neutral[100],
    },
    attBarWrap: { flexDirection: 'row', alignItems: 'center' },
    attBarBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.neutral[100], overflow: 'hidden' },
    attBarFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary[500] },
    avatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    approvalItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    typeBadge: { backgroundColor: colors.info[50], borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
    approveBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.success[600], justifyContent: 'center', alignItems: 'center' },
    rejectActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.danger[50], borderWidth: 1, borderColor: colors.danger[200], justifyContent: 'center', alignItems: 'center' },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    memberStatusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    leaveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    daysBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    tabContainer: { flexDirection: 'row', backgroundColor: colors.primary[50], borderRadius: 12, padding: 4, marginBottom: 16 },
    tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabButtonActive: { backgroundColor: colors.primary[600] },
});

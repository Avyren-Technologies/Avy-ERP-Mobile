import { Stack } from 'expo-router';

export default function HRLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="departments" />
      <Stack.Screen name="designations" />
      <Stack.Screen name="grades" />
      <Stack.Screen name="employee-types" />
      <Stack.Screen name="cost-centres" />
      <Stack.Screen name="employees" />
      <Stack.Screen name="employee-detail" />
      {/* Attendance */}
      <Stack.Screen name="attendance" />
      <Stack.Screen name="holidays" />
      <Stack.Screen name="rosters" />
      <Stack.Screen name="attendance-rules" />
      <Stack.Screen name="attendance-overrides" />
      <Stack.Screen name="overtime-rules" />
      {/* Leave Management */}
      <Stack.Screen name="leave-types" />
      <Stack.Screen name="leave-policies" />
      <Stack.Screen name="leave-requests" />
      <Stack.Screen name="leave-balances" />
      {/* Payroll & Compliance */}
      <Stack.Screen name="salary-components" />
      <Stack.Screen name="salary-structures" />
      <Stack.Screen name="employee-salary" />
      <Stack.Screen name="statutory-config" />
      <Stack.Screen name="tax-config" />
      <Stack.Screen name="bank-config" />
      <Stack.Screen name="loan-policies" />
      <Stack.Screen name="loans" />
      {/* Payroll Operations */}
      <Stack.Screen name="payroll-runs" />
      <Stack.Screen name="payslips" />
      <Stack.Screen name="salary-holds" />
      <Stack.Screen name="salary-revisions" />
      <Stack.Screen name="statutory-filings" />
      <Stack.Screen name="payroll-reports" />
      {/* ESS & Workflows */}
      <Stack.Screen name="ess-config" />
      <Stack.Screen name="approval-workflows" />
      <Stack.Screen name="approval-requests" />
      <Stack.Screen name="notification-templates" />
      <Stack.Screen name="notification-rules" />
      <Stack.Screen name="it-declarations" />
      {/* Self-Service */}
      <Stack.Screen name="my-profile" />
      <Stack.Screen name="my-payslips" />
      <Stack.Screen name="my-leave" />
      <Stack.Screen name="my-attendance" />
      <Stack.Screen name="shift-check-in" />
      <Stack.Screen name="team-view" />
      {/* Recruitment & Training */}
      <Stack.Screen name="requisitions" />
      <Stack.Screen name="candidates" />
      <Stack.Screen name="training" />
      <Stack.Screen name="training-nominations" />
      {/* Exit & Separation */}
      <Stack.Screen name="exit-requests" />
      <Stack.Screen name="clearance-dashboard" />
      <Stack.Screen name="fnf-settlement" />
      {/* Advanced HR */}
      <Stack.Screen name="assets" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="hr-letters" />
      <Stack.Screen name="grievances" />
      <Stack.Screen name="disciplinary" />
      {/* Transfers & Promotions */}
      <Stack.Screen name="transfers" />
      <Stack.Screen name="promotions" />
      <Stack.Screen name="delegates" />
      {/* Performance Management */}
      <Stack.Screen name="appraisal-cycles" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="feedback-360" />
      <Stack.Screen name="ratings" />
      <Stack.Screen name="skills" />
      <Stack.Screen name="succession" />
      <Stack.Screen name="performance-dashboard" />
      {/* New screens */}
      <Stack.Screen name="org-chart" />
      <Stack.Screen name="biometric-devices" />
      <Stack.Screen name="shift-rotations" />
      <Stack.Screen name="bonus-batches" />
      <Stack.Screen name="form-16" />
      <Stack.Screen name="travel-advances" />
      <Stack.Screen name="esign" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="probation-reviews" />
      <Stack.Screen name="chatbot" />
      <Stack.Screen name="data-retention" />
      <Stack.Screen name="production-incentives" />
      {/* Analytics Dashboards */}
      <Stack.Screen name="analytics" />
    </Stack>
  );
}

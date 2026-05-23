import { Stack } from 'expo-router';

export default function MaintenanceLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="assets" />
            <Stack.Screen name="asset-detail" />
            <Stack.Screen name="asset-hierarchy" />
            <Stack.Screen name="work-requests" />
            <Stack.Screen name="work-request-detail" />
            <Stack.Screen name="work-request-create" />
            <Stack.Screen name="scan-asset" />
            <Stack.Screen name="log-reading" />
            <Stack.Screen name="work-orders" />
            <Stack.Screen name="work-order-detail" />
            <Stack.Screen name="work-order-create" />
            <Stack.Screen name="work-order-board" />
            <Stack.Screen name="execute-checklist" />
            <Stack.Screen name="add-parts" />
            <Stack.Screen name="log-labour" />
            <Stack.Screen name="capture-evidence" />
            <Stack.Screen name="close-job" />
            <Stack.Screen name="pm-schedules" />
            <Stack.Screen name="pm-schedule-detail" />
            <Stack.Screen name="pm-schedule-create" />
            <Stack.Screen name="pm-calendar" />
            <Stack.Screen name="breakdowns" />
            <Stack.Screen name="breakdown-log" />
            <Stack.Screen name="downtime-history" />
            <Stack.Screen name="contracts" />
            <Stack.Screen name="contract-detail" />
            <Stack.Screen name="spare-parts" />
            <Stack.Screen name="ptw" />
            <Stack.Screen name="ptw-detail" />
            <Stack.Screen name="shutdown" />
            <Stack.Screen name="shutdown-detail" />
            <Stack.Screen name="shutdown-progress" />
            <Stack.Screen name="analytics" />
            <Stack.Screen name="reliability" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="config/index" />
            <Stack.Screen name="config/failure-codes" />
            <Stack.Screen name="config/strategies" />
            <Stack.Screen name="config/job-plans" />
            <Stack.Screen name="config/checklists" />
        </Stack>
    );
}

import { Stack } from 'expo-router';

export default function VisitorsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="gate-check-in" />
      <Stack.Screen name="pre-register" />
      <Stack.Screen name="list" />
      <Stack.Screen name="detail" />
      <Stack.Screen name="on-site" />
      <Stack.Screen name="visitor-types" />
      <Stack.Screen name="gates" />
      <Stack.Screen name="watchlist" />
      <Stack.Screen name="emergency" />
      <Stack.Screen name="recurring-passes" />
      <Stack.Screen name="group-visits" />
      <Stack.Screen name="vehicle-passes" />
      <Stack.Screen name="material-passes" />
      <Stack.Screen name="denied-entries" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="history" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

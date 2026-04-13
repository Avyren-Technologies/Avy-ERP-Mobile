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
      <Stack.Screen name="settings" />
    </Stack>
  );
}

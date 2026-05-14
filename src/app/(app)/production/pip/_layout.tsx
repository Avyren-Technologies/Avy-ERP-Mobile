import { Stack } from 'expo-router';

export default function PipLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="slab-config" />
      <Stack.Screen name="daily-entry" />
      <Stack.Screen name="calculator" />
      <Stack.Screen name="daily-report" />
      <Stack.Screen name="summary-report" />
      <Stack.Screen name="config" />
    </Stack>
  );
}

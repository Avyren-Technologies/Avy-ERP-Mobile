import { Stack } from 'expo-router';

export default function AnalyticsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="executive" />
      <Stack.Screen name="workforce" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="leave" />
      <Stack.Screen name="payroll" />
      <Stack.Screen name="compliance" />
      <Stack.Screen name="performance" />
      <Stack.Screen name="recruitment" />
      <Stack.Screen name="attrition" />
    </Stack>
  );
}

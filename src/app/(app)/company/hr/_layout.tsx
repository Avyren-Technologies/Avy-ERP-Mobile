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
    </Stack>
  );
}

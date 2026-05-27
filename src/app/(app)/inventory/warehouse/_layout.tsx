import { Stack } from 'expo-router';

export default function WarehouseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="putaway-scan" />
      <Stack.Screen name="pick-scan" />
      <Stack.Screen name="count-scan" />
      <Stack.Screen name="dispatch-scan" />
    </Stack>
  );
}

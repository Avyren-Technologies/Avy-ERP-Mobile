import { Stack } from 'expo-router';

export default function InventoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="stock" />
      <Stack.Screen name="receive" />
      <Stack.Screen name="grn/index" />
      <Stack.Screen name="grn/[id]" />
      <Stack.Screen name="put-away" />
      <Stack.Screen name="transfer" />
      <Stack.Screen name="adjustments" />
      <Stack.Screen name="issue" />
      <Stack.Screen name="dispatch" />
      <Stack.Screen name="returns/index" />
      <Stack.Screen name="returns/vendor" />
      <Stack.Screen name="counts/index" />
      <Stack.Screen name="counts/new" />
      <Stack.Screen name="counts/[id]" />
      <Stack.Screen name="approvals" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="config" />
      <Stack.Screen name="production" />
      <Stack.Screen name="warehouse" />
      <Stack.Screen name="tool-room" />
    </Stack>
  );
}

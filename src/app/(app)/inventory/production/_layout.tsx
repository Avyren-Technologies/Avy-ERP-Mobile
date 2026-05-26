import { Stack } from 'expo-router';

export default function ProductionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="issue" />
      <Stack.Screen name="issue-detail/[id]" />
      <Stack.Screen name="fg-receipt" />
      <Stack.Screen name="material-return" />
      <Stack.Screen name="scrap" />
      <Stack.Screen name="reconciliation" />
    </Stack>
  );
}

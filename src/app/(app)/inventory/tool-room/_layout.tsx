import { Stack } from 'expo-router';

export default function ToolRoomLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="policies" />
      <Stack.Screen name="issue" />
      <Stack.Screen name="return" />
      <Stack.Screen name="reconditioning" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="reports-at-machine" />
      <Stack.Screen name="reports-consumption" />
      <Stack.Screen name="reports-breakage" />
    </Stack>
  );
}

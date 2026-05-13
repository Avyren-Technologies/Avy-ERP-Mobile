import { Stack } from 'expo-router';

export default function MastersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="parts" />
      <Stack.Screen name="machines" />
    </Stack>
  );
}

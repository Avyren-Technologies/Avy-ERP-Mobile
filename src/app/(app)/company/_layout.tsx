import { Stack } from 'expo-router';

export default function CompanyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="profile" />
      <Stack.Screen name="locations" />
      <Stack.Screen name="shifts" />
      <Stack.Screen name="contacts" />
      <Stack.Screen name="no-series" />
      <Stack.Screen name="iot-reasons" />
      <Stack.Screen name="controls" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="users" />
      <Stack.Screen name="roles" />
      <Stack.Screen name="feature-toggles" />
      <Stack.Screen name="hr" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="production" />
      <Stack.Screen name="maintenance" />
    </Stack>
  );
}

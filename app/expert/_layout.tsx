import { Stack } from 'expo-router';

export default function ExpertLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="expert-home" />
      <Stack.Screen name="expert-client" />
      <Stack.Screen name="calm" />
    </Stack>
  );
}

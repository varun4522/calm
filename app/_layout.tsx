import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/Colors';
import '@/constants/GlobalStyles'; // Import global styles to make Tinos font available
import QueryProvider from '@/providers/QueryProvider';
import AuthProvider from '@/providers/AuthProvider';
import toastConfig from '@/components/CustomToast';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  const [loaded] = useFonts({
    Tinos: require('../assets/fonts/Tinos-Regular.ttf'),
    IrishGrover: require('../assets/fonts/IrishGrover-Regular.ttf'),
    Roboto: require('../assets/fonts/Roboto.ttf'),
    Agbalumo: require('../assets/fonts/Agbalumo-Regular.ttf'),
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
      <QueryProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
        <Toast config={toastConfig}/>
      </QueryProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );

}


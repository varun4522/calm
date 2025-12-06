//varun kumar
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { globalStyles } from '@/constants/GlobalStyles';

export default function TermsPage() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Tinos: require('@/assets/fonts/Tinos-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Back Button - Top Left */}
      <View style={{ position: 'absolute', top: 12, left: 16, zIndex: 100 }}>
        <TouchableOpacity
          style={{
            backgroundColor: Colors.buttonPrimary,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
            elevation: 4,
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
          onPress={() => router.back()}
        >
          <Text style={[globalStyles.button, { color: Colors.white, fontSize: 16, fontWeight: 'bold' }]}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 70 }}>
        <Text style={[globalStyles.title, { fontSize: 32, textAlign: 'center', marginBottom: 16 }]}>
          Terms and Conditions
        </Text>
        <View
          style={{
            backgroundColor: Colors.surface,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: Colors.border,
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 5,
            elevation: 4,
          }}
        >
          <Text style={[globalStyles.body, { fontSize: 18, lineHeight: 26, color: Colors.text }]}>
            Welcome to C.A.L.M Space!
            {"\n\n"}
            By using this app, you agree to the following terms and conditions:
            {"\n\n"}
            1. You will use this app for lawful and respectful purposes only.
            {"\n\n"}
            2. Your personal data will be handled according to our privacy policy.
            {"\n\n"}
            3. The app is provided "as is" without warranties of any kind.
            {"\n\n"}
            4. We may update these terms at any time. Continued use means you accept the new terms.
            {"\n\n"}
            5. For questions, contact support@calmspace.com.
            {"\n\n"}
            Thank you for using our app!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

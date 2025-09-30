import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

export default function FrontPage() {
  const router = useRouter();

  const [loaded] = useFonts({
    Tinos: require('../assets/fonts/Tinos-Regular.ttf'),
    IrishGrover: require('../assets/fonts/IrishGrover-Regular.ttf'),
    Roboto: require('../assets/fonts/Roboto.ttf'),
  });

  useEffect(() => {
    // Fonts loaded, but navigation is now handled by buttons
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7965AF" />
      </View>
    );
  }

  return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <Image
          source={require('../assets/images/logo2.png')}
          style={{ width: 250, height: 200, marginTop: 50 }}
        />
        <Text style={{
          textAlign: 'center',
          fontSize: 60,
          fontWeight: '600',
          color: '#4F21A2',
          fontFamily: 'Agbalumo',
          letterSpacing: -1,
        }}>
          C.A.L.M
        </Text>
        <Text style={{
          marginTop: -19,
          textAlign: 'center',
          fontSize: 60,
          color: '#4F21A2',
          fontFamily: 'Agbalumo'
        }}>
          Companion
        </Text>
        <Text
          style={{
            marginTop: 15,
            fontSize: 20,
            fontWeight: 'bold',
            color: '#4F21A2',
            textAlign: 'center',
            fontFamily: 'Tinos'
          }}
        >
          Powered By{"\n"}
          C.A.L.M Spaces{"\n"}
          CEAPS, SGT UNIVERSITY{"\n"}
          Cultivating Awareness, Lightness & Movement
        </Text>

        {/* Login and Register Buttons */}
        <View style={{ marginTop: 40, width: '80%', alignItems: 'center' }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#4F21A2',
              paddingVertical: 15,
              paddingHorizontal: 40,
              borderRadius: 25,
              marginBottom: 15,
              width: '100%',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
            onPress={() => router.push('/select')}
          >
            <Text style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: 'Tinos'
            }}>
              Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderColor: '#4F21A2',
              paddingVertical: 15,
              paddingHorizontal: 40,
              borderRadius: 25,
              width: '100%',
              alignItems: 'center',
            }}
            onPress={() => router.push('/select')}
          >
            <Text style={{
              color: '#4F21A2',
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: 'Tinos'
            }}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

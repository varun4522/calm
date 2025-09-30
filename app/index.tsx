import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function FrontPage() {
  const router = useRouter();

  const [loaded] = useFonts({
    Tinos: require('../assets/fonts/Tinos-Regular.ttf'),
    IrishGrover: require('../assets/fonts/IrishGrover-Regular.ttf'),
    Roboto: require('../assets/fonts/Roboto.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      const timer = setTimeout(() => {
        router.replace('/select');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loaded, router]);

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
      </View>
  );
}

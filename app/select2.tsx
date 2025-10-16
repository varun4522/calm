import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { globalStyles } from '@/constants/GlobalStyles';

export default function SelectPage() {
  const [fontsLoaded] = useFonts({
    Tinos: require('../assets/fonts/Tinos-Regular.ttf'),
  });

  const [showExpertModal, setShowExpertModal] = useState(false);
  const [rainbowOpacity] = useState(new Animated.Value(0.7));

  useEffect(() => {
    // Animate rainbow opacity for a subtle pulsing effect
    const animate = () => {
      Animated.sequence([
        Animated.timing(rainbowOpacity, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(rainbowOpacity, {
          toValue: 0.7,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, []);

  if (!fontsLoaded) {
    return null; // Wait for fonts to load
  }

  return (
    <View style={{ flex: 1 }}>
  <View style={{ flex: 1, backgroundColor: Colors.background, marginTop: -40 }}>
        <Svg
          height="100%"
          width="100%"
          style={{ position: 'absolute', top: '20%' }}
          viewBox="0 0 100 100"
        >
          <Path
            d="M0,20 C30,40 70,0 100,20 L100,100 L0,100 Z"
            fill="#D8BFD8"
          />
        </Svg>
      <View style={{ position: 'absolute', top: 100, left: 16, zIndex: 100 }}>
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
          onPress={() => router.push('/')}
        >
          <Text style={[globalStyles.button, { color: Colors.white, fontSize: 16, fontWeight: 'bold', fontFamily: 'Tinos' }]}>← Back</Text>
        </TouchableOpacity>
      </View>
      <View style={{ position: 'absolute', top: 100, right: 16, zIndex: 100 }}>
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
          onPress={() => router.push('./help')}
        >
          <Text style={[globalStyles.button, { color: Colors.white, fontSize: 16, fontWeight: 'bold', fontFamily: 'Tinos' }]}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* Logo placed above the LogIn text */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
        <Text style={[globalStyles.title, { fontSize: 50, color: Colors.white, marginBottom: 40, fontWeight: 'bold', fontFamily: 'Tinos', textShadowColor: Colors.black, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 3 }]}>
          Sign up
        </Text>
        <TouchableOpacity
          style={{
            paddingVertical: 16,
            paddingHorizontal: 40,
            borderRadius: 25,
            marginBottom: 24,
            backgroundColor: Colors.white,
            elevation: 4,
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 5,
            borderWidth: 2,
            borderColor: Colors.primary,
          }}
          onPress={() => router.push('/student-register')}
        >
          <Text style={[globalStyles.button, { color: Colors.primary, fontSize: 20, fontWeight: 'bold', fontFamily: 'Tinos' }]}>Student Register</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            paddingVertical: 16,
            paddingHorizontal: 40,
            borderRadius: 25,
            marginBottom: 24,
            backgroundColor: Colors.white,
            elevation: 4,
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 5,
            borderWidth: 2,
            borderColor: Colors.primary,
          }}
          onPress={() => router.push('/peer-listener-register')}
        >
          <Text style={[globalStyles.button, { color: Colors.primary, fontSize: 20, fontWeight: 'bold', fontFamily: 'Tinos' }]}>Peer Register</Text>
        </TouchableOpacity>
      </View>
      <Pressable
        onPress={() => router.push('./term')}
        style={{ alignItems: 'center', marginBottom: 24 }}
      >
        <Text style={[globalStyles.body, { color: Colors.white, fontSize: 20, fontFamily: 'Tinos' }]}>*Terms and Conditions</Text>
      </Pressable>

      {/* Expert Register Type Modal */}
      <Modal
        visible={showExpertModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExpertModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20
        }}>
          <View style={{
            backgroundColor: Colors.surface,
            borderRadius: 20,
            padding: 30,
            width: '90%',
            maxWidth: 400,
            alignItems: 'center',
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10
          }}>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: Colors.text,
              marginBottom: 20,
              textAlign: 'center',
              fontFamily: 'Tinos'
            }}>
              Reg as:
            </Text>

            {/* Peer Listener Register Button */}
            <TouchableOpacity
              style={{
                backgroundColor: Colors.white,
                paddingVertical: 16,
                paddingHorizontal: 40,
                borderRadius: 25,
                marginBottom: 20,
                width: '100%',
                alignItems: 'center',
                elevation: 4,
                shadowColor: Colors.shadow,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.18,
                shadowRadius: 5,
                borderWidth: 2,
                borderColor: Colors.primary,
              }}
              onPress={() => {
                setShowExpertModal(false);
                router.push('/peer-listener-register');
              }}
            >
              <Text style={{
                color: Colors.primary,
                fontSize: 19,
                fontWeight: 'bold',
                fontFamily: 'Tinos'
              }}>
                Peer Listener Register
              </Text>
              <Text style={{
                color: Colors.primary,
                fontSize: 12,
                marginTop: 4,
                fontFamily: 'Tinos'
              }}>
                Trained Student Supporter
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={{
                backgroundColor: Colors.transparent,
                paddingVertical: 12,
                paddingHorizontal: 30,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: Colors.accent
              }}
              onPress={() => setShowExpertModal(false)}
            >
              <Text style={{
                color: Colors.accent,
                fontSize: 16,
                fontWeight: 'bold',
                fontFamily: 'Tinos'
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </View>
  );
}

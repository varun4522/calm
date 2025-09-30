import { ResizeMode, Video } from 'expo-av';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function ToolkitMovement() {
  const router = useRouter();

  // Shake It Out State
  const [showShakeOut, setShowShakeOut] = useState(false);
  const [shakeStep, setShakeStep] = useState(0);
  const [shakeTimer, setShakeTimer] = useState(10);
  const [isShaking, setIsShaking] = useState(false);

  // Dance and Movement Art State
  const [showDanceArt, setShowDanceArt] = useState(false);

  // Shake it out steps
  const shakeSteps = [
    { name: 'Shake Your Hands', duration: 10, instruction: 'Shake your hands vigorously! Let all the tension go!' },
    { name: 'Shake Your Feet', duration: 10, instruction: 'Now shake your feet! Feel the energy moving!' },
    { name: 'Shake Your Whole Body', duration: 30, instruction: 'Shake everything! Jump, wiggle, be silly! Let it all out!' },
    { name: 'Deep Breath & Stillness', duration: 10, instruction: 'Stop and take three deep breaths. Notice how alive you feel!' }
  ];

  // Shake timer effect
  useEffect(() => {
    let timer: any;
    if (isShaking && shakeTimer > 0) {
      timer = setTimeout(() => {
        setShakeTimer((prev) => prev - 1);
      }, 1000);
    } else if (isShaking && shakeTimer === 0) {
      // Move to next shake step
      if (shakeStep < shakeSteps.length - 1) {
        setShakeStep((prev) => prev + 1);
        setShakeTimer(shakeSteps[shakeStep + 1]?.duration || 10);
      } else {
        setIsShaking(false);
        Alert.alert('Complete!', 'How does your body feel now? More alive? More relaxed?');
      }
    }
    return () => clearTimeout(timer);
  }, [isShaking, shakeTimer, shakeStep]);

  const resetStates = () => {
    setShakeStep(0);
    setShakeTimer(10);
    setIsShaking(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#e8f5e8' }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#27ae60' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 15 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>Movement Exercise</Text>
        <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 5 }}>Connect with your body through movement</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ paddingVertical: 20 }}>
          {/* Dance and Movement Art */}
          <TouchableOpacity
            style={{ backgroundColor: '#9b59b6', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5 }}
            onPress={() => setShowDanceArt(true)}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>Dance and Movement Art</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Express yourself through creative movement</Text>
          </TouchableOpacity>

          {/* Shake It Out */}
          <TouchableOpacity
            style={{ backgroundColor: '#e74c3c', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5 }}
            onPress={() => setShowShakeOut(true)}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>Shake It Out!</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>60 seconds of energizing movement</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Shake It Out Modal */}
      <Modal visible={showShakeOut} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 30, width: '90%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>Shake It Out!</Text>

            <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#e74c3c' }}>
              {shakeSteps[shakeStep]?.name}
            </Text>

            <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#2c3e50', lineHeight: 24 }}>
              {shakeSteps[shakeStep]?.instruction}
            </Text>

            {isShaking && (
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#e74c3c' }}>{shakeTimer}</Text>
                <Text style={{ fontSize: 16, color: '#2c3e50' }}>seconds remaining</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#95a5a6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                onPress={() => {
                  setShowShakeOut(false);
                  setIsShaking(false);
                  resetStates();
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: isShaking ? '#e74c3c' : '#2ecc71', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                onPress={() => {
                  if (isShaking) {
                    setIsShaking(false);
                  } else {
                    setIsShaking(true);
                    setShakeStep(0);
                    setShakeTimer(shakeSteps[0].duration);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isShaking ? 'Stop' : 'Start Shaking!'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dance and Movement Art Modal */}
      <Modal visible={showDanceArt} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 30, width: '90%', maxHeight: '80%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>Dance and Movement Art</Text>

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#9b59b6' }}>Video 1</Text>
                <Video
                  style={{ width: '100%', height: 200, borderRadius: 10 }}
                  source={require('../../assets/videos/3 Things  Dilpreet Dhillon feat. Shipra Goyal  Geet Goraya  Desi Crew  Kaptaan - BANG Music (720p, h264).mp4')}
                  useNativeControls={true}
                  resizeMode={ResizeMode.CONTAIN}
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#9b59b6' }}>Video 2</Text>
                <Video
                  style={{ width: '100%', height: 200, borderRadius: 10 }}
                  source={require('../../assets/videos/Showstopper _ JERRY (Official Music Video).mp4')}
                  useNativeControls={true}
                  resizeMode={ResizeMode.CONTAIN}
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#9b59b6' }}>Video 3</Text>
                <Video
                  style={{ width: '100%', height: 200, borderRadius: 10 }}
                  source={require('../../assets/videos/UNTOUCHABLE (OFFICIAL VIDEO) _ TEGI PANNU _ MANNI SANDHU _ LATEST PUNJABI SONGS 2022.mp4')}
                  useNativeControls={true}
                  resizeMode={ResizeMode.CONTAIN}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#95a5a6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                onPress={() => {
                  setShowDanceArt(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

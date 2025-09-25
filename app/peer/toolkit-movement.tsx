import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function ToolkitMovement() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration: string }>();
  const studentRegNo = params.registration;

  // Progressive Muscle Scan State
  const [showMuscleScan, setShowMuscleScan] = useState(false);
  const [muscleScanStep, setMuscleScanStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Walking Grounding State
  const [showWalkingGuide, setShowWalkingGuide] = useState(false);
  const [walkingStep, setWalkingStep] = useState(0);

  // Shake It Out State
  const [showShakeOut, setShowShakeOut] = useState(false);
  const [shakeStep, setShakeStep] = useState(0);
  const [shakeTimer, setShakeTimer] = useState(10);
  const [isShaking, setIsShaking] = useState(false);

  // Progressive Muscle Scan data
  const muscleGroups = [
    { name: "Right Foot", instruction: "Curl your right toes tightly. Hold for 5 seconds... Now release and feel the relaxation flow through your foot.", duration: 8000 },
    { name: "Left Foot", instruction: "Curl your left toes tightly. Hold for 5 seconds... Now release and notice the difference.", duration: 8000 },
    { name: "Right Calf", instruction: "Tense your right calf muscle by pointing your toes up. Hold... Now let it go completely.", duration: 8000 },
    { name: "Left Calf", instruction: "Tense your left calf muscle. Feel the tension... Now release and relax.", duration: 8000 },
    { name: "Thighs", instruction: "Squeeze both thigh muscles tightly. Hold the tension... Now let them go and feel the relief.", duration: 8000 },
    { name: "Glutes", instruction: "Tighten your glute muscles. Hold... Now release and let them sink into relaxation.", duration: 8000 },
    { name: "Abdomen", instruction: "Tense your stomach muscles. Make them tight... Now let them go and breathe deeply.", duration: 8000 },
    { name: "Hands", instruction: "Make tight fists with both hands. Squeeze... Now open them and feel the tension melt away.", duration: 8000 },
    { name: "Arms", instruction: "Tense your entire arms. Hold them tight... Now let them drop and feel completely relaxed.", duration: 8000 },
    { name: "Shoulders", instruction: "Lift your shoulders up to your ears. Hold the tension... Now drop them down and feel the release.", duration: 8000 },
    { name: "Face", instruction: "Scrunch your entire face - forehead, eyes, mouth. Hold... Now relax everything and smile gently.", duration: 8000 },
    { name: "Complete", instruction: "Take a moment to notice your whole body. Feel the relaxation from your toes to your head. You are completely relaxed.", duration: 10000 }
  ];

  // Grounding steps
  // Grounding steps (removed)

  // Finger trace shapes (removed)

  // Movement breaks (removed)

  // Walking guide steps
  const walkingSteps = [
    { instruction: "Begin by standing still. Feel your feet on the ground." },
    { instruction: "Take your first step slowly. Notice how your weight shifts." },
    { instruction: "As you walk, feel each foot touching the ground." },
    { instruction: "Listen to the sounds around you - your footsteps, nature, life." },
    { instruction: "Notice what you see - colors, shapes, movement." },
    { instruction: "Feel the air on your skin. Is it warm? Cool? Moving?" },
    { instruction: "Continue walking mindfully, staying present with each step." }
  ];

  // Shake it out steps
  const shakeSteps = [
    { name: "Shake Your Hands", duration: 10, instruction: "Shake your hands vigorously! Let all the tension go!" },
    { name: "Shake Your Feet", duration: 10, instruction: "Now shake your feet! Feel the energy moving!" },
    { name: "Shake Your Whole Body", duration: 30, instruction: "Shake everything! Jump, wiggle, be silly! Let it all out!" },
    { name: "Deep Breath & Stillness", duration: 10, instruction: "Stop and take three deep breaths. Notice how alive you feel!" }
  ];

  // Start muscle scan progression
  useEffect(() => {
    let timer: any;
    if (isPlaying && muscleScanStep < muscleGroups.length) {
      timer = setTimeout(() => {
        setMuscleScanStep(prev => prev + 1);
        if (muscleScanStep >= muscleGroups.length - 1) {
          setIsPlaying(false);
        }
      }, muscleGroups[muscleScanStep]?.duration || 8000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, muscleScanStep]);

  // Shake timer effect
  useEffect(() => {
    let timer: any;
    if (isShaking && shakeTimer > 0) {
      timer = setTimeout(() => {
        setShakeTimer(prev => prev - 1);
      }, 1000);
    } else if (isShaking && shakeTimer === 0) {
      // Move to next shake step
      if (shakeStep < shakeSteps.length - 1) {
        setShakeStep(prev => prev + 1);
        setShakeTimer(shakeSteps[shakeStep + 1]?.duration || 10);
      } else {
        setIsShaking(false);
        Alert.alert('Complete!', 'How does your body feel now? More alive? More relaxed?');
      }
    }
    return () => clearTimeout(timer);
  }, [isShaking, shakeTimer, shakeStep]);

  const resetStates = () => {
    setMuscleScanStep(0);
    setWalkingStep(0);
    setShakeStep(0);
    setShakeTimer(10);
    setIsPlaying(false);
    setIsShaking(false);
  };

  const saveSession = async (type: string) => {
    try {
      const data = {
        date: new Date().toISOString(),
        type: type,
        completed: true,
        userReg: studentRegNo
      };
      await AsyncStorage.setItem(`movement_${type}_${Date.now()}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#e8f5e8' }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#27ae60' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 15 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>🏃 Movement & Body</Text>
        <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 5 }}>Connect with your body through movement</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ paddingVertical: 20 }}>
          {/* Progressive Muscle Scan */}
          <TouchableOpacity
            style={{ backgroundColor: '#3498db', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5 }}
            onPress={() => setShowMuscleScan(true)}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>🧘 Progressive Muscle Scan</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Guided relaxation from feet to head</Text>
          </TouchableOpacity>







          {/* Walking Grounding */}
          <TouchableOpacity
            style={{ backgroundColor: '#2ecc71', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5 }}
            onPress={() => setShowWalkingGuide(true)}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>🚶 Walking Grounding</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Mindful walking guidance</Text>
          </TouchableOpacity>

          {/* Shake It Out */}
          <TouchableOpacity
            style={{ backgroundColor: '#e74c3c', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5 }}
            onPress={() => setShowShakeOut(true)}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>🎉 Shake It Out!</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>60 seconds of energizing movement</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Progressive Muscle Scan Modal */}
      <Modal visible={showMuscleScan} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 30, width: '90%', maxHeight: '80%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>
              Progressive Muscle Scan
            </Text>

            {muscleScanStep < muscleGroups.length && (
              <>
                <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#3498db' }}>
                  {muscleGroups[muscleScanStep]?.name}
                </Text>

                <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#2c3e50', lineHeight: 24 }}>
                  {muscleGroups[muscleScanStep]?.instruction}
                </Text>
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#95a5a6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                onPress={() => { setShowMuscleScan(false); setIsPlaying(false); resetStates(); }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: isPlaying ? '#e74c3c' : '#3498db', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                onPress={() => {
                  if (isPlaying) {
                    setIsPlaying(false);
                  } else {
                    setIsPlaying(true);
                    if (muscleScanStep >= muscleGroups.length) {
                      setMuscleScanStep(0);
                    }
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {isPlaying ? 'Pause' : muscleScanStep >= muscleGroups.length ? 'Restart' : 'Start'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Progress indicator */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 15 }}>
              {muscleGroups.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index <= muscleScanStep ? '#3498db' : '#bdc3c7',
                    marginHorizontal: 2
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>

  {/* Ground Your Feet removed */}

  {/* Finger Trace Breathing removed */}

  {/* Mini Movement Breaks removed */}

      {/* Walking Grounding Modal */}
      <Modal visible={showWalkingGuide} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 30, width: '90%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>
              🚶 Mindful Walking Guide
            </Text>

            <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#2ecc71' }}>
              Step {walkingStep + 1} of {walkingSteps.length}
            </Text>

            <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#2c3e50', lineHeight: 24 }}>
              {walkingSteps[walkingStep]?.instruction}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#95a5a6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                onPress={() => { setShowWalkingGuide(false); resetStates(); }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>

              {walkingStep > 0 && (
                <TouchableOpacity
                  style={{ backgroundColor: '#f39c12', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => setWalkingStep(walkingStep - 1)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Previous</Text>
                </TouchableOpacity>
              )}

              {walkingStep < walkingSteps.length - 1 ? (
                <TouchableOpacity
                  style={{ backgroundColor: '#2ecc71', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => setWalkingStep(walkingStep + 1)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{ backgroundColor: '#27ae60', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => {
                    saveSession('walking');
                    Alert.alert('Complete!', 'Enjoy your mindful walk!');
                    setShowWalkingGuide(false);
                    resetStates();
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Start Walking</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Shake It Out Modal */}
      <Modal visible={showShakeOut} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 30,
              width: '90%'
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>
              🎉 Shake It Out!
            </Text>

            <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#e74c3c' }}>
              {shakeSteps[shakeStep]?.name}
            </Text>

            <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#2c3e50', lineHeight: 24 }}>
              {shakeSteps[shakeStep]?.instruction}
            </Text>

            {isShaking && (
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#e74c3c' }}>
                  {shakeTimer}
                </Text>
                <Text style={{ fontSize: 16, color: '#2c3e50' }}>seconds remaining</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#95a5a6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                onPress={() => { setShowShakeOut(false); setIsShaking(false); resetStates(); }}
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
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {isShaking ? 'Stop' : 'Start Shaking!'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

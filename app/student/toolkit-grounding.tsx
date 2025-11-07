import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ToolkitGrounding() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration: string }>();
  const studentRegNo = params.registration;

  // 5-4-3-2-1 Technique State
  const [show54321, setShow54321] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses54321, setResponses54321] = useState({
    see: ['', '', '', '', ''],
    feel: ['', '', '', ''],
    hear: ['', '', ''],
    smell: ['', ''],
    taste: ['']
  });

  // Describe Your World State
  const [showDescribeWorld, setShowDescribeWorld] = useState(false);
  const [worldDescription, setWorldDescription] = useState({
    sounds: '',
    smells: '',
    textures: '',
    temperature: '',
    colors: '',
    emotions: ''
  });

  // ...existing code...

  // Progressive Muscle Relaxation State
  const [showMuscleRelax, setShowMuscleRelax] = useState(false);
  const [muscleStep, setMuscleStep] = useState(0);

  // Mindful Walking State
  const [showMindfulWalk, setShowMindfulWalk] = useState(false);
  const [walkingStep, setWalkingStep] = useState(0);

  const steps54321 = [
    { title: "5 Things You Can See", count: 5, key: 'see', placeholder: "What do you see around you?" },
    { title: "4 Things You Can Feel", count: 4, key: 'feel', placeholder: "What textures or sensations do you feel?" },
    { title: "3 Things You Can Hear", count: 3, key: 'hear', placeholder: "What sounds do you hear?" },
    { title: "2 Things You Can Smell", count: 2, key: 'smell', placeholder: "What scents are around you?" },
    { title: "1 Thing You Can Taste", count: 1, key: 'taste', placeholder: "What taste is in your mouth?" }
  ];

  const muscleGroups = [
    { name: "Feet and Toes", instruction: "Curl your toes tightly for 5 seconds, then release and feel the relaxation." },
    { name: "Calves", instruction: "Tense your calf muscles by pointing your toes upward, hold for 5 seconds, then relax." },
    { name: "Thighs", instruction: "Squeeze your thigh muscles tightly, hold for 5 seconds, then let them go completely." },
    { name: "Hands and Arms", instruction: "Make tight fists and tense your arms, hold for 5 seconds, then release." },
    { name: "Shoulders", instruction: "Lift your shoulders up to your ears, hold for 5 seconds, then drop them down." },
    { name: "Face", instruction: "Scrunch your face muscles (forehead, eyes, mouth), hold for 5 seconds, then relax." }
  ];

  const walkingSteps = [
    { title: "Start Standing", instruction: "Stand still and feel your feet on the ground. Notice your posture and breathing." },
    { title: "Lift Your Foot", instruction: "Slowly lift one foot. Notice the shift in weight and balance." },
    { title: "Move Forward", instruction: "Place your foot down mindfully. Feel the connection with the ground." },
    { title: "Continue Mindfully", instruction: "Keep walking slowly, paying attention to each step and movement." },
    { title: "Notice Surroundings", instruction: "As you walk, be aware of what you see, hear, and feel around you." }
  ];

  // ...existing code...

  const save54321Response = async () => {
    try {
      const data = {
        date: new Date().toISOString(),
        technique: '5-4-3-2-1',
        responses: responses54321,
        userReg: studentRegNo
      };
      await AsyncStorage.setItem(`grounding_54321_${Date.now()}`, JSON.stringify(data));
      Alert.alert('Completed', 'Your 5-4-3-2-1 grounding session has been completed.');
      setShow54321(false);
      resetStates();
    } catch (error) {
      Alert.alert('Error', 'Failed to save your session.');
    }
  };

  const saveWorldDescription = async () => {
    try {
      const data = {
        date: new Date().toISOString(),
        technique: 'describe-your-world',
        description: worldDescription,
        userReg: studentRegNo
      };
      await AsyncStorage.setItem(`grounding_world_${Date.now()}`, JSON.stringify(data));
      Alert.alert('completed', 'Your world description has been completed.');
      setShowDescribeWorld(false);
      setWorldDescription({
        sounds: '', smells: '', textures: '', temperature: '', colors: '', emotions: ''
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to show your description.');
    }
  };

  const resetStates = () => {
    setCurrentStep(0);
    setResponses54321({
      see: ['', '', '', '', ''],
      feel: ['', '', '', ''],
      hear: ['', '', ''],
      smell: ['', ''],
      taste: ['']
    });
    setMuscleStep(0);
    setWalkingStep(0);
  };

  const updateResponse = (key: string, index: number, value: string) => {
    setResponses54321(prev => ({
      ...prev,
      [key]: prev[key as keyof typeof prev].map((item, i) => i === index ? value : item)
    }));
  };

  // ...existing code...

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f8ff' }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#e67e22' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 15 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
  <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>Grounding Techniques</Text>
        <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 5 }}>Stay present and centered</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Activity Grid */}
        <View style={{ paddingVertical: 20 }}>
          {/* 5-4-3-2-1 Technique */}
          <TouchableOpacity
            style={{ backgroundColor: '#3498db', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5 }}
            onPress={() => setShow54321(true)}
          >
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>🔢 5-4-3-2-1 Technique</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Use your 5 senses to ground yourself in the present moment</Text>
          </TouchableOpacity>

          {/* Describe Your World */}
          <TouchableOpacity
            style={{ backgroundColor: '#2ecc71', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5 }}
            onPress={() => setShowDescribeWorld(true)}
          >
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>Describe Your World</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Mindfully observe and describe your environment</Text>
          </TouchableOpacity>

          {/* ...existing code... */}

          {/* Progressive Muscle Relaxation */}
          <TouchableOpacity
            style={{ backgroundColor: '#e74c3c', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5 }}
            onPress={() => setShowMuscleRelax(true)}
          >
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>Progressive Muscle Relaxation</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Tense and release muscle groups to reduce stress</Text>
          </TouchableOpacity>

          {/* Mindful Walking */}
          <TouchableOpacity
            style={{ backgroundColor: '#f39c12', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5 }}
            onPress={() => setShowMindfulWalk(true)}
          >
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>Mindful Walking</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Connect with your body through conscious movement</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 5-4-3-2-1 Modal */}
      <Modal visible={show54321} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '90%', maxHeight: '80%' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 25 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>
                {steps54321[currentStep]?.title}
              </Text>

              <ScrollView style={{ maxHeight: 300 }}>
                {steps54321[currentStep] && [...Array(steps54321[currentStep].count)].map((_, index) => (
                  <TextInput
                    key={index}
                    style={{ borderWidth: 1, borderColor: '#3498db', borderRadius: 10, padding: 15, marginBottom: 10, fontSize: 16 }}
                    placeholder={`${index + 1}. ${steps54321[currentStep].placeholder}`}
                    value={responses54321[steps54321[currentStep].key as keyof typeof responses54321][index]}
                    onChangeText={(text) => updateResponse(steps54321[currentStep].key, index, text)}
                    multiline
                  />
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#95a5a6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => { setShow54321(false); resetStates(); }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>

                {currentStep > 0 && (
                  <TouchableOpacity
                    style={{ backgroundColor: '#f39c12', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                    onPress={() => setCurrentStep(currentStep - 1)}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Previous</Text>
                  </TouchableOpacity>
                )}

                {currentStep < steps54321.length - 1 ? (
                  <TouchableOpacity
                    style={{ backgroundColor: '#3498db', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                    onPress={() => setCurrentStep(currentStep + 1)}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{ backgroundColor: '#2ecc71', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                    onPress={save54321Response}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Complete</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 15 }}>
                {steps54321.map((_, index) => (
                  <View
                    key={index}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: index === currentStep ? '#3498db' : '#bdc3c7',
                      marginHorizontal: 3
                    }}
                  />
                ))}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Describe Your World Modal */}
      <Modal visible={showDescribeWorld} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '90%', maxHeight: '80%' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 25 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>
                🌍 Describe Your World
              </Text>

              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#2c3e50' }}>What sounds do you hear?</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#2ecc71', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 }}
                  placeholder="Describe the sounds around you..."
                  value={worldDescription.sounds}
                  onChangeText={(text) => setWorldDescription(prev => ({ ...prev, sounds: text }))}
                  multiline
                />

                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#2c3e50' }}>What scents do you smell?</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#2ecc71', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 }}
                  placeholder="Describe any scents or smells..."
                  value={worldDescription.smells}
                  onChangeText={(text) => setWorldDescription(prev => ({ ...prev, smells: text }))}
                  multiline
                />

                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#2c3e50' }}>What textures can you feel?</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#2ecc71', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 }}
                  placeholder="Describe textures and physical sensations..."
                  value={worldDescription.textures}
                  onChangeText={(text) => setWorldDescription(prev => ({ ...prev, textures: text }))}
                  multiline
                />

                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#2c3e50' }}>How does the temperature feel?</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#2ecc71', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 }}
                  placeholder="Describe the temperature and air..."
                  value={worldDescription.temperature}
                  onChangeText={(text) => setWorldDescription(prev => ({ ...prev, temperature: text }))}
                  multiline
                />

                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#2c3e50' }}>What colors do you see?</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#2ecc71', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 }}
                  placeholder="Describe the colors and visual details..."
                  value={worldDescription.colors}
                  onChangeText={(text) => setWorldDescription(prev => ({ ...prev, colors: text }))}
                  multiline
                />

                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#2c3e50' }}>How are you feeling right now?</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#2ecc71', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 }}
                  placeholder="Describe your current emotions and state..."
                  value={worldDescription.emotions}
                  onChangeText={(text) => setWorldDescription(prev => ({ ...prev, emotions: text }))}
                  multiline
                />
              </ScrollView>

              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#95a5a6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => setShowDescribeWorld(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: '#2ecc71', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={saveWorldDescription}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ...existing code... */}

      {/* Progressive Muscle Relaxation Modal */}
      <Modal visible={showMuscleRelax} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '90%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>
              💪 Progressive Muscle Relaxation
            </Text>

            <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#e74c3c' }}>
              {muscleGroups[muscleStep]?.name}
            </Text>

            <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#2c3e50', lineHeight: 24 }}>
              {muscleGroups[muscleStep]?.instruction}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#95a5a6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                onPress={() => { setShowMuscleRelax(false); resetStates(); }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>

              {muscleStep > 0 && (
                <TouchableOpacity
                  style={{ backgroundColor: '#f39c12', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => setMuscleStep(muscleStep - 1)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Previous</Text>
                </TouchableOpacity>
              )}

              {muscleStep < muscleGroups.length - 1 ? (
                <TouchableOpacity
                  style={{ backgroundColor: '#e74c3c', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => setMuscleStep(muscleStep + 1)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{ backgroundColor: '#2ecc71', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => {
                    Alert.alert('Complete!', 'You have completed the progressive muscle relaxation session.');
                    setShowMuscleRelax(false);
                    resetStates();
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Complete</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 15 }}>
              {muscleGroups.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: index === muscleStep ? '#e74c3c' : '#bdc3c7',
                    marginHorizontal: 3
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Mindful Walking Modal */}
      <Modal visible={showMindfulWalk} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '90%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>
              Mindful Walking
            </Text>

            <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#f39c12' }}>
              {walkingSteps[walkingStep]?.title}
            </Text>

            <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#2c3e50', lineHeight: 24 }}>
              {walkingSteps[walkingStep]?.instruction}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#95a5a6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                onPress={() => { setShowMindfulWalk(false); resetStates(); }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>

              {walkingStep > 0 && (
                <TouchableOpacity
                  style={{ backgroundColor: '#3498db', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => setWalkingStep(walkingStep - 1)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Previous</Text>
                </TouchableOpacity>
              )}

              {walkingStep < walkingSteps.length - 1 ? (
                <TouchableOpacity
                  style={{ backgroundColor: '#f39c12', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => setWalkingStep(walkingStep + 1)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{ backgroundColor: '#2ecc71', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }}
                  onPress={() => {
                    Alert.alert('Complete!', 'You have completed the mindful walking session.');
                    setShowMindfulWalk(false);
                    resetStates();
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Complete</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 15 }}>
              {walkingSteps.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: index === walkingStep ? '#f39c12' : '#bdc3c7',
                    marginHorizontal: 3
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

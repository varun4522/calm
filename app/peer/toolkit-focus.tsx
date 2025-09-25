import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ToolkitFocus() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration: string }>();
  const studentRegNo = params.registration;

  // A-Z Word Builder State
  const [showWordBuilder, setShowWordBuilder] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [wordAnswers, setWordAnswers] = useState<{ [key: string]: string }>({});
  const [currentLetter, setCurrentLetter] = useState('A');

  // Name All Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [selectedScanType, setSelectedScanType] = useState(0);
  const [scannerAnswers, setScannerAnswers] = useState<string[]>([]);
  const [scannerInput, setScannerInput] = useState('');
  const [scannerTimer, setScannerTimer] = useState(60);
  const [scannerActive, setScannerActive] = useState(false);

  // Cognitive Reframe State
  const [showReframe, setShowReframe] = useState(false);
  const [reframeAnswers, setReframeAnswers] = useState<string[]>([]);
  const [reframeInput, setReframeInput] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState(0);

  // Animation
  const timerAnim = useRef(new Animated.Value(1)).current;

  // Categories for A-Z Word Builder
  const categories = [
    { name: "Fruits & Vegetables", icon: "🍎", examples: "Apple, Banana, Carrot..." },
    { name: "Animals", icon: "🐱", examples: "Ant, Bear, Cat..." },
    { name: "Emotions", icon: "😊", examples: "Angry, Brave, Calm..." },
    { name: "Countries", icon: "🌍", examples: "Australia, Brazil, Canada..." },
    { name: "Colors & Objects", icon: "🔴", examples: "Azure, Blue, Crimson..." },
    { name: "Positive Words", icon: "✨", examples: "Amazing, Beautiful, Creative..." },
    { name: "School Subjects", icon: "📚", examples: "Art, Biology, Chemistry..." },
    { name: "Sports & Activities", icon: "⚽", examples: "Archery, Basketball, Cricket..." }
  ];

  // Scanner challenges
  const scannerTypes = [
    { challenge: "Name all the RED things you see", color: "#e74c3c", icon: "🔴" },
    { challenge: "Name all the BLUE things you see", color: "#3498db", icon: "🔵" },
    { challenge: "Name all the GREEN things you see", color: "#2ecc71", icon: "🟢" },
    { challenge: "Name all the ROUND things you see", color: "#f39c12", icon: "⭕" },
    { challenge: "Name all the SQUARE things you see", color: "#9b59b6", icon: "⬜" },
    { challenge: "Name all the SOFT things you see", color: "#e67e22", icon: "🧸" },
    { challenge: "Name all the SHINY things you see", color: "#f1c40f", icon: "✨" },
    { challenge: "Name all the WOODEN things you see", color: "#8b4513", icon: "🪵" }
  ];

  // Cognitive reframe prompts
  const reframePrompts = [
    "What's one thing I can control right now?",
    "What's going well in my life today?",
    "What's one small step I can take to feel better?",
    "What would I tell a friend in this situation?",
    "What am I grateful for in this moment?",
    "What's one positive thing about this challenge?",
    "How might this situation help me grow?",
    "What strengths do I have to handle this?"
  ];

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Scanner timer effect
  useEffect(() => {
    let timer: any;
    if (scannerActive && scannerTimer > 0) {
      timer = setTimeout(() => {
        setScannerTimer(prev => prev - 1);
      }, 1000);
    } else if (scannerActive && scannerTimer === 0) {
      setScannerActive(false);
      Alert.alert('Time\'s Up!', `Great job! You found ${scannerAnswers.length} items.`);
    }
    return () => clearTimeout(timer);
  }, [scannerActive, scannerTimer]);

  // Animations
  useEffect(() => {
    const timerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(timerAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(timerAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    if (scannerActive && scannerTimer <= 10) {
      timerAnimation.start();
    } else {
      timerAnimation.stop();
    }

    return () => {
      timerAnimation.stop();
    };
  }, [scannerActive, scannerTimer]);

  const resetStates = () => {
    setWordAnswers({});
    setCurrentLetter('A');
    setScannerAnswers([]);
    setScannerInput('');
    setScannerTimer(60);
    setScannerActive(false);
    setReframeAnswers([]);
    setReframeInput('');
    setCurrentPrompt(0);
  };

  const saveSession = async (type: string, data: any) => {
    try {
      const sessionData = {
        date: new Date().toISOString(),
        type: type,
        data: data,
        userReg: studentRegNo
      };
      await AsyncStorage.setItem(`focus_${type}_${Date.now()}`, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const addScannerAnswer = () => {
    if (scannerInput.trim()) {
      setScannerAnswers(prev => [...prev, scannerInput.trim()]);
      setScannerInput('');
    }
  };

  const addReframeAnswer = () => {
    if (reframeInput.trim()) {
      setReframeAnswers(prev => [...prev, reframeInput.trim()]);
      setReframeInput('');
    }
  };

  const updateWordAnswer = (letter: string, word: string) => {
    setWordAnswers(prev => ({ ...prev, [letter]: word }));
  };

  const getCompletionPercentage = () => {
    const completed = Object.keys(wordAnswers).filter(key => wordAnswers[key].trim()).length;
    return Math.round((completed / 26) * 100);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#6c5ce7' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 15 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>🧠 Focus Toolkit</Text>
        <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 5 }}>Strengthen your attention and clarity</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ paddingVertical: 20 }}>
          {/* A-Z Word Builder */}
          <TouchableOpacity
            style={{ backgroundColor: '#00b894', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5 }}
            onPress={() => setShowWordBuilder(true)}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>🔤 A-Z Word Builder</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Fill the alphabet with category words</Text>
          </TouchableOpacity>

          {/* Name All Scanner */}
          <TouchableOpacity
            style={{ backgroundColor: '#e17055', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5 }}
            onPress={() => setShowScanner(true)}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>👀 "Name All..." Scanner</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Visual challenges with 1-minute timer</Text>
          </TouchableOpacity>

          {/* Cognitive Reframe */}
          <TouchableOpacity
            style={{ backgroundColor: '#0984e3', borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5 }}
            onPress={() => setShowReframe(true)}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>💭 Cognitive Reframe</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Shift perspective with guided prompts</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* A-Z Word Builder Modal */}
      <Modal visible={showWordBuilder} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <View style={{ flex: 1, backgroundColor: '#fff', marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ backgroundColor: '#00b894', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <TouchableOpacity onPress={() => { setShowWordBuilder(false); resetStates(); }} style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✕ Close</Text>
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>🔤 A-Z Word Builder</Text>
              <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 5 }}>
                Progress: {getCompletionPercentage()}% ({Object.keys(wordAnswers).filter(key => wordAnswers[key].trim()).length}/26)
              </Text>
            </View>

            {/* Category Selection */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 100, marginVertical: 10 }}>
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    backgroundColor: selectedCategory === index ? '#00b894' : '#ddd',
                    borderRadius: 15,
                    padding: 15,
                    marginHorizontal: 5,
                    minWidth: 120,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setSelectedCategory(index);
                    setWordAnswers({});
                  }}
                >
                  <Text style={{ fontSize: 24, marginBottom: 5 }}>{category.icon}</Text>
                  <Text style={{
                    color: selectedCategory === index ? '#fff' : '#333',
                    fontSize: 12,
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{ textAlign: 'center', color: '#666', padding: 10, fontSize: 14 }}>
              Category: {categories[selectedCategory].name} (e.g., {categories[selectedCategory].examples})
            </Text>

            {/* Alphabet Grid */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 15 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {alphabet.map((letter) => (
                  <View key={letter} style={{ width: '48%', marginBottom: 10 }}>
                    <View style={{
                      backgroundColor: wordAnswers[letter] ? '#00b894' : '#f8f9fa',
                      borderRadius: 10,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: '#ddd'
                    }}>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: wordAnswers[letter] ? '#fff' : '#00b894',
                        marginBottom: 5
                      }}>
                        {letter}
                      </Text>
                      <TextInput
                        value={wordAnswers[letter] || ''}
                        onChangeText={(text) => updateWordAnswer(letter, text)}
                        placeholder={`${letter} word...`}
                        placeholderTextColor={wordAnswers[letter] ? '#ccc' : '#999'}
                        style={{
                          color: wordAnswers[letter] ? '#fff' : '#333',
                          fontSize: 16,
                          fontWeight: 'bold'
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: '#00b894',
                  borderRadius: 15,
                  padding: 15,
                  margin: 20,
                  alignItems: 'center'
                }}
                onPress={() => {
                  saveSession('word-builder', { category: categories[selectedCategory].name, answers: wordAnswers });
                  Alert.alert('Saved!', `Great job! You completed ${getCompletionPercentage()}% of the alphabet.`);
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>💾 Save Progress</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Name All Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '90%', maxHeight: '80%' }}>
            <TouchableOpacity onPress={() => { setShowScanner(false); resetStates(); }} style={{ alignSelf: 'flex-end', marginBottom: 10 }}>
              <Text style={{ color: '#e17055', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>
              👀 "Name All..." Scanner
            </Text>

            {/* Challenge Selection */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 80, marginBottom: 15 }}>
              {scannerTypes.map((type, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    backgroundColor: selectedScanType === index ? type.color : '#f1f2f6',
                    borderRadius: 12,
                    padding: 12,
                    marginHorizontal: 5,
                    minWidth: 100,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setSelectedScanType(index);
                    setScannerAnswers([]);
                    setScannerTimer(60);
                    setScannerActive(false);
                  }}
                >
                  <Text style={{ fontSize: 20, marginBottom: 3 }}>{type.icon}</Text>
                  <Text style={{
                    color: selectedScanType === index ? '#fff' : '#333',
                    fontSize: 12,
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {type.challenge.split(' ')[3]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 15,
              color: scannerTypes[selectedScanType].color
            }}>
              {scannerTypes[selectedScanType].challenge}
            </Text>

            {/* Timer */}
            <Animated.View style={{
              alignItems: 'center',
              marginBottom: 15,
              transform: [{ scale: scannerActive && scannerTimer <= 10 ? timerAnim : 1 }]
            }}>
              <Text style={{
                fontSize: 36,
                fontWeight: 'bold',
                color: scannerTimer <= 10 ? '#e74c3c' : '#2c3e50'
              }}>
                {scannerTimer}
              </Text>
              <Text style={{ fontSize: 14, color: '#666' }}>seconds remaining</Text>
            </Animated.View>

            {/* Input */}
            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
              <TextInput
                value={scannerInput}
                onChangeText={setScannerInput}
                placeholder="Type what you see..."
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: scannerTypes[selectedScanType].color,
                  borderRadius: 10,
                  padding: 12,
                  marginRight: 10,
                  fontSize: 16
                }}
                onSubmitEditing={addScannerAnswer}
              />
              <TouchableOpacity
                onPress={addScannerAnswer}
                style={{
                  backgroundColor: scannerTypes[selectedScanType].color,
                  borderRadius: 10,
                  paddingHorizontal: 15,
                  justifyContent: 'center'
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Start/Stop Button */}
            <TouchableOpacity
              onPress={() => {
                if (scannerActive) {
                  setScannerActive(false);
                } else {
                  setScannerActive(true);
                  setScannerTimer(60);
                }
              }}
              style={{
                backgroundColor: scannerActive ? '#e74c3c' : '#2ecc71',
                borderRadius: 12,
                padding: 15,
                alignItems: 'center',
                marginBottom: 15
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                {scannerActive ? '⏸️ Stop' : '▶️ Start Challenge'}
              </Text>
            </TouchableOpacity>

            {/* Results */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#2c3e50' }}>
                Found Items ({scannerAnswers.length}):
              </Text>
              <ScrollView style={{ flex: 1, maxHeight: 150 }}>
                {scannerAnswers.map((answer, index) => (
                  <View key={index} style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: 8,
                    padding: 8,
                    marginBottom: 5,
                    flexDirection: 'row',
                    justifyContent: 'space-between'
                  }}>
                    <Text style={{ fontSize: 14, color: '#2c3e50' }}>{answer}</Text>
                    <TouchableOpacity onPress={() => setScannerAnswers(prev => prev.filter((_, i) => i !== index))}>
                      <Text style={{ color: '#e74c3c', fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={() => {
                saveSession('scanner', { challenge: scannerTypes[selectedScanType].challenge, answers: scannerAnswers });
                Alert.alert('Saved!', `Great observation skills! You found ${scannerAnswers.length} items.`);
              }}
              style={{
                backgroundColor: scannerTypes[selectedScanType].color,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
                marginTop: 10
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>💾 Save Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cognitive Reframe Modal */}
      <Modal visible={showReframe} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '90%', maxHeight: '80%' }}>
            <TouchableOpacity onPress={() => { setShowReframe(false); resetStates(); }} style={{ alignSelf: 'flex-end', marginBottom: 10 }}>
              <Text style={{ color: '#0984e3', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' }}>
              💭 Cognitive Reframe
            </Text>

            <View style={{
              backgroundColor: '#0984e3',
              borderRadius: 15,
              padding: 20,
              marginBottom: 20
            }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
                {reframePrompts[currentPrompt]}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
              <TextInput
                value={reframeInput}
                onChangeText={setReframeInput}
                placeholder="Type your thoughts..."
                multiline
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#0984e3',
                  borderRadius: 10,
                  padding: 15,
                  marginRight: 10,
                  fontSize: 16,
                  minHeight: 60,
                  textAlignVertical: 'top'
                }}
                onSubmitEditing={addReframeAnswer}
              />
              <TouchableOpacity
                onPress={addReframeAnswer}
                style={{
                  backgroundColor: '#0984e3',
                  borderRadius: 10,
                  paddingHorizontal: 15,
                  justifyContent: 'center'
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <TouchableOpacity
                onPress={() => setCurrentPrompt(Math.floor(Math.random() * reframePrompts.length))}
                style={{
                  backgroundColor: '#f39c12',
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 15
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>🎲 Random</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCurrentPrompt((currentPrompt + 1) % reframePrompts.length)}
                style={{
                  backgroundColor: '#2ecc71',
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 15
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Next Prompt</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#2c3e50' }}>
                Your Thoughts ({reframeAnswers.length}):
              </Text>
              <ScrollView style={{ flex: 1, maxHeight: 200 }}>
                {reframeAnswers.map((answer, index) => (
                  <View key={index} style={{
                    backgroundColor: '#f0f8ff',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: '#0984e3'
                  }}>
                    <Text style={{ fontSize: 14, color: '#2c3e50', lineHeight: 20 }}>{answer}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={() => {
                saveSession('reframe', { prompt: reframePrompts[currentPrompt], answers: reframeAnswers });
                Alert.alert('Saved!', 'Your reframing thoughts have been saved. Great work on shifting perspective!');
              }}
              style={{
                backgroundColor: '#0984e3',
                borderRadius: 12,
                padding: 15,
                alignItems: 'center',
                marginTop: 10
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>💾 Save Thoughts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

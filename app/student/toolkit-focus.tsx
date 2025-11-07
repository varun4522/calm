import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

  // Animation
  const timerAnim = useRef(new Animated.Value(1)).current;

  // Categories for A-Z Word Builder
  const categories = [
    { name: "Fruits & Vegetables", icon: "🍎", examples: "Apple, Banana, Carrot..." },
    { name: "Animals", icon: "🐱", examples: "Ant, Bear, Cat..." },
    { name: "Countries", icon: "🌍", examples: "Australia, Brazil, Canada..." },
    { name: "Colors & Objects", icon: "🔴", examples: "Azure, Blue, Crimson..." },
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

  // Concrete cognitive reframing examples (Q = negative thought, A = constructive reframe)
  const reframingExamples: { q: string; a: string }[] = [
    { q: "If I mess up one line, I’ll look like an idiot.", a: "It’s okay to stumble; the audience cares about the message, not flawless delivery." },
    { q: "This revision means I'm incompetent.", a: "This is specific feedback, offering me a clear opportunity to learn and improve a skill." },
    { q: "The project is too huge to start.", a: "I just need to break this down and focus on the very first, manageable step." },
    { q: "I missed that chance and will never get another one.", a: "I can use this time to prepare my skills so I'm ready for the next great opportunity." },
    { q: "They didn't invite me; they must not like me.", a: "They were probably busy; I can initiate a connection with them next time." },
    { q: "I'm still not good at this, I'm just bad at learning.", a: "Mastery takes time; I'm comparing my beginning to someone else's middle." },
    { q: "I forgot one email; everything will fall apart.", a: "It's a correctable mistake; I will send it now and set a system to prevent it next time." },
    { q: "I'm stuck and can't save anything right now.", a: "I can find one small cut to make in my budget; small steps lead to big change." },
    { q: "A rough morning means this whole day is ruined.", a: "Stressful things happened, but I have control over how I handle the rest of the day." },
    { q: "I must say yes to avoid disappointing people.", a: "Saying 'no' protects my well-being and lets me do a better job on my existing commitments." },
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
  <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>Focus Toolkit</Text>
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
                  Alert.alert('completed', `Great job! You completed ${getCompletionPercentage()}% of the alphabet.`);
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
                Alert.alert('completed!', `Great observation skills! You found ${scannerAnswers.length} items.`);
              }}
              style={{
                backgroundColor: scannerTypes[selectedScanType].color,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
                marginTop: 10
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Show Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cognitive Reframe Modal */}
      <Modal visible={showReframe} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <View style={{ flex: 1, backgroundColor: '#fff', marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ backgroundColor: '#0984e3', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <TouchableOpacity onPress={() => { setShowReframe(false); resetStates(); }} style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✕ Close</Text>
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>💭 Cognitive Reframing</Text>
            </View>

            {/* Q&A Examples */}
            <ScrollView style={{ flex: 1, padding: 20 }}>
              <Text style={styles.examplesTitle}>Reframe</Text>
              
              {reframingExamples.map((ex, i) => (
                <View key={i} style={styles.exampleCard}>
                  <View style={styles.questionContainer}>
                    <Text style={styles.questionLabel}> Instead of:</Text>
                    <Text style={styles.questionText}>"{ex.q}"</Text>
                  </View>
                  <View style={styles.answerContainer}>
                    <Text style={styles.answerLabel}> Reframe to:</Text>
                    <Text style={styles.answerText}>"{ex.a}"</Text>
                  </View>
                </View>
              ))}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Cognitive Reframe Examples Styles
  examplesContainer: {
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
  },
  examplesTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#2c3e50',
    textAlign: 'center',
  },
  examplesScrollView: {
    maxHeight: 280,
  },
  exampleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#0984e3',
  },
  questionContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f1f3f5',
  },
  questionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e74c3c',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c0392b',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  answerContainer: {
    paddingTop: 4,
  },
  answerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#27ae60',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  answerText: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});

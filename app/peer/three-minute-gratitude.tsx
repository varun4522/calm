import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface GratitudeEntry {
  id: string;
  date: string;
  items: string[];
  timestamp: string;
}

export default function ThreeMinuteGratitude() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration?: string }>();
  const [studentRegNo, setStudentRegNo] = useState<string>('');
  const [gratitudeInputs, setGratitudeInputs] = useState(['', '', '']);
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>([]);
  const [gratitudeSaved, setGratitudeSaved] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining]);

  const loadUserData = async () => {
    try {
      let regNo = params.registration;
      if (!regNo) {
        const storedReg = await AsyncStorage.getItem('currentStudentReg');
        if (storedReg) regNo = storedReg;
      }
      
      if (regNo) {
        setStudentRegNo(regNo);
        
        // Load gratitude entries for this user
        const stored = await AsyncStorage.getItem(`gratitude_entries_${regNo}`);
        if (stored) {
          setGratitudeEntries(JSON.parse(stored));
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const saveGratitudeEntry = async () => {
    if (!studentRegNo) return;
    
    const today = new Date().toISOString().slice(0, 10);
    const newEntry: GratitudeEntry = {
      id: Date.now().toString(),
      date: today,
      items: gratitudeInputs.filter(item => item.trim() !== ''),
      timestamp: new Date().toISOString()
    };
    
    const updated = [newEntry, ...gratitudeEntries.filter(e => e.date !== today)];
    setGratitudeEntries(updated);
    
    try {
      await AsyncStorage.setItem(`gratitude_entries_${studentRegNo}`, JSON.stringify(updated));
      setGratitudeSaved(true);
      setIsTimerRunning(false);
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error saving gratitude entry:', error);
    }
  };

  const startTimer = () => {
    setIsTimerRunning(true);
    setTimeRemaining(180);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const canSave = gratitudeInputs.some(item => item.trim() !== '') && !gratitudeSaved;

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🙏 3-Minute Gratitude</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Timer */}
        <View style={styles.timerCard}>
          <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
          <Text style={styles.timerLabel}>Take 3 minutes to reflect</Text>
          {!isTimerRunning && timeRemaining === 180 && (
            <TouchableOpacity onPress={startTimer} style={styles.startTimerButton}>
              <Text style={styles.startTimerText}>Start Timer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Gratitude Input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputTitle}>What are you grateful for today?</Text>
          <Text style={styles.inputSubtitle}>Write down 3 things that bring you joy or peace</Text>
          
          {gratitudeInputs.map((value, index) => (
            <View key={index} style={styles.inputContainer}>
              <Text style={styles.inputNumber}>{index + 1}.</Text>
              <TextInput
                value={value}
                onChangeText={(text) => {
                  const newInputs = [...gratitudeInputs];
                  newInputs[index] = text;
                  setGratitudeInputs(newInputs);
                }}
                placeholder={`Something you're grateful for...`}
                placeholderTextColor="#BDC3C7"
                style={styles.textInput}
                multiline
                maxLength={200}
              />
            </View>
          ))}
          
          <TouchableOpacity
            onPress={saveGratitudeEntry}
            style={[styles.saveButton, !canSave && styles.disabledButton]}
            disabled={!canSave}
          >
            <Text style={[styles.saveButtonText, !canSave && styles.disabledButtonText]}>
              {gratitudeSaved ? '✅ Saved!' : 'Save Entry'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Previous Entries */}
        {gratitudeEntries.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>📖 Your Gratitude Journey</Text>
            {gratitudeEntries.slice(0, 5).map((entry, index) => (
              <View key={entry.id} style={styles.historyEntry}>
                <Text style={styles.historyDate}>
                  {new Date(entry.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
                {entry.items.map((item, i) => (
                  <Text key={i} style={styles.historyItem}>• {item}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Gratitude Tips</Text>
          <Text style={styles.tipText}>• Be specific about what you're grateful for</Text>
          <Text style={styles.tipText}>• Focus on people, experiences, or small moments</Text>
          <Text style={styles.tipText}>• Try to feel the emotion, not just list items</Text>
          <Text style={styles.tipText}>• Practice daily for maximum benefit</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#6dd5ed',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 15,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 80,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  timerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6dd5ed',
    marginBottom: 10,
  },
  timerLabel: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 15,
  },
  startTimerButton: {
    backgroundColor: '#6dd5ed',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
  },
  startTimerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  inputTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  inputSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 25,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  inputNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6dd5ed',
    marginRight: 10,
    marginTop: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#2C3E50',
    backgroundColor: '#F8F9FA',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#6dd5ed',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#BDC3C7',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#7F8C8D',
  },
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 20,
  },
  historyEntry: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#6dd5ed',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6dd5ed',
    marginBottom: 8,
  },
  historyItem: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 4,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 15,
  },
  tipText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
    lineHeight: 20,
  },
});

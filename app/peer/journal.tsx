import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

type GratitudeEntry = { date: string; items: string[] };

export default function Journal() {
  const router = useRouter();
  const [journalText, setJournalText] = useState('');
  const [gratitudeModal, setGratitudeModal] = useState(false);
  const [gratitudeInputs, setGratitudeInputs] = useState(['', '', '']);
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>([]);
  const [gratitudeSaved, setGratitudeSaved] = useState(false);
  const viewRef = useRef<View>(null);

  // Background customization state
  const [backgroundModal, setBackgroundModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Load journal text and gratitude entries from AsyncStorage
  useEffect(() => {
    (async () => {
      const storedJournal = await AsyncStorage.getItem('journal_text');
      if (storedJournal) setJournalText(storedJournal);

      const stored = await AsyncStorage.getItem('gratitude_entries');
      if (stored) setGratitudeEntries(JSON.parse(stored));

      // Load background settings
      const storedDarkMode = await AsyncStorage.getItem('journal_dark_mode');
      if (storedDarkMode) setIsDarkMode(JSON.parse(storedDarkMode));

      const storedBackground = await AsyncStorage.getItem('journal_background');
      if (storedBackground) setBackgroundImage(storedBackground);
    })();
  }, []);

  // Save journal text to AsyncStorage
  const saveJournalText = async (text: string) => {
    setJournalText(text);
    await AsyncStorage.setItem('journal_text', text);
  };

  // Save gratitude entries to AsyncStorage
  const saveGratitudeEntry = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const newEntry: GratitudeEntry = { date: today, items: gratitudeInputs };
    const updated = [newEntry, ...gratitudeEntries.filter(e => e.date !== today)];
    setGratitudeEntries(updated);
    await AsyncStorage.setItem('gratitude_entries', JSON.stringify(updated));
    setGratitudeSaved(true);
    setTimeout(() => setGratitudeModal(false), 1200);
  };

  // Export journal as text file
  const exportJournal = async () => {
    try {
      const currentDate = new Date().toISOString().slice(0, 10);
      const gratitudeText = gratitudeEntries.length > 0
        ? '\n\n--- Gratitude Entries ---\n' +
          gratitudeEntries.map(entry =>
            `${entry.date}:\n${entry.items.map(item => `• ${item}`).join('\n')}`
          ).join('\n\n')
        : '';

      const content = `My Journal - ${currentDate}\n\n${journalText}${gratitudeText}`;

      Alert.alert('Journal Export', `${content.substring(0, 200)}...`, [
        { text: 'Copy to Clipboard', onPress: () => {
          Alert.alert('Success', 'Journal content ready for sharing');
        }},
        { text: 'OK' }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to export journal');
    }
  };

  // Background customization functions
  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await AsyncStorage.setItem('journal_dark_mode', JSON.stringify(newDarkMode));
  };

  const selectBackgroundImage = () => {
    Alert.alert(
      'Background Options',
      'Choose a background option:',
      [
        { text: 'Nature 🌿', onPress: () => setCustomBackground('nature') },
        { text: 'Ocean 🌊', onPress: () => setCustomBackground('ocean') },
        { text: 'Sunset 🌅', onPress: () => setCustomBackground('sunset') },
        { text: 'Space 🌌', onPress: () => setCustomBackground('space') },
        { text: 'Default', onPress: () => setCustomBackground(null) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const setCustomBackground = async (backgroundType: string | null) => {
    setBackgroundImage(backgroundType);
    await AsyncStorage.setItem('journal_background', backgroundType || '');
  };

  // Get dynamic background colors based on settings
  const getBackgroundColors = () => {
    if (isDarkMode) {
      return {
        primary: '#2c3e50',
        secondary: '#34495e',
        text: '#ecf0f1',
        border: '#7f8c8d',
        input: '#34495e',
      };
    } else {
      return {
        primary: '#ffffff',
        secondary: '#f8f9fa',
        text: '#2c3e50',
        border: '#e9ecef',
        input: '#ffffff',
      };
    }
  };

  const colors = getBackgroundColors();

  // Get background style based on selected image
  const getBackgroundStyle = () => {
    const baseStyle = {
      backgroundColor: colors.primary,
    };

    if (backgroundImage) {
      switch (backgroundImage) {
        case 'nature':
          return { ...baseStyle, backgroundColor: isDarkMode ? '#1b5e20' : '#e8f5e8' };
        case 'ocean':
          return { ...baseStyle, backgroundColor: isDarkMode ? '#0d47a1' : '#e3f2fd' };
        case 'sunset':
          return { ...baseStyle, backgroundColor: isDarkMode ? '#e65100' : '#fff3e0' };
        case 'space':
          return { ...baseStyle, backgroundColor: '#1a1a2e' };
        default:
          return baseStyle;
      }
    }

    return baseStyle;
  };

  return (
    <View ref={viewRef} style={{ flex: 1, backgroundColor: '#f8f4e6' }}>
      {/* Dynamic background */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        ...getBackgroundStyle(),
      }} />

      {/* Header with back button, upload button, and export */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 45,
        paddingHorizontal: 15,
        paddingBottom: 10,
        backgroundColor: colors.secondary,
        borderBottomWidth: 2,
        borderBottomColor: colors.border,
      }}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.replace('./student-home')}
          style={{
            backgroundColor: colors.input,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={{
          color: colors.text,
          fontSize: 20,
          fontWeight: '700',
          flex: 1,
          textAlign: 'center',
        }}>
          My Journal
        </Text>

        {/* Background/Upload Button */}
        <TouchableOpacity
          onPress={() => setBackgroundModal(true)}
          style={{
            backgroundColor: '#e8f5e8',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#c8e6c9',
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 18 }}>📁</Text>
        </TouchableOpacity>

        {/* Export Button */}
        <TouchableOpacity
          onPress={exportJournal}
          style={{
            backgroundColor: '#e8f5e8',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#c8e6c9',
          }}
        >
          <Text style={{ fontSize: 18 }}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Main Notebook Text Area */}
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <TextInput
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 28,
            color: colors.text,
            textAlignVertical: 'top',
            marginLeft: 20,
            marginTop: 10,
            minHeight: 500,
            fontFamily: 'monospace',
          }}
          multiline
          placeholder="Start writing your thoughts here...

Today I feel...

What happened today...

My thoughts and reflections...

Goals for tomorrow..."
          placeholderTextColor={isDarkMode ? '#7f8c8d' : '#95a5a6'}
          value={journalText}
          onChangeText={saveJournalText}
          textBreakStrategy="balanced"
        />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: colors.secondary,
        borderTopWidth: 2,
        borderTopColor: colors.border,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }}>
        {/* Digital Doodle Button */}
        <TouchableOpacity
          onPress={() => router.push('./doodle')}
          style={{
            backgroundColor: '#fce4ec',
            padding: 15,
            borderRadius: 25,
            borderWidth: 2,
            borderColor: '#f8bbd9',
            elevation: 3,
            shadowColor: '#f8bbd9',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
        >
          <Text style={{ fontSize: 24 }}>✏️</Text>
        </TouchableOpacity>

        {/* 3 Minute Gratitude Button */}
        <TouchableOpacity
          onPress={() => {
            setGratitudeModal(true);
            setGratitudeSaved(false);
            setGratitudeInputs(['', '', '']);
          }}
          style={{
            backgroundColor: '#fff3e0',
            padding: 15,
            borderRadius: 25,
            borderWidth: 2,
            borderColor: '#ffe0b2',
            elevation: 3,
            shadowColor: '#ffcc80',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
        >
          <Text style={{ fontSize: 24 }}>🤔</Text>
        </TouchableOpacity>
      </View>

      {/* Background Customization Modal */}
      <Modal visible={backgroundModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{
            backgroundColor: colors.primary,
            borderRadius: 25,
            padding: 30,
            width: '90%',
            maxWidth: 400,
            borderWidth: 2,
            borderColor: colors.border,
          }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center' }}>
              Customize Background
            </Text>

            {/* Dark/Light Mode Toggle */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
                Theme Mode
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <TouchableOpacity
                  onPress={toggleDarkMode}
                  style={{
                    backgroundColor: !isDarkMode ? '#fff3e0' : colors.secondary,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 15,
                    borderWidth: 2,
                    borderColor: !isDarkMode ? '#ffe0b2' : colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>☀️ Light</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={toggleDarkMode}
                  style={{
                    backgroundColor: isDarkMode ? '#34495e' : colors.secondary,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 15,
                    borderWidth: 2,
                    borderColor: isDarkMode ? '#7f8c8d' : colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>🌙 Dark</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Background Options */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
                Background Theme
              </Text>
              <TouchableOpacity
                onPress={selectBackgroundImage}
                style={{
                  backgroundColor: colors.secondary,
                  paddingVertical: 15,
                  paddingHorizontal: 20,
                  borderRadius: 15,
                  borderWidth: 2,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  📁 Choose Background ({backgroundImage || 'Default'})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setBackgroundModal(false)}
              style={{
                backgroundColor: '#e8f5e8',
                paddingVertical: 15,
                paddingHorizontal: 30,
                borderRadius: 15,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#c8e6c9',
              }}
            >
              <Text style={{ color: '#2e7d32', fontWeight: '600', fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Gratitude Modal */}
      <Modal visible={gratitudeModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(106, 76, 147, 0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{
            backgroundColor: colors.primary,
            borderRadius: 25,
            padding: 32,
            width: '95%',
            maxWidth: 450,
            alignItems: 'center',
            maxHeight: '90%',
            marginHorizontal: 10,
            borderWidth: 1,
            borderColor: colors.border,
            elevation: 8,
          }}>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 15 }}>
              3 Things You're Grateful For
            </Text>
            <Text style={{ color: colors.text, fontSize: 17, marginBottom: 25, textAlign: 'center', lineHeight: 24, opacity: 0.8 }}>
              Write 3 things you're grateful for today. Your daily entries are saved to track your gratitude journey.
            </Text>

            {/* Gratitude inputs */}
            {gratitudeInputs.map((val, idx) => (
              <TextInput
                key={idx}
                value={val}
                onChangeText={t => setGratitudeInputs(inputs => inputs.map((v, i) => i === idx ? t : v))}
                placeholder={`I'm grateful for #${idx + 1}...`}
                placeholderTextColor={isDarkMode ? '#95a5a6' : '#c8a2c8'}
                multiline
                numberOfLines={3}
                style={{
                  width: '100%',
                  borderColor: colors.border,
                  borderWidth: 2,
                  borderRadius: 18,
                  padding: 18,
                  marginBottom: 16,
                  color: colors.text,
                  fontSize: 16,
                  backgroundColor: colors.input,
                  minHeight: 85,
                  textAlignVertical: 'top',
                }}
              />
            ))}

            <TouchableOpacity
              onPress={saveGratitudeEntry}
              style={{
                backgroundColor: '#e8f5e8',
                borderRadius: 20,
                paddingVertical: 16,
                paddingHorizontal: 42,
                marginTop: 18,
                elevation: 4,
                borderWidth: 2,
                borderColor: '#c8e6c9',
              }}
              disabled={gratitudeInputs.some(i => !i.trim()) || gratitudeSaved}
            >
              <Text style={{ color: '#2e7d32', fontWeight: '600', fontSize: 18 }}>
                {gratitudeSaved ? '✅ Saved!' : '💾 Save Entry'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGratitudeModal(false)}
              style={{ marginTop: 22 }}
            >
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500', opacity: 0.7 }}>Close</Text>
            </TouchableOpacity>

            {/* Previous entries */}
            {gratitudeEntries.length > 0 && (
              <ScrollView style={{
                marginTop: 28,
                maxHeight: 220,
                width: '100%',
                backgroundColor: colors.secondary,
                borderRadius: 18,
                padding: 18,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginBottom: 12, textAlign: 'center' }}>
                  Previous Entries
                </Text>
                {gratitudeEntries.slice(0, 7).map((entry, idx) => (
                  <View key={idx} style={{
                    marginBottom: 14,
                    backgroundColor: isDarkMode ? '#2c3e50' : '#fff8e1',
                    borderRadius: 15,
                    padding: 15,
                    borderLeftWidth: 5,
                    borderLeftColor: '#ffcc02',
                    elevation: 2,
                  }}>
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 6 }}>
                      📅 {entry.date}
                    </Text>
                    {entry.items.map((item, i) => (
                      <Text key={i} style={{ color: colors.text, fontSize: 14, marginBottom: 3, lineHeight: 20, opacity: 0.9 }}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

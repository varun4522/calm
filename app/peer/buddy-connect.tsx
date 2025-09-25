import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function BuddyConnect() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [studentInfo, setStudentInfo] = useState({ reg: '', name: '' });
  const flatListRef = useRef<FlatList>(null);

  // Load student information from AsyncStorage
  useEffect(() => {
    const loadStudentInfo = async () => {
      const reg = await AsyncStorage.getItem('currentStudentReg');
      const name = await AsyncStorage.getItem('currentStudentName');
      if (reg) setStudentInfo({ reg, name: name || 'Student' });
    };
    loadStudentInfo();
  }, []);

  // Fetch all buddy messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('buddy_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
        // Scroll to bottom when messages load
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    fetchMessages();

    // Subscribe to new messages in real-time
    const subscription = supabase
      .channel('buddy_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'buddy_messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        // Scroll to bottom when new message arrives
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !studentInfo.reg) {
      console.log('Cannot send - missing input or registration:', { input: input.trim(), reg: studentInfo.reg });
      return;
    }

    console.log('Sending message:', { input, studentInfo });

    const messageData = {
      sender_type: 'student',
      sender_reg: studentInfo.reg,
      sender_name: studentInfo.name || 'Student',
      content: input.trim(),
      created_at: new Date().toISOString(),
      is_global: true
    };

    console.log('Message data to send:', messageData);

    const { data, error } = await supabase.from('buddy_messages').insert([messageData]);

    if (error) {
      console.error('Error sending message:', error);
    } else {
      console.log('Message sent successfully:', data);
      setInput('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F3E5F5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 30 }}>
          <TouchableOpacity
            onPress={() => router.push('./student-home')}
            style={[styles.backButton, { marginRight: 10 }]}
            accessibilityLabel="Go to Home"
          >
            <Text style={styles.backButtonText}>←Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { flex: 1, textAlign: 'center' }]}>🤝 Buddy Connect</Text>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={[styles.messageBubble,
                  item.sender_type === 'student' && item.sender_reg === studentInfo.reg
                  ? styles.myMessage
                  : item.sender_type === 'expert'
                  ? styles.expertMessage
                  : item.sender_type === 'admin'
                  ? styles.adminMessage
                  : styles.studentMessage]}>
              <Text style={styles.sender}>
                {item.sender_name || item.sender_type} ({item.sender_reg})
              </Text>
              <Text style={styles.content}>{item.content}</Text>
              <Text style={styles.time}>{item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          style={{ flex: 1 }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Send message to everyone..."
            placeholderTextColor="#888"
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: input.trim() ? '#8E24AA' : '#BA68C8' }]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: 12,
    backgroundColor: '#8E24AA', // Purple primary
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginLeft: 10,
  },
  backButtonText: {
    color: '#FFFFFF', // White text for contrast
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: '#4A148C', // Deep purple
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  messageBubble: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#8E24AA', // Purple primary
  },
  studentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CE93D8', // Light purple border
  },
  expertMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#BA68C8', // Purple tertiary
  },
  adminMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#CE93D8', // Purple accent
  },
  sender: {
    color: '#4A148C', // Deep purple
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  content: {
    color: '#2c3e50',
    fontSize: 16,
    lineHeight: 22,
  },
  time: {
    color: '#7f8c8d',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#CE93D8', // Light purple border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    color: '#2c3e50',
    padding: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginLeft: 8,
    backgroundColor: '#e74c3c',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});

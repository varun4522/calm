import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { AdminPrompt, getCurrentUser } from '../../lib/aiChatStorage';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  category?: string;
  wellness_tip?: string;
}

// Using AdminPrompt from aiChatStorage.ts for consistency
type CustomPrompt = AdminPrompt;

const AI = () => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your CALM companion AI. I'm here to help you with mental wellness, stress management, and emotional support. How are you feeling today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [adminPrompts, setAdminPrompts] = useState<AdminPrompt[]>([]);
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    initUserAndData();
    checkServerStatus();
  }, []);
  const initUserAndData = async () => {
    try {
      const user = await getCurrentUser();
      const uid = user?.id || 'anonymous';
      setCurrentUserId(uid);
      await loadCustomPrompts();
      await loadAdminPrompts();
      await loadChatHistoryForUser(uid);
    } catch (e) {
      console.error('Error initializing AI screen:', e);
      await loadCustomPrompts();
      await loadAdminPrompts();
      await loadChatHistoryForUser('anonymous');
    }
  };


  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const checkServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      setIsServerOnline(response.ok);
    } catch (error) {
      setIsServerOnline(false);
    }
  };

  const loadCustomPrompts = async () => {
    try {
      const stored = await AsyncStorage.getItem('customPrompts');
      if (stored) {
        setCustomPrompts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading custom prompts:', error);
    }
  };

  const loadAdminPrompts = async () => {
    try {
      setIsLoadingPrompts(true);
      console.log('Loading admin prompts from Supabase...');

      // Load all active admin prompts from Supabase
      const { data, error } = await supabase
        .from('admin_prompts')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading admin prompts:', error);
        // If table doesn't exist, show helpful message
        if (error.code === '42P01') {
          console.log('Admin prompts table not found. Please run the database setup script.');
        }
        return;
      }

      if (data && data.length > 0) {
        // Convert Supabase format to AdminPrompt format
        const prompts: AdminPrompt[] = data.map((item: any) => ({
          id: item.prompt_id,
          question: item.question,
          answer: item.answer,
          category: item.category,
          created_by: item.created_by,
          created_at: new Date(item.created_at),
          updated_at: new Date(item.updated_at),
          is_active: item.is_active
        }));

        setAdminPrompts(prompts);
        console.log(`Loaded ${prompts.length} admin prompts from Supabase`);
      } else {
        console.log('No admin prompts found in Supabase');
        setAdminPrompts([]);
      }
    } catch (error) {
      console.error('Error loading admin prompts:', error);
      setAdminPrompts([]);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const loadChatHistoryForUser = async (uid: string) => {
    try {
      // Per-user history key
      const key = `chatHistory_${uid}`;
      let stored = await AsyncStorage.getItem(key);
      // Migrate old shared key if exists and no per-user yet
      if (!stored) {
        const legacy = await AsyncStorage.getItem('chatHistory');
        if (legacy) {
          await AsyncStorage.setItem(key, legacy);
          await AsyncStorage.removeItem('chatHistory');
          stored = legacy;
        }
      }
      if (stored) {
        const history = JSON.parse(stored);
        setMessages(history.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatHistory = async (messagesToSave: Message[]) => {
    try {
      const uid = currentUserId || 'anonymous';
      await AsyncStorage.setItem(`chatHistory_${uid}`, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const findBestAdminPromptMatch = (userMessage: string): AdminPrompt | null => {
    if (!adminPrompts || adminPrompts.length === 0) {
      return null;
    }

    const lowerMessage = userMessage.toLowerCase();

    // First, try to find exact keyword matches
    const exactMatch = adminPrompts.find(prompt =>
      lowerMessage.includes(prompt.question.toLowerCase()) ||
      prompt.question.toLowerCase().includes(lowerMessage)
    );

    if (exactMatch) {
      console.log(`Found exact match for "${userMessage}": ${exactMatch.question}`);
      return exactMatch;
    }

    // Second, try to find partial matches with common mental health keywords
    const partialMatch = adminPrompts.find(prompt => {
      const questionWords = prompt.question.toLowerCase().split(' ');
      const messageWords = lowerMessage.split(' ');

      // Check if any words from the prompt question appear in the user message
      return questionWords.some(word =>
        word.length > 3 && messageWords.some(msgWord =>
          msgWord.includes(word) || word.includes(msgWord)
        )
      );
    });

    if (partialMatch) {
      console.log(`Found partial match for "${userMessage}": ${partialMatch.question}`);
      return partialMatch;
    }

    // Third, check for category-based matches
    const categoryKeywords = {
      'anxiety': ['anxious', 'anxiety', 'worried', 'worry', 'nervous', 'panic', 'fear'],
      'stress': ['stressed', 'stress', 'overwhelmed', 'pressure', 'tension'],
      'depression': ['sad', 'depressed', 'depression', 'down', 'hopeless', 'lonely'],
      'sleep': ['sleep', 'tired', 'insomnia', 'sleepy', 'rest', 'exhausted'],
      'motivation': ['motivation', 'motivate', 'unmotivated', 'lazy', 'procrastinate'],
      'general': ['help', 'support', 'talk', 'listen', 'advice']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        const categoryMatch = adminPrompts.find(prompt =>
          prompt.category?.toLowerCase() === category
        );
        if (categoryMatch) {
          console.log(`Found category match (${category}) for "${userMessage}": ${categoryMatch.question}`);
          return categoryMatch;
        }
      }
    }

    console.log(`No admin prompt match found for "${userMessage}"`);
    return null;
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const messageText = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      let aiResponse = '';
      let category = '';
      let wellness_tip = '';

      if (isServerOnline) {
        // Use our AI server
        const response = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageText,
            user_id: currentUserId || 'anonymous'
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiResponse = data.response;
          category = data.category;
          wellness_tip = data.wellness_tip;
        } else {
          throw new Error('Server error');
        }
      } else {
        // First, try to find a match in admin prompts from Supabase
        const adminPromptMatch = findBestAdminPromptMatch(messageText);
        if (adminPromptMatch) {
          aiResponse = adminPromptMatch.answer;
          category = adminPromptMatch.category || 'general';
          console.log(`Using admin prompt response: ${adminPromptMatch.question} -> ${adminPromptMatch.answer.substring(0, 50)}...`);
        } else {
          // Second fallback to local custom prompts
          const matchingPrompt = customPrompts.find(prompt =>
            messageText.toLowerCase().includes(prompt.question.toLowerCase()) ||
            prompt.question.toLowerCase().includes(messageText.toLowerCase())
          );

          if (matchingPrompt) {
            aiResponse = matchingPrompt.answer;
          } else {
            // Default responses for common mental health topics (final fallback)
            const lowerMessage = messageText.toLowerCase();
            if (lowerMessage.includes('anxious') || lowerMessage.includes('anxiety') || lowerMessage.includes('worried')) {
              aiResponse = "I understand you're feeling anxious. Try the 4-7-8 breathing technique: breathe in for 4, hold for 7, exhale for 8. Remember, this feeling is temporary.";
              category = 'anxiety';
            } else if (lowerMessage.includes('stressed') || lowerMessage.includes('stress') || lowerMessage.includes('overwhelmed')) {
              aiResponse = "Stress can be really challenging. Have you tried breaking down what's stressing you into smaller, manageable parts? Sometimes a short walk or deep breathing can help.";
              category = 'stress';
            } else if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down')) {
              aiResponse = "I'm sorry you're feeling sad. Your emotions are valid, and it's okay to sit with these feelings for a moment. Would you like to talk about what's making you feel this way?";
              category = 'sad';
            } else if (lowerMessage.includes('sleep') || lowerMessage.includes('tired') || lowerMessage.includes('insomnia')) {
              aiResponse = "Good sleep is so important for mental health. Have you tried a bedtime routine with no screens 30 minutes before sleep? Creating a calm environment helps - cool, dark, and quiet.";
              category = 'sleep';
            } else {
              aiResponse = "I'm here to listen and support you. What's on your mind today? Feel free to share what you're feeling - whether it's stress, anxiety, sadness, or anything else.";
              category = 'general';
            }
          }
        }
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
        category,
        wellness_tip
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      await saveChatHistory(finalMessages);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: "I'm sorry, I'm having trouble responding right now. Please try again later or contact support if this continues.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    setMessages([{
      id: '1',
      text: "Hello! I'm your CALM companion AI. I'm here to help you with mental wellness, stress management, and emotional support. How are you feeling today?",
      isUser: false,
      timestamp: new Date()
    }]);
    const uid = currentUserId || 'anonymous';
    await AsyncStorage.removeItem(`chatHistory_${uid}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Companion</Text>
        <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Server Status */}
      <View style={[styles.statusBar, { backgroundColor: isServerOnline ? '#e8f5e8' : '#ffebee' }]}>
        <Text style={[styles.statusText, { color: isServerOnline ? '#2d5a2d' : '#c62828' }]}>
          {isServerOnline ? '✅ AI Server Online - Enhanced responses available' : '⚠️ Offline Mode - Basic responses only'}
        </Text>
      </View>

      {/* Admin Prompts Status */}
      <View style={[styles.statusBar, { backgroundColor: '#f0f8ff' }]}>
        <Text style={[styles.statusText, { color: '#1565c0' }]}>
          {isLoadingPrompts
            ? '⏳ Loading admin prompts...'
            : adminPrompts.length > 0
              ? `📋 ${adminPrompts.length} admin prompts loaded`
              : '📝 Using default responses'
          }
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View key={message.id} style={styles.messageContainer}>
            <View style={[
              styles.messageBubble,
              message.isUser ? styles.userMessage : styles.aiMessage
            ]}>
              <Text style={[
                styles.messageText,
                message.isUser ? styles.userMessageText : styles.aiMessageText
              ]}>
                {message.text}
              </Text>

              {/* Show wellness tip if available */}
              {!message.isUser && message.wellness_tip && (
                <View style={styles.wellnessTip}>
                  <Text style={styles.wellnessTipText}>{message.wellness_tip}</Text>
                </View>
              )}

              <Text style={[
                styles.timestamp,
                message.isUser ? styles.userTimestamp : styles.aiTimestamp
              ]}>
                {message.timestamp.toLocaleTimeString()}
              </Text>
            </View>
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#666" />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message here..."
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, { opacity: isLoading ? 0.6 : 1 }]}
          onPress={handleSend}
          disabled={isLoading || !inputText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#2d3436',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBar: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    elevation: 1,
  },
  userMessage: {
    backgroundColor: '#2d3436',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#333',
  },
  wellnessTip: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6c5ce7',
  },
  wellnessTipText: {
    fontSize: 12,
    color: '#333',
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: '#999',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    backgroundColor: '#2d3436',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AI;

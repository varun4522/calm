import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {  Alert,  Dimensions,  FlatList,  Image,  InteractionManager,  KeyboardAvoidingView,  Modal,  Platform,  SafeAreaView,  StyleSheet,  Text,  TextInput,  TouchableOpacity,  View} from 'react-native';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/Message';
import { useProfile } from '@/api/Profile';
import { useAuth } from '@/providers/AuthProvider';



const { width, height } = Dimensions.get('window');

// Memoized message item component for better performance
const MessageItem = React.memo(({
  item,
  isSentByMe,
  displayName,
  profileImage,
  formatTime
}: {
  item: ChatMessage;
  isSentByMe: boolean;
  displayName: string;
  profileImage: any;
  formatTime: (timestamp: string) => string;
}) => (
  <View style={[styles.messageContainer, isSentByMe ? styles.myMessageContainer : styles.theirMessageContainer]}>
    {!isSentByMe && (
      <Image
        source={profileImage}
        style={styles.profileImage}
      />
    )}

    <View style={[styles.messageBubble, isSentByMe ? styles.myMessageBubble : styles.theirMessageBubble]}>
      {!isSentByMe && (
        <Text style={styles.senderName}>{displayName}</Text>
      )}
      <Text style={[styles.messageText, isSentByMe ? styles.myMessageText : styles.theirMessageText]}>
        {item.message}
      </Text>
      <Text style={[styles.messageTime, isSentByMe ? styles.myMessageTime : styles.theirMessageTime]}>
        {formatTime(item.created_at)}
      </Text>
    </View>

    {isSentByMe && (
      <Image
        source={profileImage}
        style={styles.profileImage}
      />
    )}
  </View>
));

export default function Chat() {
  const params = useLocalSearchParams();
  const participantId = (params.expertId || params.peerId || params.participantId) as string;
  const participantName = (params.expertName || params.peerName || params.participantName) as string;
  const participantType = (params.userType || params.participantType) as string;

  const { session } = useAuth();
  const { data: profile } = useProfile(session?.user.id);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [participantOnline, setParticipantOnline] = useState(false);
  const [participantLastSeen, setParticipantLastSeen] = useState<string | null>(null);
  const [alias, setAlias] = useState<string | null>(null);
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [tempAlias, setTempAlias] = useState('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const onlineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoized functions for better performance
  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const handleMenuPress = useCallback(() => {
    setShowOptionsModal(true);
  }, []);

  const handleOptionsClose = useCallback(() => {
    setShowOptionsModal(false);
  }, []);

  const handleChangeNamePress = useCallback(() => {
    setShowOptionsModal(false);
    setTempAlias(alias || participantName || '');
    setShowChangeNameModal(true);
  }, [alias, participantName]);

  const handleChangeNameClose = useCallback(() => {
    setShowChangeNameModal(false);
  }, []);

  const handleSaveAlias = useCallback(() => {
    saveAlias(tempAlias);
    setShowChangeNameModal(false);
    setTempAlias('');
    setShowOptionsModal(false);
  }, [tempAlias]);

  const handleSendMessage = useCallback(() => {
    if (newMessage.trim() === '' || isSending) return;

    setIsSending(true);

    // Immediate UI update for instant feedback
    const tempMessage = {
      id: `temp_${Date.now()}`,
      sender_id: profile!.id,
      receiver_id: participantId,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
      sender_name: profile!.name,
      sender_type: 'STUDENT' as const,
    };

    setChatMessages(prev => [...prev, tempMessage]);
    const messageToSend = newMessage.trim();
    setNewMessage('');

    // Scroll immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 0);

    // Send to server in background
    InteractionManager.runAfterInteractions(async () => {
      try {
        await sendMessage(messageToSend, tempMessage.id);
      } finally {
        setIsSending(false);
      }
    });
  }, [newMessage, profile, participantId, isSending]);

  // Memoized profile image getter
  const getProfileImageMemo = useMemo(() => {
    return (senderType: string, isMe: boolean) => {
      if (isMe) {
        return require('../../assets/images/profile/pic1.png');
      }

      switch (senderType) {
        case 'expert':
          return require('../../assets/images/profile/pic2.png');
        case 'peer':
          return require('../../assets/images/profile/pic3.png');
        case 'admin':
          return require('../../assets/images/profile/pic4.png');
        default:
          return require('../../assets/images/profile/pic5.png');
      }
    };
  }, []);

  useEffect(() => {
    if (profile && participantId) {
      loadChatMessages();
      const cleanup = setupRealtimeSubscription();
      // compute initial online/last-seen from recent messages
      updateParticipantStatusFromMessages();
      // load stored alias if exists
      loadAlias();
      return cleanup;
    }
  }, [profile, participantId]);

  const loadAlias = async () => {
    try {
      if (!participantId) return;
      const stored = await AsyncStorage.getItem(`alias_${participantId}`);
      if (stored) setAlias(stored);
    } catch (err) {
      console.error('Error loading alias:', err);
    }
  };

  const saveAlias = async (value: string) => {
    try {
      if (!participantId) return;
      await AsyncStorage.setItem(`alias_${participantId}`, value);
      setAlias(value);
    } catch (err) {
      console.error('Error saving alias:', err);
    }
  };

  // Determine participant online / last seen using latest message timestamp
  const updateParticipantStatusFromMessages = async () => {
    try {
      if (!participantId) return;
      const { data, error } = await supabase
        .from('messages')
        .select('created_at')
        .eq('sender_id', participantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // no messages or error
        setParticipantOnline(false);
        setParticipantLastSeen(null);
        return;
      }

      const latest = data as { created_at: string };
      if (!latest?.created_at) {
        setParticipantOnline(false);
        setParticipantLastSeen(null);
        return;
      }

      const lastDate = new Date(latest.created_at);
      const diffSeconds = (Date.now() - lastDate.getTime()) / 1000;
      if (diffSeconds <= 60) {
        setParticipantOnline(true);
        setParticipantLastSeen(null);
        // schedule fallback to last seen
        if (onlineTimeoutRef.current) clearTimeout(onlineTimeoutRef.current);
        onlineTimeoutRef.current = setTimeout(() => {
          setParticipantOnline(false);
          setParticipantLastSeen(formatTime(latest.created_at));
        }, 90 * 1000);
      } else {
        setParticipantOnline(false);
        setParticipantLastSeen(formatTime(latest.created_at));
      }
    } catch (err) {
      console.error('Error getting participant status:', err);
    }
  };


  const loadChatMessages = async () => {
    try {
      if (!participantId || !profile) return;

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${profile.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setChatMessages(messages || []);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!profile || !participantId) return;

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${participantId},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${participantId}))`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setChatMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });

          // If the incoming message is from the participant, mark them online briefly
          if (newMessage.sender_id === participantId) {
            setParticipantOnline(true);
            setParticipantLastSeen(null);

            if (onlineTimeoutRef.current) clearTimeout(onlineTimeoutRef.current);
            onlineTimeoutRef.current = setTimeout(() => {
              setParticipantOnline(false);
              setParticipantLastSeen(formatTime(newMessage.created_at));
            }, 90 * 1000);
          }

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (messageText?: string, tempId?: string) => {
    const textToSend = messageText || newMessage.trim();
    if (textToSend === '') return;

    const messageData = {
      sender_id: profile?.id,
      receiver_id: participantId as string,
      sender_name: profile?.name,
      sender_type: 'STUDENT' as const,
      message: textToSend,
      created_at: new Date(),
    };

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Remove temp message and show error
        if (tempId) {
          setChatMessages(prev => prev.filter(msg => msg.id !== tempId));
        }
        Alert.alert('Error', 'Failed to send message');
        return;
      }

      if (data && tempId) {
        // Replace temp message with real message
        setChatMessages(prev =>
          prev.map(msg => msg.id === tempId ? data : msg)
        );
      } else if (data && !tempId) {
        // Legacy path - add message normally
        setChatMessages(prev => [...prev, data]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }

      if (!messageText) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message and show error
      if (tempId) {
        setChatMessages(prev => prev.filter(msg => msg.id !== tempId));
      }
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const clearChat = async () => {
    Alert.alert(
      'Clear Chat',
      `Are you sure you want to clear all messages with ${participantName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('messages')
                .delete()
                .or(`and(sender_id.eq.${profile?.id},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${profile?.id})`);

              if (error) {
                Alert.alert('Error', 'Failed to clear chat');
              } else {
                setChatMessages([]);
                setShowOptionsModal(false);
                Alert.alert('Success', 'Chat cleared successfully');
              }
            } catch (error) {
              console.error('Clear chat error:', error);
              Alert.alert('Error', 'Failed to clear chat');
            }
          }
        }
      ]
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getProfileImage = (senderType: string, isMe: boolean) => {
    if (isMe) {
      return require('../../assets/images/profile/pic1.png');
    }

    switch (senderType) {
      case 'expert':
        return require('../../assets/images/profile/pic2.png');
      case 'peer':
        return require('../../assets/images/profile/pic3.png');
      case 'admin':
        return require('../../assets/images/profile/pic4.png');
      default:
        return require('../../assets/images/profile/pic5.png');
    }
  };

  // Optimized memoized message renderer
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isSentByMe = item.sender_id === profile?.id;
    const displayName = item.sender_id === participantId && alias ? alias : item.sender_name;
    const profileImage = getProfileImageMemo(item.sender_type, isSentByMe);

    return (
      <MessageItem
        item={item}
        isSentByMe={isSentByMe}
        displayName={displayName}
        profileImage={profileImage}
        formatTime={formatTime}
      />
    );
  }, [profile, participantId, alias, getProfileImageMemo]);

  // Memoized message key extractor for better FlatList performance
  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      enabled={true}
    >
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
          activeOpacity={0.3}
          delayPressIn={0}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image
            source={getProfileImageMemo(participantType, false)}
            style={styles.headerProfileImage}
          />
          <View>
            <Text style={styles.headerTitle}>{alias || participantName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {participantOnline ? (
                <View style={styles.onlineDot} />
              ) : null}
              <Text style={styles.headerStatus}>{participantOnline ? 'Online' : (participantLastSeen ? `Last seen ${participantLastSeen}` : '')}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleMenuPress}
          style={styles.menuButton}
          activeOpacity={0.3}
          delayPressIn={0}
        >
          <Text style={styles.menuButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={15}
          updateCellsBatchingPeriod={50}
          getItemLayout={undefined}
          disableVirtualization={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#666"
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          style={[styles.sendButton, isSending && { opacity: 0.6 }]}
          activeOpacity={0.3}
          delayPressIn={0}
          disabled={isSending || newMessage.trim() === ''}
        >
          <Text style={styles.sendButtonText}>{isSending ? 'Sending...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleOptionsClose}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleOptionsClose}
          delayPressIn={0}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleChangeNamePress}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <Text style={styles.modalOptionText}>Change Name</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={clearChat}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <Text style={styles.modalOptionText}>Clear Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleOptionsClose}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <Text style={styles.modalOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Change Name Modal */}
      <Modal
        visible={showChangeNameModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleChangeNameClose}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 16 }]}>
            <Text style={[styles.modalOptionText, { fontWeight: '700', marginBottom: 8 }]}>Change Display Name</Text>
            <TextInput
              value={tempAlias}
              onChangeText={setTempAlias}
              placeholder="Enter name"
              placeholderTextColor="#999"
              style={{
                backgroundColor: '#fff',
                color: '#000',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                marginBottom: 12,
              }}
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleSaveAlias}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={handleChangeNameClose}
                style={{ marginRight: 12 }}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Text style={styles.modalOptionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveAlias}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Text style={styles.modalOptionText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  paddingVertical: 12,
  marginTop: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#000',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  headerProfileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  menuButton: {
    padding: 8,
  },
  menuButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContainer: {
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 16,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: width * 0.7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  myMessageBubble: {
    backgroundColor: '#000',
  },
  theirMessageBubble: {
    backgroundColor: '#000',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: '#ccc',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: '#ccc',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    minHeight: 60,
    position: 'relative',
    zIndex: 1000,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#f5f5f5',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 160,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28c76f',
    marginRight: 6,
  },
  headerStatus: {
    fontSize: 12,
    color: '#666',
  },
});
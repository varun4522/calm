import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/api/Profile';
import { ChatMessage,  ReceivedMessage } from '@/types/Message';
import { profilePics } from '@/constants/ProfilePhotos';
import { useConversations } from '@/api/StudentMessages';


export default function MessagesPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile } = useProfile(session?.user.id);

  const [searchText, setSearchText] = useState('');
  const { conversations, refetch: refetchConversations } = useConversations(profile?.id);

  const [sentMessages, setSentMessages] = useState<ReceivedMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ReceivedMessage[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isChatDeleteMode, setIsChatDeleteMode] = useState(false);
  const [aliases, setAliases] = useState<{ [participantId: string]: string }>({});

  // Group messages by contact for chat delete mode
  const getUniqueContacts = (messages: ReceivedMessage[]) => {
    const contactMap = new Map<string, ReceivedMessage>();

    messages.forEach(message => {
      const contactKey = message.sender_id; // This is now the conversation partner
      if (!contactMap.has(contactKey)) {
        contactMap.set(contactKey, message);
      } else {
        // Keep the most recent message for each contact
        const existing = contactMap.get(contactKey)!;
        if (new Date(message.created_at) > new Date(existing.created_at)) {
          contactMap.set(contactKey, message);
        }
      }
    });

    return Array.from(contactMap.values());
  };
  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${profile.id},receiver_id.eq.${profile.id})`,
        },
        (payload) => {
          console.log('New message in conversation:', payload);
          refetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${profile.id},receiver_id.eq.${profile.id})`,
        },
        (payload) => {
          console.log('Message updated in conversation:', payload);
          // Refresh conversations when message is updated (e.g., marked as read)
          loadSentMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Filter messages based on search text
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredMessages(sentMessages);
    } else {
      const filteredMsgs = sentMessages.filter(message =>
        message.sender_name.toLowerCase().includes(searchText.toLowerCase()) ||
        message.message.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredMessages(filteredMsgs);
    }
    // Clear selection when filtering changes
    setSelectedMessages([]);
  }, [searchText, sentMessages]);

  const loadSentMessages = async () => {
    try {
      const currentStudentId = profile?.id; // use UUID from profile
      if (!currentStudentId) return;

      // Fetch ALL messages where current student is either sender OR receiver
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentStudentId},receiver_id.eq.${currentStudentId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (messages) {
        const conversationMap = new Map<string, any>();

        messages.forEach(msg => {
          const partnerId = msg.sender_id === currentStudentId ? msg.receiver_id : msg.sender_id;
          const partnerName = msg.sender_id === currentStudentId ? 'Sent to recipient' : msg.sender_name;

          if (!conversationMap.has(partnerId) ||
            new Date(msg.created_at) > new Date(conversationMap.get(partnerId)!.created_at)) {

            let partnerType = msg.sender_id !== currentStudentId ? msg.sender_type : 'student';

            // If current student sent it, infer type from receiver_id
            if (msg.sender_id === currentStudentId) {
              if (msg.receiver_id.includes('expert')) partnerType = 'expert';
              else if (msg.receiver_id.includes('peer')) partnerType = 'peer';
              else if (msg.receiver_id.includes('admin')) partnerType = 'admin';
            }

            conversationMap.set(partnerId, {
              id: msg.id,
              sender_id: partnerId,
              receiver_id: currentStudentId,
              sender_name: msg.sender_id === currentStudentId ? (msg.receiver_id.split('_')[0] || 'Recipient') : msg.sender_name,
              sender_type: partnerType,
              message: msg.sender_id === currentStudentId ? `You: ${msg.message}` : msg.message,
              created_at: msg.created_at,
              is_read: msg.is_read,
              profilePic: Math.floor(Math.random() * profilePics.length),
              originalSenderId: msg.sender_id,
            });
          }
        });

        const transformedMessages = Array.from(conversationMap.values());
        setSentMessages(transformedMessages);
        setFilteredMessages(transformedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setSentMessages([]);
      setFilteredMessages([]);
    }
  };


  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedMessages([]);
    // Exit chat delete mode when entering message selection mode
    if (!isSelectMode) {
      setIsChatDeleteMode(false);
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const selectAllMessages = () => {
    if (selectedMessages.length === filteredMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(filteredMessages.map(msg => msg.id));
    }
  };

  const deleteSelectedMessages = async () => {
    if (selectedMessages.length === 0) return;

    try {
      Alert.alert(
        'Delete Messages',
        `Are you sure you want to delete ${selectedMessages.length} message(s)? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('messages')
                .delete()
                .in('id', selectedMessages);

              if (error) {
                Alert.alert('Error', 'Failed to delete messages');
                console.error('Delete error:', error);
              } else {
                // Remove deleted messages from local state
                setSentMessages(prev => prev.filter(msg => !selectedMessages.includes(msg.id)));
                setSelectedMessages([]);
                setIsSelectMode(false);
                Alert.alert('Success', 'Messages deleted successfully');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Delete messages error:', error);
      Alert.alert('Error', 'Failed to delete messages');
    }
  };

  const deleteChatWithContact = async (message: ChatMessage) => {
    const studentId = profile?.id;
    if (!studentId) return;

    const otherPersonId = message.sender_id === studentId ? message.receiver_id : message.sender_id;
    const otherPersonName = message.sender_id === studentId ? message.receiver_name : message.sender_name;

    try {
      Alert.alert(
        'Delete Conversation',
        `Are you sure you want to delete your entire conversation with ${otherPersonName}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Conversation',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('messages')
                .delete()
                .or(
                  `and(sender_id.eq.${studentId},receiver_id.eq.${otherPersonId}),and(sender_id.eq.${otherPersonId},receiver_id.eq.${studentId})`
                );

              if (error) {
                console.error('Delete conversation error:', error);
                Alert.alert('Error', 'Failed to delete conversation');
              } else {
                refetchConversations();
                Alert.alert('Success', `Conversation with ${otherPersonName} deleted successfully`);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Delete conversation error:', error);
      Alert.alert('Error', 'Failed to delete conversation');
    }
  };


  const toggleChatDeleteMode = () => {
    setIsChatDeleteMode(!isChatDeleteMode);
    // Exit message selection mode when entering chat delete mode
    if (!isChatDeleteMode) {
      setIsSelectMode(false);
      setSelectedMessages([]);
    }
  };

  // Load aliases for all participants
  const loadAliases = async (participantIds: string[]) => {
    try {
      const aliasMap: { [key: string]: string } = {};

      for (const participantId of participantIds) {
        const stored = await AsyncStorage.getItem(`alias_${participantId}`);
        if (stored) {
          aliasMap[participantId] = stored;
        }
      }

      setAliases(aliasMap);
    } catch (error) {
      console.error('Error loading aliases:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const handleChatWithSender = (message: ChatMessage) => {
    const studentId = profile?.id; // logged-in student ID
    if (!studentId) return;

    // Mark message as read
    markMessageAsRead(message.id);

    // Determine the "other participant" in the conversation
    const isSender = message.sender_id === studentId;
    const otherPersonId = isSender ? message.receiver_id : message.sender_id;
    const otherPersonName = isSender ? message.receiver_name : message.sender_name;
    const otherPersonType = isSender ? message.receiver_type : message.sender_type;
    // Navigate to chat page with all relevant info
    router.push({
      pathname: './chat',
      params: {
        participantId: otherPersonId,
        participantName: otherPersonName,
        participantType: otherPersonType
      }
    });
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) {
        console.error('Error marking message as read:', error);
        return;
      }

      // Update the local state
      setSentMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
      setFilteredMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }; const refreshData = async () => {
    if (profile) {
      await Promise.all([
        loadSentMessages()
      ]);
    }
  };

  const debugRefresh = async () => {
    try {
      Alert.alert('Debug Refresh', 'Refreshing conversations and messages...', [{ text: 'OK' }]);

      await refreshData();

      console.log('Debug refresh completed for messages page');
    } catch (error) {
      console.error('Debug refresh error:', error);
      Alert.alert('Error', 'Failed to refresh messages');
    }
  };

  const renderReceivedMessage = ({ item }: { item: ChatMessage }) => {
    const isSelected = selectedMessages.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.messageItem,
          isSelected && styles.selectedMessageItem,
          isChatDeleteMode && styles.chatDeleteModeItem
        ]}
        onPress={() => {
          if (isSelectMode) {
            toggleMessageSelection(item.id);
          } else if (isChatDeleteMode) {
            deleteChatWithContact(item);
          } else {
            handleChatWithSender(item);
          }
        }}
        activeOpacity={0.7}
      >
        {isSelectMode && (
          <View style={styles.selectionCheckbox}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
        )}

        {isChatDeleteMode && (
          <View style={styles.deleteIndicator}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </View>
        )}

        <View style={styles.messageHeader}>
          <View style={styles.messageContent}>
            <View style={styles.messageTop}>
              <Text style={styles.senderName}>
                {item.sender_name}
              </Text>
              <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
            </View>

            <Text style={styles.lastMessage} numberOfLines={3}>
              {item.message}
            </Text>

            <Text style={styles.senderTypeLabel}>
              {isChatDeleteMode
                ? 'Tap to delete all messages with this contact'
                : item.sender_type === 'EXPERT' ? 'Mental Health Expert' :
                  item.sender_type === 'PEER' ? 'Peer Listener' :
                    item.sender_type === 'ADMIN' ? 'Administrator' : 'Contact'}
            </Text>
            {!isSelectMode && (
              <View style={styles.chatButtonWrapper}>
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => handleChatWithSender(item)}
                  activeOpacity={0.3}
                  delayPressIn={0}
                >
                  <Text style={styles.chatButtonText}>💬 Chat</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!item.is_read && (
            <View style={styles.unreadIndicator} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            router.push(`./student-home?registration=${profile?.registration_number}`);
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>My Conversations</Text>
          <Text style={styles.headerSubtitle}>Private chats with {profile?.name}</Text>
        </View>
        <TouchableOpacity
          onPress={debugRefresh}
          style={styles.debugRefreshButton}
        >
          <Text style={styles.debugRefreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Select Mode Controls */}
      <View style={styles.selectModeControls}>
        <TouchableOpacity
          onPress={toggleSelectMode}
          style={[styles.selectModeButton, isSelectMode && styles.selectModeButtonActive]}
        >
          <Text style={[styles.selectModeButtonText, isSelectMode && styles.selectModeButtonTextActive]}>
            {isSelectMode ? 'Cancel' : 'Select'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleChatDeleteMode}
          style={[styles.chatDeleteButton, isChatDeleteMode && styles.chatDeleteButtonActive]}
        >
          <Text style={[styles.chatDeleteButtonText, isChatDeleteMode && styles.chatDeleteButtonTextActive]}>
            {isChatDeleteMode ? 'Cancel' : 'Delete Chats'}
          </Text>
        </TouchableOpacity>

        {isSelectMode && (
          <>
            <TouchableOpacity
              onPress={selectAllMessages}
              style={styles.selectAllButton}
            >
              <Text style={styles.selectAllButtonText}>
                {selectedMessages.length === filteredMessages.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>

            {selectedMessages.length > 0 && (
              <TouchableOpacity
                onPress={deleteSelectedMessages}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>
                  Delete ({selectedMessages.length})
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Content Area */}
      <View style={styles.messagesArea}>
        {isChatDeleteMode && filteredMessages.length > 0 && (
          <View style={[styles.footer, { backgroundColor: '#fff3e0' }]}>
            <Text style={[styles.footerText, { color: '#f57c00' }]}>
              💡 Tap on any message to delete all conversations with that contact
            </Text>
          </View>
        )}

        {/* My Messages View */}
        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            {searchText.length > 0 ? (
              <>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No Conversations Found</Text>
                <Text style={styles.emptyText}>
                  No conversations found for "{searchText}"
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyIcon}>📨</Text>
                <Text style={styles.emptyTitle}>No Conversations Yet</Text>
                <Text style={styles.emptyText}>
                  You haven't started any conversations yet.
                  When experts, peers, or admins message you, your conversations will appear here.
                </Text>
              </>
            )}
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderReceivedMessage}
            keyExtractor={(item) => isChatDeleteMode ? `chat_${item.sender_id}` : item.id}
            showsVerticalScrollIndicator={false}
            style={styles.messagesList}
          />
        )
        }
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isChatDeleteMode
            ? `${getUniqueContacts(filteredMessages).length} conversations`
            : searchText
              ? `${filteredMessages.length} conversations found`
              : `${sentMessages.length} active conversations`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#7b1fa2',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  debugRefreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugRefreshIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  headerSubtitle: {
    color: '#e1bee7',
    fontSize: 16,
    textAlign: 'center',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
    marginLeft: 10,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  messagesArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  messagesList: {
    flex: 1,
  },
  messageItem: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  messageContent: {
    flex: 1,
  },
  messageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  senderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unreadBadge: {
    backgroundColor: '#7b1fa2',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  openChatButton: {
    backgroundColor: '#7b1fa2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  openChatButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  senderTypeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  senderTypeIcon: {
    fontSize: 12,
  },
  senderTypeLabel: {
    fontSize: 12,
    color: '#7b1fa2',
    fontWeight: '600',
    marginTop: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    backgroundColor: '#ff4444',
    borderRadius: 4,
    marginLeft: 10,
  },
  chatButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: -45,
  },
  chatButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  chatButtonWrapper: {
    marginTop: 6,
    alignItems: 'flex-end',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeToggle: {
    backgroundColor: '#7b1fa2',
    borderColor: '#7b1fa2',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeToggleText: {
    color: '#ffffff',
  },
  selectModeControls: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  selectModeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  selectModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  selectModeButtonTextActive: {
    color: '#ffffff',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
  },
  selectAllButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f44336',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  selectedMessageItem: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatDeleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  chatDeleteButtonActive: {
    backgroundColor: '#f44336',
  },
  chatDeleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
  },
  chatDeleteButtonTextActive: {
    color: '#ffffff',
  },
  deleteIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    backgroundColor: '#f44336',
    borderRadius: 12,
    padding: 4,
  },
  deleteIcon: {
    fontSize: 16,
  },
  chatDeleteModeItem: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
});

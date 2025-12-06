import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {  Alert,  FlatList,  Image,  RefreshControl,  StyleSheet,  Text,  TextInput,  TouchableOpacity,  View} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Conversation, ReceivedMessage } from '@/types/Message';
import { useProfile } from '@/api/Profile';
import { useAuth } from '@/providers/AuthProvider';
import { RefreshConfig } from '@/constants/RefreshConfig';
import { sendLocalNotification } from '@/lib/notificationService';

// Profile pictures for chat participants
const profilePics = [
  require('../../assets/images/profile/pic1.png'),
  require('../../assets/images/profile/pic2.png'),
  require('../../assets/images/profile/pic3.png'),
  require('../../assets/images/profile/pic4.png'),
  require('../../assets/images/profile/pic5.png'),
  require('../../assets/images/profile/pic6.png'),
  require('../../assets/images/profile/pic7.png'),
  require('../../assets/images/profile/pic8.png'),
  require('../../assets/images/profile/pic9.png'),
  require('../../assets/images/profile/pic10.png'),
  require('../../assets/images/profile/pic11.png'),
  require('../../assets/images/profile/pic12.png'),
  require('../../assets/images/profile/pic13.png'),
];



export default function MessagesPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile } = useProfile(session?.user.id);

  const [searchText, setSearchText] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [sentMessages, setSentMessages] = useState<ReceivedMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ReceivedMessage[]>([]);
  const [viewMode, setViewMode] = useState<'messages'>('messages');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isChatDeleteMode, setIsChatDeleteMode] = useState(false);
  const [aliases, setAliases] = useState<{[participantId: string]: string}>({});
  const [refreshing, setRefreshing] = useState(false);
  const [studentInfo, setStudentInfo] = useState({
    name: '',
    registration: '',
    profilePic: 0
  });

  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);


  // Load conversations and messages when student info is available
  useEffect(() => {
    if (profile) {
      loadConversations();
      loadSentMessages();
    }
  }, [profile]);

  // Auto-refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      if (profile) {
        loadConversations();
        loadSentMessages();
      }
    }, [profile])
  );

  // Setup auto-refresh interval (every 30 seconds)
  useEffect(() => {
    if (!profile) return;

    // Initial load
    loadConversations();
    loadSentMessages();

    // Set up interval for auto-refresh
    autoRefreshIntervalRef.current = setInterval(() => {
      loadConversations();
      loadSentMessages();
    }, RefreshConfig.MESSAGES_REFRESH_INTERVAL);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [profile]);

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
  };  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel(`conversations_${profile.id}`)
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
          // Reload immediately for real-time update
          loadSentMessages();
          loadConversations();
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
      if (!profile) return;

      // Fetch ALL messages where current student is either sender OR receiver (private conversations)
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (messages) {
        // Group messages by conversation partner
        const conversationMap = new Map<string, any>();
        const participantIds = new Set<string>();

        // First, collect all unique participant IDs
        messages.forEach(msg => {
          const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
          participantIds.add(partnerId);
        });

        // Fetch names for all participants from profiles table
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, type')
          .in('id', Array.from(participantIds));

        if (profilesError) {
          console.error('Error fetching participant profiles:', profilesError);
        }

        // Create a map of participant IDs to their profiles
        const profilesMap = new Map<string, any>();
        if (profilesData) {
          profilesData.forEach(p => {
            profilesMap.set(p.id, p);
          });
        }

        messages.forEach(msg => {
          // Determine who the conversation partner is
          const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
          
          // Only keep the most recent message for each conversation
          if (!conversationMap.has(partnerId) ||
              new Date(msg.created_at) > new Date(conversationMap.get(partnerId)!.created_at)) {

            // Get partner's profile info
            const partnerProfile = profilesMap.get(partnerId);
            const partnerName = partnerProfile?.name || msg.sender_name || 'Unknown User';
            const partnerType = partnerProfile?.type?.toLowerCase() || msg.sender_type || 'student';

            // Create a standardized message format for display
            conversationMap.set(partnerId, {
              id: msg.id,
              sender_id: partnerId, // Show partner as sender for consistency
              receiver_id: profile.id,
              sender_name: partnerName,
              sender_type: partnerType,
              message: msg.sender_id === profile.id ?
                `You: ${msg.message}` : msg.message, // Prefix with "You:" if student sent it
              created_at: msg.created_at,
              is_read: msg.is_read,
              profilePic: Math.floor(Math.random() * profilePics.length),
              originalSenderId: msg.sender_id // Keep track of who actually sent the message
            });
          }
        });

        const transformedMessages = Array.from(conversationMap.values());
        setSentMessages(transformedMessages);
        setFilteredMessages(transformedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (error instanceof Error && (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch'))) {
        console.log('Network error while loading messages');
      }
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
                if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
                  Alert.alert('Network Error', 'Unable to delete messages. Please check your internet connection.');
                } else {
                  Alert.alert('Error', 'Failed to delete messages');
                }
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

  const deleteChatWithContact = async (partnerId: string, partnerName: string) => {
    try {
      Alert.alert(
        'Delete Conversation',
        `Are you sure you want to delete your entire conversation with ${partnerName}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Conversation',
            style: 'destructive',
            onPress: async () => {
              // Delete all messages between current student and the specific contact
              const { error } = await supabase
                .from('messages')
                .delete()
                .or(`and(sender_id.eq.${profile?.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${profile?.id})`);

              if (error) {
                Alert.alert('Error', 'Failed to delete conversation');
                console.error('Delete conversation error:', error);
              } else {
                // Refresh the messages list
                loadSentMessages();
                loadConversations();
                Alert.alert('Success', `Conversation with ${partnerName} deleted successfully`);
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
      const aliasMap: {[key: string]: string} = {};

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

  const loadConversations = async () => {
    try {
      if (!profile) return;

      // Fetch all messages where student is either sender or receiver
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      if (messages) {
        // Group messages by participant to create conversations
        const conversationMap = new Map<string, Conversation>();
        const participantIds = new Set<string>();

        // Collect all unique participant IDs
        messages.forEach(msg => {
          const participantId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
          participantIds.add(participantId);
        });

        // Fetch profiles for all participants
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, type')
          .in('id', Array.from(participantIds));

        if (profilesError) {
          console.error('Error fetching participant profiles:', profilesError);
        }

        // Create a map of participant IDs to their profiles
        const profilesMap = new Map<string, any>();
        if (profilesData) {
          profilesData.forEach(p => {
            profilesMap.set(p.id, p);
          });
        }

        messages.forEach(msg => {
          const participantId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
          const participantProfile = profilesMap.get(participantId);
          const participantName = participantProfile?.name || msg.sender_name || 'Unknown User';
          const participantType = participantProfile?.type?.toLowerCase() || msg.sender_type || 'student';

          if (!conversationMap.has(participantId)) {
            conversationMap.set(participantId, {
              id: `conversation_${participantId}_${profile.id}`,
              participantId: participantId,
              participantName: participantName,
              participantType: participantType,
              lastMessage: msg.message,
              timestamp: msg.created_at,
              unreadCount: 0, // Will be calculated below
              profilePic: Math.floor(Math.random() * profilePics.length),
              isOnline: Math.random() > 0.5
            });
          } else {
            // Update with more recent message if this is newer
            const existing = conversationMap.get(participantId)!;
            if (new Date(msg.created_at) > new Date(existing.timestamp)) {
              existing.lastMessage = msg.message;
              existing.timestamp = msg.created_at;
            }
          }
        });

        // Calculate unread count for each conversation
        for (const conversation of conversationMap.values()) {
          const unreadMessages = messages.filter(msg =>
            msg.sender_id === conversation.participantId &&
            msg.receiver_id === profile.id &&
            !msg.is_read
          );
          conversation.unreadCount = unreadMessages.length;
        }

        const allConversations = Array.from(conversationMap.values());

        // Sort by most recent message
        allConversations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setConversations(allConversations);
        setFilteredConversations(allConversations);

        // Load aliases for all participants
        const participantIdsList = allConversations.map(conv => conv.participantId);
        loadAliases(participantIdsList);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
      setFilteredConversations([]);
    }
  };


  const handleConversationPress = (conversation: Conversation) => {
    // Navigate directly to dedicated chat page for this conversation
    router.push({
      pathname: './chat',
      params: {
        participantId: conversation.participantId,
        participantName: aliases[conversation.participantId] || conversation.participantName,
        participantType: conversation.participantType
      }
    });
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

  const getSenderTypeIcon = (senderType: string) => {
    switch (senderType) {
      case 'expert': return '🩺';
      case 'peer': return '👥';
      default: return '💬';
    }
  };

  const handleOpenDedicatedChat = (conversation: Conversation) => {
    router.push({
      pathname: './chat',
      params: {
        participantId: conversation.participantId,
        participantName: aliases[conversation.participantId] || conversation.participantName,
        participantType: conversation.participantType
      }
    });
  };

  const handleChatWithSender = (message: ReceivedMessage) => {
    // Mark message as read when opening chat
    markMessageAsRead(message.id);

    router.push({
      pathname: './chat',
      params: {
        participantId: message.sender_id, // This is now the conversation partner
        participantName: aliases[message.sender_id] || message.sender_name,
        participantType: message.sender_type
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
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadConversations(),
        loadSentMessages()
      ]);
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const refreshData = async () => {
    if (studentInfo.registration) {
      await Promise.all([
        loadConversations(),
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

  const renderReceivedMessage = ({ item }: { item: ReceivedMessage }) => {
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
            deleteChatWithContact(item.sender_id, item.sender_name);
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
          <View style={styles.profileContainer}>
            <Image source={profilePics[item.profilePic || 0]} style={styles.profilePic} />
            <View style={styles.senderTypeIndicator}>
              <Text style={styles.senderTypeIcon}>{getSenderTypeIcon(item.sender_type)}</Text>
            </View>
          </View>

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

  {/* chat button moved inside messageContent so it sits directly under the timestamp */}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            router.push(`./student-home?registration=${studentInfo.registration}`);
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>{'<'}</Text>
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
        {(isChatDeleteMode ? getUniqueContacts(filteredMessages) : filteredMessages).length === 0 ? (
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
              data={isChatDeleteMode ? getUniqueContacts(filteredMessages) : filteredMessages}
              renderItem={renderReceivedMessage}
              keyExtractor={(item) => isChatDeleteMode ? `chat_${item.sender_id}` : item.id}
              showsVerticalScrollIndicator={false}
              style={styles.messagesList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#007AFF"
                  colors={['#007AFF']}
                />
              }
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
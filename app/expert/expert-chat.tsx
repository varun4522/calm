import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/Message';
import { useProfile } from '@/api/Profile';
import { useAuth } from '@/providers/AuthProvider';
import { useChatMessages, useInsertMessage } from '@/api/Messages';
import { useQueryClient } from '@tanstack/react-query';


export default function ExpertChatPage() {
    const router = useRouter();
    const params = useLocalSearchParams<{ studentId?: string; }>();

    const queryClient = useQueryClient();

    const { session } = useAuth();
    const { data: profile } = useProfile(session?.user.id);

    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const { data: studentProfile } = useProfile(params.studentId);

    const expertId = session?.user?.id;
    const studentId = params.studentId;

    const { data: messages = [], isLoading } = useChatMessages(expertId, studentId);
    const insertMessage = useInsertMessage();

    useEffect(() => {
        if (!expertId || !studentId) return;

        const channelName = `expert_chat_${expertId}_${studentId}`;
        console.log(`📡 Subscribing to channel: ${channelName}`);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `or(and(sender_id.eq.${expertId},receiver_id.eq.${studentId}),and(sender_id.eq.${studentId},receiver_id.eq.${expertId}))`,
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    console.log('📩 New real-time message:', newMsg);

                    // ✅ Update React Query cache instead of using setMessages
                    queryClient.setQueryData<ChatMessage[]>(
                        ['chatMessages', expertId, studentId],
                        (old = []) => {
                            const exists = old.some(m => m.id === newMsg.id);
                            if (exists) return old;
                            return [...old, newMsg];
                        }
                    );

                    // ✅ Auto-scroll to bottom
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            )
            .subscribe((status) => {
                console.log(`Realtime channel status for ${channelName}:`, status);
            });

        return () => {
            console.log(`❌ Unsubscribing from ${channelName}`);
            supabase.removeChannel(channel);
        };
    }, [expertId, studentId]);



    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            if (profile && expertId && studentProfile) {
                const messagePayload = {
                    sender_id: expertId,
                    receiver_id: studentProfile.id,
                    receiver_name: studentProfile?.name,
                    sender_name: profile?.name,
                    message: newMessage.trim(),
                    sender_type: "EXPERT" as "STUDENT" | "EXPERT" | "PEER" | "ADMIN",
                    receiver_type: studentProfile.type as "STUDENT" | "EXPERT" | "PEER" | "ADMIN",
                    is_read: false,
                };
                console.log(messagePayload);
                await insertMessage.mutateAsync(messagePayload);
            }

            setNewMessage("");
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error: any) {
            Alert.alert("Error", error.message);
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

    const renderMessageItem = ({ item }: { item: ChatMessage }) => (
        <View style={[
            styles.messageItem,
            item.sender_type === 'EXPERT' ? styles.expertMessage : styles.studentMessage
        ]}>
            <View style={styles.messageHeader}>
                <Text style={styles.senderName}>
                    {item.sender_type === 'EXPERT' ? '👨‍⚕️' : '👨‍🎓'} {item.sender_name}
                </Text>
                <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
            </View>
            <Text style={styles.messageText}>{item.message}</Text>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>💬 Chat</Text>
                <Text style={styles.headerSubtitle}>
                    {studentProfile?.name} ({studentProfile?.registration_number})
                </Text>
            </View>

            {/* Student Info Card */}
            <View style={styles.studentInfoCard}>
                <Text style={styles.studentInfoTitle}>Student Information</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{studentProfile?.name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Registration:</Text>
                    <Text style={styles.infoValue}>{studentProfile?.registration_number}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Course:</Text>
                    <Text style={styles.infoValue}>{studentProfile?.course}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{studentProfile?.email}</Text>
                </View>
            </View>

            {/* Messages Area */}
            <View style={styles.messagesArea}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading messages...</Text>
                    </View>
                ) : messages.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>💬</Text>
                        <Text style={styles.emptyTitle}>Start Conversation</Text>
                        <Text style={styles.emptyText}>
                            No messages yet with {studentProfile?.name}.
                            Send the first message to start the conversation!
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessageItem}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        style={styles.messagesList}
                        contentContainerStyle={styles.messagesContainer}
                    />
                )}
            </View>

            {/* Message Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.messageInput}
                    placeholder="Type your message..."
                    placeholderTextColor="#999"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={styles.sendButton}
                    onPress={sendMessage}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>

            {/* Message Count */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {messages.length} message{messages.length !== 1 ? 's' : ''} • Chat with {studentProfile?.name}
                </Text>
            </View>
        </KeyboardAvoidingView>
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
    },
    backButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignSelf: 'flex-start',
        marginBottom: 15,
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
    studentInfoCard: {
        backgroundColor: '#ffffff',
        margin: 20,
        padding: 15,
        borderRadius: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    studentInfoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#7b1fa2',
        marginBottom: 10,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
        flex: 2,
        textAlign: 'right',
    },
    messagesArea: {
        flex: 1,
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 15,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        fontStyle: 'italic',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
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
    messagesList: {
        flex: 1,
    },
    messagesContainer: {
        padding: 20,
    },
    messageItem: {
        marginVertical: 8,
        padding: 15,
        borderRadius: 15,
        maxWidth: '80%',
    },
    expertMessage: {
        backgroundColor: '#e3f2fd',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 5,
    },
    studentMessage: {
        backgroundColor: '#f1f8e9',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 5,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    senderName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    timestamp: {
        fontSize: 12,
        color: '#999',
    },
    messageText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
    },
    inputContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        alignItems: 'flex-end',
    },
    messageInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        backgroundColor: '#f8f9fa',
    },
    sendButton: {
        backgroundColor: '#7b1fa2',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        marginLeft: 10,
    },
    sendButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
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
});

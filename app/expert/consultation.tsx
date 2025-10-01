import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface Student {
    id: string;
    user_name: string;
    registration_number: string;
    email: string;
    course: string;
}

interface ChatMessage {
    id: string;
    sender_id: string;
    receiver_id: string;
    sender_name: string;
    sender_type: 'EXPERT' | 'STUDENT' | 'PEER' | 'ADMIN';
    message: string;
    created_at: string;
    is_read?: boolean;
}

interface GroupedConversation {
    sender_id: string;
    sender_name: string;
    sender_type: string;
    latest_message: string;
    latest_timestamp: string;
    message_count: number;
    is_read?: boolean;
}

export default function ConsultationPage() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        studentName?: string;
        studentReg?: string;
        studentEmail?: string;
        expertReg?: string;
    }>();

    const [searchText, setSearchText] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [groupedConversations, setGroupedConversations] = useState<GroupedConversation[]>([]);
    const [activeTab, setActiveTab] = useState<'students' | 'messages'>('messages'); // Default to messages
    const [expertInfo, setExpertInfo] = useState({
        name: '',
        registration: ''
    });

    // Load expert info and students on component mount
    useEffect(() => {
        loadExpertInfo();
        loadStudents();
    }, []);

    // Load messages when expert info is available
    useEffect(() => {
        if (expertInfo.registration) {
            loadMessages();
        }
    }, [expertInfo.registration]);

    // Set up real-time subscription for new messages
    useEffect(() => {
        if (!expertInfo.registration) return;

        const channel = supabase
            .channel(`expert_messages_${expertInfo.registration}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${expertInfo.registration}`,
                },
                (payload) => {
                    console.log('New message received:', payload);
                    const newMessage = payload.new as ChatMessage;
                    setMessages(prev => {
                        const exists = prev.some(msg => msg.id === newMessage.id);
                        if (exists) return prev;
                        const updatedMessages = [newMessage, ...prev];

                        // Update grouped conversations
                        const grouped = groupMessagesBySender(updatedMessages);
                        setGroupedConversations(grouped);

                        return updatedMessages;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [expertInfo.registration]);

    // Filter students based on search text
    useEffect(() => {
        if (searchText.trim() === '') {
            setFilteredStudents(students);
        } else {
            const filtered = students.filter(student =>
                student.registration_number.toLowerCase().includes(searchText.toLowerCase()) ||
                student.user_name.toLowerCase().includes(searchText.toLowerCase()) ||
                student.email.toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredStudents(filtered);
        }
    }, [searchText, students]);

    const loadExpertInfo = async () => {
        try {
            let regNo = params.expertReg;
            if (!regNo) {
                const storedReg = await AsyncStorage.getItem('currentExpertReg');
                if (storedReg) regNo = storedReg;
            }

            if (regNo) {
                const storedName = await AsyncStorage.getItem('currentExpertName');
                setExpertInfo({
                    name: storedName || 'Expert',
                    registration: regNo
                });
            }
        } catch (error) {
            console.error('Error loading expert info:', error);
        }
    };

    const loadStudents = async () => {
        try {
            // Load students from Supabase
            const { data: studentsData, error } = await supabase
                .from('students')
                .select('*')
                .order('user_name');

            if (error) {
                console.error('Error loading students:', error);
                setStudents([]);
            } else if (studentsData) {
                setStudents(studentsData);
                setFilteredStudents(studentsData);
            }
        } catch (error) {
            console.error('Error loading students:', error);
            setStudents([]);
        }
    };

    const groupMessagesBySender = (messages: ChatMessage[]): GroupedConversation[] => {
        const grouped = messages.reduce((acc, message) => {
            const senderId = message.sender_id;

            if (!acc[senderId]) {
                acc[senderId] = {
                    sender_id: senderId,
                    sender_name: message.sender_name,
                    sender_type: message.sender_type,
                    latest_message: message.message,
                    latest_timestamp: message.created_at,
                    message_count: 1,
                    is_read: message.is_read
                };
            } else {
                // Check if this message is more recent
                const currentTimestamp = new Date(message.created_at);
                const latestTimestamp = new Date(acc[senderId].latest_timestamp);

                if (currentTimestamp > latestTimestamp) {
                    acc[senderId].latest_message = message.message;
                    acc[senderId].latest_timestamp = message.created_at;
                }
                acc[senderId].message_count += 1;
            }

            return acc;
        }, {} as Record<string, GroupedConversation>);

        // Convert to array and sort by latest timestamp
        return Object.values(grouped).sort((a, b) =>
            new Date(b.latest_timestamp).getTime() - new Date(a.latest_timestamp).getTime()
        );
    };

    const loadMessages = async () => {
        try {
            if (!expertInfo.registration) return;

            // Load messages where expert is the receiver (messages sent to expert)
            const { data: messagesData, error } = await supabase
                .from('messages')
                .select('*')
                .eq('receiver_id', expertInfo.registration)
                .order('created_at', { ascending: false }) // Most recent first
                .limit(1000); // Limit to last 1000 messages

            if (error) {
                console.error('Error loading messages:', error);
                setMessages([]);
                setGroupedConversations([]);
            } else if (messagesData) {
                setMessages(messagesData);
                // Group messages by sender
                const grouped = groupMessagesBySender(messagesData);
                setGroupedConversations(grouped);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            setMessages([]);
            setGroupedConversations([]);
        }
    };

    const handleSearch = () => {
        if (searchText.trim() === '') {
            Alert.alert('Search', 'Please enter a roll number or name to search');
            return;
        }

        const resultCount = filteredStudents.length;
        Alert.alert(
            'Search Results',
            `Found ${resultCount} student${resultCount !== 1 ? 's' : ''} matching "${searchText}"`
        );
    };

    const selectStudent = (student: Student) => {
        // Navigate to dedicated chat page with student information
        router.push({
            pathname: './expert-chat',
            params: {
                studentId: student.id,
                studentName: student.user_name,
                studentReg: student.registration_number,
                studentEmail: student.email,
                studentCourse: student.course,
                expertReg: expertInfo.registration,
                expertName: expertInfo.name
            }
        });
    };

    const renderStudentItem = ({ item }: { item: Student }) => (
        <TouchableOpacity
            style={styles.studentItem}
            onPress={() => selectStudent(item)}
        >
            <View style={styles.studentInfo}>
                <Text style={styles.studentName}>👨‍🎓 {item.user_name}</Text>
                <Text style={styles.studentDetails}>
                    Roll No: {item.registration_number}
                </Text>
                <Text style={styles.studentDetails}>
                    Course: {item.course || 'N/A'}
                </Text>
                <Text style={styles.studentDetails}>
                    Email: {item.email || 'N/A'}
                </Text>
            </View>
            <Text style={styles.selectButton}>💬 Chat</Text>
        </TouchableOpacity>
    );

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

    const renderConversationItem = ({ item }: { item: GroupedConversation }) => (
        <TouchableOpacity
            style={styles.messageListItem}
            onPress={() => {
                // Navigate to chat with the student
                router.push({
                    pathname: './expert-chat',
                    params: {
                        studentReg: item.sender_id,
                        studentName: item.sender_name,
                        expertReg: expertInfo.registration,
                        expertName: expertInfo.name
                    }
                });
            }}
        >
            <View style={styles.messageListHeader}>
                <View style={styles.messageInfo}>
                    <Text style={styles.messageSender}>
                        👨‍🎓 {item.sender_name}
                    </Text>
                    <Text style={styles.messageTime}>
                        {formatTimestamp(item.latest_timestamp)}
                    </Text>
                </View>
                <View style={styles.messageActions}>
                    <Text style={styles.messageCount}>
                        {item.message_count > 1 ? `${item.message_count} msgs` : '1 msg'}
                    </Text>
                    <Text style={styles.messageType}>
                        {item.sender_type === 'STUDENT' ? '💬' : '👥'}
                    </Text>
                </View>
            </View>
            <Text style={styles.messagePreview} numberOfLines={2}>
                {item.latest_message}
            </Text>
            <Text style={styles.messageId}>ID: {item.sender_id}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>� Consultation</Text>
                <Text style={styles.headerSubtitle}>
                    {activeTab === 'messages' ? 'Recent messages from students' : 'Search by roll number or name'}
                </Text>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'messages' && styles.activeTab]}
                    onPress={() => setActiveTab('messages')}
                >
                    <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
                        � Conversations ({groupedConversations.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'students' && styles.activeTab]}
                    onPress={() => setActiveTab('students')}
                >
                    <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>
                        👨‍🎓 Students ({students.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search Section - Only show for students tab */}
            {activeTab === 'students' && (
                <View style={styles.searchContainer}>
                    <View style={styles.searchBox}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by roll number or name..."
                            placeholderTextColor="#999"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={handleSearch}
                        >
                            <Text style={styles.searchButtonText}>Search</Text>
                        </TouchableOpacity>
                    </View>
                    {searchText.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchText('')}
                            style={styles.clearSearchButton}
                        >
                            <Text style={styles.clearSearchText}>Clear Search</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Main Content Area */}
            <View style={styles.messagesArea}>
                {activeTab === 'messages' ? (
                    // Messages Tab
                    groupedConversations.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📧</Text>
                            <Text style={styles.emptyTitle}>No Messages</Text>
                            <Text style={styles.emptyText}>
                                No messages received from students yet. Students can send you messages from the student-calm page.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={groupedConversations}
                            renderItem={renderConversationItem}
                            keyExtractor={(item) => item.sender_id}
                            showsVerticalScrollIndicator={false}
                            style={styles.messagesList}
                        />
                    )
                ) : (
                    // Students Tab
                    filteredStudents.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            {searchText.length > 0 ? (
                                <>
                                    <Text style={styles.emptyIcon}>🔍</Text>
                                    <Text style={styles.emptyTitle}>No Students Found</Text>
                                    <Text style={styles.emptyText}>
                                        No students found matching "{searchText}"
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.emptyIcon}>👨‍🎓</Text>
                                    <Text style={styles.emptyTitle}>Find Students</Text>
                                    <Text style={styles.emptyText}>
                                        Search for students by their roll number or name to start a conversation.
                                    </Text>
                                </>
                            )}
                        </View>
                    ) : (
                        <FlatList
                            data={filteredStudents}
                            renderItem={renderStudentItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            style={styles.messagesList}
                        />
                    )
                )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {activeTab === 'messages'
                        ? `${messages.length} message${messages.length !== 1 ? 's' : ''} received`
                        : searchText
                            ? `${filteredStudents.length} students found`
                            : `${students.length} total students`
                    }
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
    searchButton: {
        backgroundColor: '#7b1fa2',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginLeft: 10,
    },
    searchButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    clearSearchButton: {
        alignSelf: 'center',
        marginTop: 10,
        padding: 5,
    },
    clearSearchText: {
        color: '#7b1fa2',
        fontSize: 14,
        fontWeight: 'bold',
    },
    messagesArea: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    messagesList: {
        flex: 1,
        paddingHorizontal: 20,
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
    studentItem: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingHorizontal: 20,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    studentDetails: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    selectButton: {
        backgroundColor: '#7b1fa2',
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        textAlign: 'center',
        overflow: 'hidden',
    },
    // Tab Styles
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#7b1fa2',
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#999',
    },
    activeTabText: {
        color: '#7b1fa2',
    },
    // Message List Item Styles
    messageListItem: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginVertical: 2,
    },
    messageListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    messageInfo: {
        flex: 1,
    },
    messageSender: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    messageTime: {
        fontSize: 12,
        color: '#999',
    },
    messageType: {
        fontSize: 20,
    },
    messagePreview: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 8,
    },
    messageId: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    messageActions: {
        alignItems: 'flex-end',
    },
    messageCount: {
        fontSize: 12,
        color: '#7b1fa2',
        fontWeight: 'bold',
        marginBottom: 4,
    },
});

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
    user_type?: string; // Add user_type to distinguish between Student and Peer
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
    const [searchType, setSearchType] = useState<'all' | 'registration'>('all'); // Add search type state
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [groupedConversations, setGroupedConversations] = useState<GroupedConversation[]>([]);
    const [activeTab, setActiveTab] = useState<'students' | 'messages'>('messages'); // Default to messages
    const [expertInfo, setExpertInfo] = useState({
        name: '',
        registration: ''
    });

    // Load expert info on component mount
    useEffect(() => {
        loadExpertInfo();
    }, []);

    // Load messages when expert info is available
    useEffect(() => {
        if (expertInfo.registration) {
            loadMessages();
        }
    }, [expertInfo.registration]);

    // Load students after conversations are updated
    useEffect(() => {
        loadStudents();
    }, [groupedConversations]);

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
            // Initially show empty state - students will be loaded only when searched
            setStudents([]);
            setFilteredStudents([]);
        } catch (error) {
            console.error('Error initializing students:', error);
            setStudents([]);
            setFilteredStudents([]);
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

    const handleSearch = async () => {
        if (searchText.trim() === '') {
            Alert.alert('Search', 'Please enter a search term');
            return;
        }

        try {
            let query = supabase
                .from('user_requests')
                .select('*')
                .eq('user_type', 'Student');

            // Build search query based on search type
            if (searchType === 'registration') {
                // Search only by registration number
                query = query.ilike('registration_number', `%${searchText.trim()}%`);
            } else {
                // Search by registration number, name, or email
                query = query.or(`registration_number.ilike.%${searchText.trim()}%,user_name.ilike.%${searchText.trim()}%,email.ilike.%${searchText.trim()}%`);
            }

            const { data: searchResults, error } = await query;

            if (error) {
                console.error('Error searching students:', error);
                Alert.alert('Search Error', 'Failed to search for students. Please try again.');
                return;
            }

            if (searchResults && searchResults.length > 0) {
                // Convert search results to Student format
                const foundStudents: Student[] = searchResults.map(result => ({
                    id: result.registration_number,
                    user_name: result.user_name,
                    registration_number: result.registration_number,
                    email: result.email || '',
                    course: result.course || 'Not specified',
                    user_type: result.user_type
                }));

                setStudents(foundStudents);
                setFilteredStudents(foundStudents);

                const studentCount = foundStudents.length;
                const resultMessage = `Found ${studentCount} student${studentCount !== 1 ? 's' : ''} matching "${searchText}"`;

                Alert.alert('Search Results', resultMessage);
            } else {
                // No results found
                setStudents([]);
                setFilteredStudents([]);

                const searchField = searchType === 'registration' ? 'registration number' : 'name, email, or registration number';
                Alert.alert(
                    'No Students Found',
                    `No students found with ${searchField} matching "${searchText}". Please check your search term and try again.`,
                    [
                        { text: 'OK' },
                        {
                            text: 'Clear Search',
                            onPress: () => setSearchText('')
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Error during search:', error);
            Alert.alert('Search Error', 'An unexpected error occurred. Please try again.');
        }
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

    const renderStudentItem = ({ item, index }: { item: Student; index: number }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => selectStudent(item)}
            activeOpacity={0.7}
        >
            <View style={styles.userCardHeader}>
                <View style={styles.userIconContainer}>
                    <Text style={styles.userIcon}>‍🎓</Text>
                </View>
                <View style={styles.userCardInfo}>
                    <Text style={styles.userName}>{item.user_name}</Text>
                    <View style={styles.userTypeBadgeContainer}>
                        <Text style={[styles.userTypeBadgeNew, styles.studentBadge]}>
                            STUDENT
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.userCardBody}>
                <View style={styles.userDetailRow}>
                    <Text style={styles.userDetailLabel}>📋 Registration:</Text>
                    <Text style={styles.userDetailValue}>{item.registration_number}</Text>
                </View>
                <View style={styles.userDetailRow}>
                    <Text style={styles.userDetailLabel}>📚 Course:</Text>
                    <Text style={styles.userDetailValue}>{item.course || 'Not specified'}</Text>
                </View>
                <View style={styles.userDetailRow}>
                    <Text style={styles.userDetailLabel}>📧 Email:</Text>
                    <Text style={styles.userDetailValue} numberOfLines={1}>{item.email || 'Not provided'}</Text>
                </View>
            </View>
            <View style={styles.userCardFooter}>
                <View style={styles.chatButtonContainer}>
                    <Text style={styles.chatButtonText}>💬 Start Chat</Text>
                    <Text style={styles.chatButtonArrow}>→</Text>
                </View>
            </View>
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
                    {activeTab === 'messages' ? 'Recent messages from students' : 'Enter student ID, name, or email to find students'}
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
                    {/* Search Type Selector */}
                    <View style={styles.searchTypeContainer}>
                        <TouchableOpacity
                            style={[styles.searchTypeButton, searchType === 'all' && styles.activeSearchType]}
                            onPress={() => setSearchType('all')}
                        >
                            <Text style={[styles.searchTypeText, searchType === 'all' && styles.activeSearchTypeText]}>
                                🔍 All Fields
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.searchTypeButton, searchType === 'registration' && styles.activeSearchType]}
                            onPress={() => setSearchType('registration')}
                        >
                            <Text style={[styles.searchTypeText, searchType === 'registration' && styles.activeSearchTypeText]}>
                                🎓 Reg. Number
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBox}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder={
                                searchType === 'registration'
                                    ? "Enter registration number to search..."
                                    : "Enter student ID, name, or email to chat..."
                            }
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
                            onPress={() => {
                                setSearchText('');
                                setStudents([]);
                                setFilteredStudents([]);
                            }}
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
                                        No students found matching &quot;{searchText}&quot;
                                    </Text>
                                    <Text style={styles.emptySubtext}>
                                        Try searching with different keywords or check the search type filter.
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.emptyIcon}>👨‍🎓</Text>
                                    <Text style={styles.emptyTitle}>Search for Students</Text>
                                    <Text style={styles.emptyText}>
                                        Enter a student ID, name, or email in the search box above to find and connect with students.
                                    </Text>
                                    <View style={styles.searchHintContainer}>
                                        <Text style={styles.searchHintTitle}>💡 Search Tips:</Text>
                                        <Text style={styles.searchHint}>• Use &quot;All Fields&quot; for broad search</Text>
                                        <Text style={styles.searchHint}>• Use &quot;Reg. Number&quot; for exact match</Text>
                                        <Text style={styles.searchHint}>• Partial matches are supported</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    ) : (
                        <View style={styles.resultsContainer}>
                            <View style={styles.resultsHeader}>
                                <Text style={styles.resultsCount}>
                                    Found {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                                </Text>
                                <Text style={styles.resultsSubtext}>
                                    Showing all matching student records
                                </Text>
                            </View>
                            <FlatList
                                data={filteredStudents}
                                renderItem={renderStudentItem}
                                keyExtractor={(item, index) => `${item.id}-${item.registration_number}-${index}`}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.userListContainer}
                                ItemSeparatorComponent={() => <View style={styles.userCardSeparator} />}
                            />
                        </View>
                    )
                )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {activeTab === 'messages'
                        ? `${messages.length} message${messages.length !== 1 ? 's' : ''} received`
                        : searchText
                            ? `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''} found`
                            : `Search for students to start chatting`
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
    searchTypeContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 20,
        padding: 4,
    },
    searchTypeButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        alignItems: 'center',
    },
    activeSearchType: {
        backgroundColor: '#7b1fa2',
    },
    searchTypeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    },
    activeSearchTypeText: {
        color: '#ffffff',
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
    userTypeBadge: {
        fontSize: 12,
        fontWeight: 'normal',
        color: '#7b1fa2',
        fontStyle: 'italic',
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
    // New User Card Styles
    resultsContainer: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    resultsHeader: {
        backgroundColor: '#7b1fa2',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    resultsCount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },
    resultsSubtext: {
        fontSize: 13,
        color: '#e1bee7',
    },
    userListContainer: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    userCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginVertical: 6,
        elevation: 3,
        shadowColor: '#7b1fa2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#7b1fa2',
        overflow: 'hidden',
    },
    userCardSeparator: {
        height: 4,
    },
    userCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 10,
        backgroundColor: '#f9f5fb',
        borderBottomWidth: 1,
        borderBottomColor: '#e1bee7',
    },
    userIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#7b1fa2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    userIcon: {
        fontSize: 28,
    },
    userCardInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
    },
    userTypeBadgeContainer: {
        alignSelf: 'flex-start',
    },
    userTypeBadgeNew: {
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    studentBadge: {
        backgroundColor: '#e1bee7',
        color: '#6a1b9a',
    },
    peerBadge: {
        backgroundColor: '#b39ddb',
        color: '#4a148c',
    },
    userCardBody: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
    },
    userDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 4,
    },
    userDetailLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#7b1fa2',
        width: 110,
    },
    userDetailValue: {
        fontSize: 13,
        color: '#555',
        flex: 1,
        fontWeight: '500',
    },
    userCardFooter: {
        backgroundColor: '#f3e5f5',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#e1bee7',
    },
    chatButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7b1fa2',
        paddingVertical: 10,
        borderRadius: 8,
    },
    chatButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: 'bold',
        marginRight: 8,
    },
    chatButtonArrow: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
    searchHintContainer: {
        marginTop: 20,
        backgroundColor: '#f3e5f5',
        padding: 15,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#7b1fa2',
    },
    searchHintTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#7b1fa2',
        marginBottom: 8,
    },
    searchHint: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
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

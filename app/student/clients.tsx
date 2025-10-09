import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

interface SessionRequest {
  id: string;
  expertName: string;
  expertReg: string;
  session_date: string;
  session_time: string;
  booking_mode?: 'online' | 'offline';
  status: 'pending' | 'approved' | 'rejected';
  updated_at: string;
  notes?: string;
  student_name?: string;
  student_registration?: string;
}

export default function StudentClientsPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [studentRegNo, setStudentRegNo] = useState('');
  const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStudentInfo();
  }, []);

  useEffect(() => {
    if (studentRegNo) {
      loadSessionRequests();
    }
  }, [studentRegNo]);

  const loadStudentInfo = async () => {
    try {
      const storedReg = await AsyncStorage.getItem('currentStudentReg');
      const storedData = await AsyncStorage.getItem('currentStudentData');
      
      if (storedReg) setStudentRegNo(storedReg);
      if (storedData) {
        const data = JSON.parse(storedData);
        setStudentName(data.name || data.user_name || '');
      }
    } catch (error) {
      console.error('Error loading student info:', error);
    }
  };

  const loadSessionRequests = async () => {
    setLoading(true);
    try {
      console.log('Loading session requests for student:', studentRegNo);

      // Load all session requests for this student
      const { data, error } = await supabase
        .from('book_request')
        .select('*')
        .eq('student_registration', studentRegNo)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading session requests:', error);
        setSessionRequests([]);
        setFilteredSessions([]);
      } else if (data) {
        console.log('Successfully loaded session requests:', data.length);
        const transformedSessions: SessionRequest[] = data.map(session => ({
          id: session.id?.toString() || `session_${Math.random()}`,
          expertName: session.expert_name || 'Unknown Expert',
          expertReg: session.expert_registration || 'N/A',
          session_date: session.session_date || '',
          session_time: session.session_time || '',
          booking_mode: session.booking_mode || undefined,
          status: session.status || 'pending',
          updated_at: session.updated_at || session.created_at || '',
          notes: session.notes || '',
          student_name: session.student_name || '',
          student_registration: session.student_registration || ''
        }));
        setSessionRequests(transformedSessions);
        setFilteredSessions(transformedSessions);
      }
    } catch (error) {
      console.error('Error loading session requests:', error);
      setSessionRequests([]);
      setFilteredSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredSessions(sessionRequests);
      return;
    }

    const q = text.toLowerCase();
    const filtered = sessionRequests.filter(s =>
      (s.expertName || '').toLowerCase().includes(q) ||
      (s.expertReg || '').toLowerCase().includes(q) ||
      (s.status || '').toLowerCase().includes(q)
    );
    setFilteredSessions(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessionRequests();
  };

  const handleCancel = async (session: SessionRequest) => {
    Alert.alert(
      'Cancel Session Request',
      `Are you sure you want to cancel your session request with ${session.expertName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('book_request')
                .delete()
                .eq('id', session.id);

              if (error) {
                console.error('Error canceling session:', error);
                Alert.alert('Error', 'Failed to cancel session. Please try again.');
              } else {
                Alert.alert('Success', 'Session request canceled successfully.');
                await loadSessionRequests();
              }
            } catch (err) {
              console.error('Error:', err);
              Alert.alert('Error', 'An error occurred. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDelete = async (session: SessionRequest) => {
    Alert.alert(
      'Delete Session Request',
      `Are you sure you want to permanently delete this session request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('book_request')
                .delete()
                .eq('id', session.id);

              if (error) {
                console.error('Error deleting session:', error);
                Alert.alert('Error', 'Failed to delete session. Please try again.');
              } else {
                Alert.alert('Success', 'Session request deleted successfully.');
                await loadSessionRequests();
              }
            } catch (err) {
              console.error('Error:', err);
              Alert.alert('Error', 'An error occurred. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '📋';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleChatWithExpert = (session: SessionRequest) => {
    // Navigate to chat page with expert details
    router.push({
      pathname: '/student/chat',
      params: {
        studentReg: studentRegNo,
        studentName: studentName,
        expertName: session.expertName,
        expertReg: session.expertReg
      }
    });
  };

  const renderSessionCard = (session: SessionRequest, index: number) => (
    <View key={`session-${session.id}-${index}`} style={styles.sessionCard}>
      {/* Status Badge and Chat Button */}
      <View style={styles.sessionHeader}>
        <View style={[styles.sessionStatusBadge, { backgroundColor: getStatusColor(session.status) + '20' }]}>
          <Text style={styles.sessionStatusIcon}>{getStatusIcon(session.status)}</Text>
          <Text style={[styles.sessionStatusText, { color: getStatusColor(session.status) }]}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Text>
        </View>
        {session.status === 'approved' && (
          <TouchableOpacity
            style={styles.chatIconButton}
            onPress={() => handleChatWithExpert(session)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Expert Information */}
      <View style={styles.expertSection}>
        <Text style={styles.sectionLabel}>Expert Details</Text>
        <View style={styles.expertInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={18} color={Colors.primary} />
            <Text style={styles.expertName}>{session.expertName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={18} color="#666" />
            <Text style={styles.infoText}>ID: {session.expertReg}</Text>
          </View>
        </View>
      </View>

      {/* Session Details */}
      <View style={styles.sessionSection}>
        <Text style={styles.sectionLabel}>Session Details</Text>
        <View style={styles.sessionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(session.session_date)}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>⏰</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{session.session_time || 'Not specified'}</Text>
            </View>
          </View>
          {session.booking_mode && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>{session.booking_mode === 'online' ? '🌐' : '🏢'}</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Mode</Text>
                <Text style={styles.detailValue}>
                  {session.booking_mode === 'online' ? 'Online Session' : 'Offline Session'}
                </Text>
              </View>
            </View>
          )}
          {session.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📝</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{session.notes}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Request Info */}
      <View style={styles.requestInfo}>
        <Text style={styles.requestedAt}>
          Last Updated: {formatDate(session.updated_at)}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {session.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancel(session)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Cancel Request</Text>
          </TouchableOpacity>
        )}

        {session.status !== 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(session)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Session Requests</Text>
          <Text style={styles.headerSubtitle}>
            {(searchQuery ? filteredSessions.length : sessionRequests.length)} request{(searchQuery ? filteredSessions.length : sessionRequests.length) !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by expert name, ID, or status..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Session Requests List */}
        <View style={styles.clientsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{searchQuery ? 'Search Results' : 'All My Requests'}</Text>
            <View style={styles.clientCount}>
              <Text style={styles.clientCountText}>{searchQuery ? filteredSessions.length : sessionRequests.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading your session requests...</Text>
            </View>
          ) : sessionRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>No Session Requests</Text>
              <Text style={styles.emptyText}>
                You haven't made any session requests yet.{'\n'}
                Book a session with an expert to get started!
              </Text>
            </View>
          ) : (filteredSessions.length === 0 && !!searchQuery) ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>No Results Found</Text>
              <Text style={styles.emptyText}>
                No session requests match your search for "{searchQuery}".{'\n'}
                Try searching by expert name, ID, or status.
              </Text>
            </View>
          ) : (
            filteredSessions.map((session, index) => renderSessionCard(session, index))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e0e0',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 5,
    marginLeft: 10,
  },
  clientsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  clientCount: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  clientCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
  },
  sessionHeader: {
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  chatIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.accentLight || '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sessionStatusIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  sessionStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expertSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  expertInfo: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  expertName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    flex: 1,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    flex: 1,
    marginLeft: 8,
  },
  sessionDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailIcon: {
    fontSize: 20,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  requestInfo: {
    marginBottom: 16,
  },
  requestedAt: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  deleteButton: {
    backgroundColor: '#9E9E9E',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

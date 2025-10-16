import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

interface ClientSession {
  id: string;
  studentName: string;
  studentReg: string;
  session_date: string;
  session_time: string;
  booking_mode?: 'online' | 'offline';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  created_at: string;
}

export default function PeerClientsPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration?: string }>();
  const [peerName, setPeerName] = useState('');
  const [peerReg, setPeerReg] = useState('');
  const [clients, setClients] = useState<ClientSession[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'approved' | 'completed'>('all');

  useEffect(() => {
    loadPeerInfo();
  }, []);

  useEffect(() => {
    if (peerReg) {
      loadClients();
    }
  }, [peerReg]);

  useEffect(() => {
    filterClients();
  }, [clients, searchQuery, selectedFilter]);

  const loadPeerInfo = async () => {
    try {
      let regNo = params.registration;
      
      if (!regNo) {
        const storedReg = await AsyncStorage.getItem('currentStudentReg');
        regNo = storedReg || undefined;
      }
      
      const storedData = await AsyncStorage.getItem('currentStudentData');
      
      if (regNo) setPeerReg(regNo);
      
      if (storedData) {
        const data = JSON.parse(storedData);
        setPeerName(data.name || data.user_name || '');
      }
    } catch (error) {
      console.error('Error loading peer info:', error);
    }
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      // Load sessions where peer listener is the expert
      const { data, error } = await supabase
        .from('book_request')
        .select('*')
        .eq('expert_registration', peerReg)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading clients:', error);
        Alert.alert('Error', 'Failed to load client sessions');
        setClients([]);
      } else if (data) {
        const transformedClients: ClientSession[] = data.map(session => ({
          id: session.id?.toString() || `session_${Math.random()}`,
          studentName: session.user_name || session.student_name || 'Unknown Student',
          studentReg: session.registration_number || session.student_registration || 'N/A',
          session_date: session.session_date || '',
          session_time: session.session_time || '',
          booking_mode: session.booking_mode || undefined,
          status: session.status || 'pending',
          notes: session.notes || session.reason || '',
          created_at: session.created_at || ''
        }));
        setClients(transformedClients);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Error', 'An error occurred while loading clients');
      setClients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(c => c.status === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.studentName.toLowerCase().includes(q) ||
        c.studentReg.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
      );
    }

    setFilteredClients(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClients();
  };

  const handleApprove = async (clientId: string) => {
    Alert.alert(
      'Approve Session',
      'Are you sure you want to approve this session request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('book_request')
                .update({ status: 'approved' })
                .eq('id', clientId);

              if (error) {
                console.error('Error approving session:', error);
                Alert.alert('Error', 'Failed to approve session');
              } else {
                Alert.alert('Success', 'Session approved successfully');
                await loadClients();
              }
            } catch (err) {
              console.error('Error:', err);
              Alert.alert('Error', 'An error occurred');
            }
          }
        }
      ]
    );
  };

  const handleReject = async (clientId: string) => {
    Alert.alert(
      'Reject Session',
      'Are you sure you want to reject this session request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('book_request')
                .update({ status: 'rejected' })
                .eq('id', clientId);

              if (error) {
                console.error('Error rejecting session:', error);
                Alert.alert('Error', 'Failed to reject session');
              } else {
                Alert.alert('Success', 'Session rejected');
                await loadClients();
              }
            } catch (err) {
              console.error('Error:', err);
              Alert.alert('Error', 'An error occurred');
            }
          }
        }
      ]
    );
  };

  const handleComplete = async (clientId: string) => {
    Alert.alert(
      'Mark as Completed',
      'Mark this session as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('book_request')
                .update({ status: 'completed' })
                .eq('id', clientId);

              if (error) {
                console.error('Error completing session:', error);
                Alert.alert('Error', 'Failed to mark session as completed');
              } else {
                Alert.alert('Success', 'Session marked as completed');
                await loadClients();
              }
            } catch (err) {
              console.error('Error:', err);
              Alert.alert('Error', 'An error occurred');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'completed': return '#2196F3';
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Clients</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or registration..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'pending', 'approved', 'completed'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.filterTabActive
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter && styles.filterTextActive
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      ) : filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No matching clients found' : 'No client sessions yet'}
          </Text>
          <Text style={styles.emptySubText}>
            {searchQuery
              ? 'Try adjusting your search'
              : 'Client session requests will appear here'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredClients.map((client) => (
            <View key={client.id} style={styles.clientCard}>
              {/* Client Header */}
              <View style={styles.clientHeader}>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.studentName}</Text>
                  <Text style={styles.clientReg}>Reg: {client.studentReg}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(client.status) + '20' }
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(client.status) }
                    ]}
                  >
                    {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Session Details */}
              <View style={styles.sessionDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color={Colors.primary} />
                  <Text style={styles.detailText}>{formatDate(client.session_date)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color={Colors.primary} />
                  <Text style={styles.detailText}>{formatTime(client.session_time)}</Text>
                </View>
                {client.booking_mode && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name={client.booking_mode === 'online' ? 'videocam' : 'person'}
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.detailText}>
                      {client.booking_mode === 'online' ? 'Online Session' : 'In-Person Session'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Notes */}
              {client.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{client.notes}</Text>
                </View>
              )}

              {/* Action Buttons */}
              {client.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(client.id)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(client.id)}
                  >
                    <Ionicons name="close-circle" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {client.status === 'approved' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => handleComplete(client.id)}
                >
                  <Ionicons name="checkmark-done" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Mark as Completed</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  filterContainer: {
    marginBottom: 15,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  clientCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  clientReg: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sessionDetails: {
    backgroundColor: Colors.backgroundLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  notesContainer: {
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
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
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

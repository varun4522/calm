import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

interface Patient {
  id: string;
  user_name: string;
  registration_number: string;
  course?: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

export default function ExpertClientPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration?: string }>();
  const [expertName, setExpertName] = useState('');
  const [expertRegNo, setExpertRegNo] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadExpertInfo();
    loadPatients();
  }, []);

  const loadExpertInfo = async () => {
    try {
      let regNo = params.registration;
      if (!regNo) {
        const storedReg = await AsyncStorage.getItem('currentExpertReg');
        if (storedReg) regNo = storedReg;
      }

      if (regNo) {
        setExpertRegNo(regNo);
        const storedName = await AsyncStorage.getItem('currentExpertName');
        if (storedName) {
          setExpertName(storedName);
        }
      }
    } catch (error) {
      console.error('Error loading expert info:', error);
    }
  };

  const loadPatients = async () => {
    setLoading(true);
    try {
      console.log('Loading patients from user_requests table...');
      const { data: studentsData, error } = await supabase
        .from('user_requests')
        .select('*')
        .in('user_type', ['Student', 'Peer Listener'])
        .order('user_name');

      if (error) {
        console.error('Error loading patients from user_requests:', error);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('students')
          .select('*')
          .order('user_name');

        if (fallbackError) {
          console.error('Error loading patients from students table:', fallbackError);
          setPatients([]);
          setFilteredPatients([]);
        }
      } else if (studentsData) {
        console.log('Successfully loaded patients from user_requests table:', studentsData.length);
        const transformedPatients = studentsData.map(student => ({
          id: student.id?.toString() || student.registration_number || `student_${Math.random()}`,
          user_name: student.user_name || 'Unknown Student',
          registration_number: student.registration_number || 'N/A',
          course: student.course || student.specialization || 'N/A',
          email: student.email || '',
          phone: student.phone || '',
          created_at: student.created_at || ''
        }));
        setPatients(transformedPatients);
        setFilteredPatients(transformedPatients);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const q = text.toLowerCase();
    const filtered = patients.filter(p =>
      (p.user_name || '').toLowerCase().includes(q) ||
      (p.registration_number || '').toLowerCase().includes(q)
    );
    setFilteredPatients(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const navigateToChat = (patient: Patient) => {
    router.push({
      pathname: './expert-chat',
      params: {
        studentId: patient.id,
        studentName: patient.user_name,
        studentReg: patient.registration_number,
        studentEmail: patient.email,
        studentCourse: patient.course,
        expertReg: expertRegNo,
        expertName: expertName
      }
    });
  };

  const renderPatientCard = (patient: Patient, index: number) => (
    <View key={`patient-${patient.id}-${index}`} style={styles.patientCard}>
      <View style={styles.patientHeader}>
        <View style={styles.patientNameSection}>
          <Text style={styles.patientName}>👨‍🎓 {patient.user_name}</Text>
          <Text style={styles.patientId}>ID: {patient.registration_number}</Text>
        </View>
      </View>

      <View style={styles.patientInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="book-outline" size={16} color={Colors.primary} />
          <Text style={styles.patientDetail}>{patient.course || 'Course not specified'}</Text>
        </View>

        {patient.email && (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={Colors.primary} />
            <Text style={styles.patientDetail}>{patient.email}</Text>
          </View>
        )}

        {patient.phone && (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={Colors.primary} />
            <Text style={styles.patientDetail}>{patient.phone}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigateToChat(patient)}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.chatButtonText}>Start Chat</Text>
        </TouchableOpacity>

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
          <Text style={styles.headerTitle}>My Clients</Text>
          <Text style={styles.headerSubtitle}>
            {(searchQuery ? filteredPatients.length : patients.length)} client{(searchQuery ? filteredPatients.length : patients.length) !== 1 ? 's' : ''} {searchQuery ? 'found' : 'registered'}
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
              placeholder="Search by name or registration number..."
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

        {/* Clients List */}
        <View style={styles.clientsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{searchQuery ? 'Search Results' : 'Active Clients'}</Text>
            <View style={styles.clientCount}>
              <Text style={styles.clientCountText}>{searchQuery ? filteredPatients.length : patients.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading clients...</Text>
            </View>
          ) : patients.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Clients Yet</Text>
              <Text style={styles.emptyText}>
                Students will appear here once they register for consultations.
                Pull down to refresh the list.
              </Text>
            </View>
          ) : (filteredPatients.length === 0 && !!searchQuery) ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Results Found</Text>
              <Text style={styles.emptyText}>
                No clients match your search for "{searchQuery}".
                Try searching by name or registration number.
              </Text>
            </View>
          ) : (
            filteredPatients.map((patient, index) => renderPatientCard(patient, index))
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
  patientCard: {
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
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  patientNameSection: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 2,
  },
  patientId: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  patientInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientDetail: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  chatButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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
  },
  sessionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  sessionStatusIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  sessionStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionStudentInfo: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionStudentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  sessionStudentReg: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  sessionStudentCourse: {
    fontSize: 14,
    color: '#666',
  },
  sessionDetails: {
    marginBottom: 10,
  },
  sessionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionDetailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 24,
  },
  sessionDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  sessionFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sessionRequestedAt: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

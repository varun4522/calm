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
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

interface ScheduleSlot {
  id: string;
  date: string;
  time: string;
  status: 'available' | 'booked';
  student_name?: string;
  student_registration?: string;
  booking_mode?: 'online' | 'offline';
}

export default function PeerSchedulePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration?: string }>();
  const [peerName, setPeerName] = useState('');
  const [peerReg, setPeerReg] = useState('');
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPeerInfo();
  }, []);

  useEffect(() => {
    if (peerReg) {
      loadSchedules();
    }
  }, [peerReg]);

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

  const loadSchedules = async () => {
    setLoading(true);
    try {
      // Load schedules from expert_schedule table where peer is the expert
      const { data, error } = await supabase
        .from('expert_schedule')
        .select('*')
        .eq('registration', peerReg)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('Error loading schedules:', error);
        Alert.alert('Error', 'Failed to load schedules');
        setSchedules([]);
      } else if (data) {
        // Transform data to match our interface
        const transformedSchedules: ScheduleSlot[] = data.map(slot => ({
          id: slot.id?.toString() || `slot_${Math.random()}`,
          date: slot.date || '',
          time: slot.time || '',
          status: slot.available ? 'available' : 'booked',
          student_name: slot.student_name || undefined,
          student_registration: slot.student_registration || undefined,
          booking_mode: slot.booking_mode || undefined
        }));
        setSchedules(transformedSchedules);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      Alert.alert('Error', 'An error occurred while loading schedules');
      setSchedules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedules();
  };

  const handleAddSchedule = () => {
    Alert.alert(
      'Add Schedule',
      'Schedule management feature coming soon!',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('expert_schedule')
                .delete()
                .eq('id', scheduleId);

              if (error) {
                console.error('Error deleting schedule:', error);
                Alert.alert('Error', 'Failed to delete schedule');
              } else {
                Alert.alert('Success', 'Schedule deleted successfully');
                await loadSchedules();
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
      weekday: 'short',
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
        <Text style={styles.headerTitle}>My Schedule</Text>
        <TouchableOpacity
          onPress={handleAddSchedule}
          style={styles.addButton}
        >
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      ) : schedules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={80} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>No schedules yet</Text>
          <Text style={styles.emptySubText}>
            Add your availability to start accepting bookings
          </Text>
          <TouchableOpacity style={styles.addScheduleButton} onPress={handleAddSchedule}>
            <Text style={styles.addScheduleButtonText}>Add Schedule</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {schedules.map((schedule) => (
            <View key={schedule.id} style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View style={styles.dateTimeContainer}>
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar" size={18} color={Colors.primary} />
                    <Text style={styles.dateText}>{formatDate(schedule.date)}</Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Ionicons name="time" size={18} color={Colors.primary} />
                    <Text style={styles.timeText}>{formatTime(schedule.time)}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    schedule.status === 'available'
                      ? styles.availableBadge
                      : styles.bookedBadge
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      schedule.status === 'available'
                        ? styles.availableText
                        : styles.bookedText
                    ]}
                  >
                    {schedule.status === 'available' ? 'Available' : 'Booked'}
                  </Text>
                </View>
              </View>

              {schedule.status === 'booked' && schedule.student_name && (
                <View style={styles.studentInfo}>
                  <Text style={styles.studentLabel}>Student:</Text>
                  <Text style={styles.studentName}>{schedule.student_name}</Text>
                  {schedule.booking_mode && (
                    <View style={styles.modeContainer}>
                      <Ionicons
                        name={schedule.booking_mode === 'online' ? 'videocam' : 'person'}
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.modeText}>
                        {schedule.booking_mode === 'online' ? 'Online' : 'In-Person'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSchedule(schedule.id)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
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
  addButton: {
    padding: 8,
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
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  addScheduleButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addScheduleButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scheduleCard: {
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
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  dateTimeContainer: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: '#E8F5E9',
  },
  bookedBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  availableText: {
    color: '#2E7D32',
  },
  bookedText: {
    color: '#E65100',
  },
  studentInfo: {
    backgroundColor: Colors.backgroundLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  studentLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 6,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFEBEE',
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

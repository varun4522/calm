import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

interface TimeSlot {
  id?: string;
  student_registration: string;
  student_name: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  booked_by?: string;
  created_at?: string;
}

// Generate default time slots from 9:00 AM to 3:50 PM (50-minute sessions)
const generateDefaultSlots = (): Array<{ start: string; end: string }> => {
  const slots: Array<{ start: string; end: string }> = [];
  // 9:00-9:50, 10:00-10:50, 11:00-11:50, 12:00-12:50, 2:00-2:50, 3:00-3:50
  const hours = [9, 10, 11, 12, 14, 15]; // Skip 13 (1:00 PM)

  hours.forEach(hour => {
    slots.push({
      start: `${hour.toString().padStart(2, '0')}:00:00`,
      end: `${hour.toString().padStart(2, '0')}:50:00`
    });
  });

  return slots;
};

const DEFAULT_SLOTS = generateDefaultSlots();

// Helper function to format date to YYYY-MM-DD in local timezone (no UTC conversion)
const formatDateToLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function StudentSchedulePage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [studentRegNo, setStudentRegNo] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [customSlotModalVisible, setCustomSlotModalVisible] = useState(false);
  const [tableViewModalVisible, setTableViewModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [allSchedules, setAllSchedules] = useState<Map<string, TimeSlot[]>>(new Map());
  const [allSlotsList, setAllSlotsList] = useState<TimeSlot[]>([]);

  // Custom slot form
  const [customSlot, setCustomSlot] = useState({
    startHour: '09',
    startMinute: '00',
    endHour: '09',
    endMinute: '50'
  });

  useEffect(() => {
    loadStudentInfo();
  }, []);

  useEffect(() => {
    if (studentRegNo) {
      loadAllSchedules();
    }
  }, [studentRegNo, currentMonth]);

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

  const loadAllSchedules = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      console.log('📅 Loading schedules for month:', currentMonth.toLocaleDateString());
      console.log('Student Reg:', studentRegNo);
      console.log('Date range:', formatDateToLocalString(startOfMonth), 'to', formatDateToLocalString(endOfMonth));

      const { data, error } = await supabase
        .from('student_schedule')
        .select('*')
        .eq('student_registration', studentRegNo)
        .gte('date', formatDateToLocalString(startOfMonth))
        .lte('date', formatDateToLocalString(endOfMonth))
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('❌ Error loading schedules:', error);
        throw error;
      }

      console.log('✅ Loaded', data?.length || 0, 'slots from student_schedule table');

      const scheduleMap = new Map<string, TimeSlot[]>();
      data?.forEach((slot: TimeSlot) => {
        const dateKey = slot.date;
        if (!scheduleMap.has(dateKey)) {
          scheduleMap.set(dateKey, []);
        }
        scheduleMap.get(dateKey)?.push(slot);
      });

      setAllSchedules(scheduleMap);
      setAllSlotsList(data || []);
    } catch (error) {
      console.error('❌ Error loading schedules:', error);
    }
  };

  const loadAllSlotsForTable = async () => {
    try {
      const { data, error } = await supabase
        .from('student_schedule')
        .select('*')
        .eq('student_registration', studentRegNo)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAllSlotsList(data || []);
    } catch (error) {
      console.error('Error loading all slots:', error);
    }
  };

  const syncWithPeerListenerSchedule = async () => {
    try {
      // Check if this student is also a peer listener
      const { data: peerData, error: peerError } = await supabase
        .from('peer_listener')
        .select('*')
        .eq('registration_number', studentRegNo)
        .single();

      if (peerError || !peerData) {
        console.log('Not a peer listener or error checking:', peerError);
        return; // Not a peer listener, skip sync
      }

      console.log('Syncing schedule to expert_schedule for peer listener:', studentRegNo);

      // Get all student schedule slots
      const { data: studentSlots, error: slotsError } = await supabase
        .from('student_schedule')
        .select('*')
        .eq('student_registration', studentRegNo);

      if (slotsError) {
        console.error('Error fetching student slots:', slotsError);
        return;
      }

      // For each student slot, create or update corresponding expert_schedule slot
      for (const slot of studentSlots || []) {
        // Check if slot already exists in expert_schedule
        const { data: existingSlot } = await supabase
          .from('expert_schedule')
          .select('id')
          .eq('expert_registration', studentRegNo)
          .eq('date', slot.date)
          .eq('start_time', slot.start_time)
          .eq('end_time', slot.end_time)
          .single();

        if (existingSlot) {
          // Update existing slot
          await supabase
            .from('expert_schedule')
            .update({
              expert_name: slot.student_name,
              is_available: slot.is_available,
              booked_by: slot.booked_by
            })
            .eq('id', existingSlot.id);
        } else {
          // Insert new slot
          await supabase
            .from('expert_schedule')
            .insert({
              expert_registration: studentRegNo,
              expert_name: slot.student_name,
              date: slot.date,
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_available: slot.is_available,
              booked_by: slot.booked_by
            });
        }
      }

      console.log('Successfully synced schedule to expert_schedule');
    } catch (error) {
      console.error('Error syncing with peer listener schedule:', error);
    }
  };

  const loadSlotsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = formatDateToLocalString(date);
      
      console.log('📅 Loading slots for date:', dateStr);
      console.log('Student Reg:', studentRegNo);
      
      const { data, error } = await supabase
        .from('student_schedule')
        .select('*')
        .eq('student_registration', studentRegNo)
        .eq('date', dateStr)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('❌ Error loading slots:', error);
        throw error;
      }
      
      console.log('✅ Found', data?.length || 0, 'slots for', dateStr);
      console.log('📋 Slot data:', JSON.stringify(data, null, 2));
      
      setSlots(data || []);
    } catch (error) {
      console.error('❌ Error loading slots:', error);
      Alert.alert('Error', 'Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    await loadSlotsForDate(date);
    setModalVisible(true);
  };

  const addDefaultSlots = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const dateStr = formatDateToLocalString(selectedDate);
      
      console.log('📝 Preparing to insert slots...');
      console.log('Student Reg:', studentRegNo);
      console.log('Student Name:', studentName);
      console.log('Date:', dateStr);
      
      const newSlots = DEFAULT_SLOTS.map(slot => ({
        student_registration: studentRegNo,
        student_name: studentName,
        date: dateStr,
        start_time: slot.start,
        end_time: slot.end,
        is_available: true
      }));

      console.log('📊 Slots to insert:', JSON.stringify(newSlots, null, 2));

      const { data, error } = await supabase
        .from('student_schedule')
        .insert(newSlots)
        .select();

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Successfully inserted', data?.length || 0, 'slots into student_schedule table');
      console.log('📋 Inserted data:', JSON.stringify(data, null, 2));
      
      Alert.alert(
        'Success', 
        `${data?.length || newSlots.length} time slots added to database!\n\nDate: ${selectedDate.toLocaleDateString()}\nSlots: ${data?.length || newSlots.length}`,
        [{ text: 'OK' }]
      );
      
      await loadSlotsForDate(selectedDate);
      await loadAllSchedules();
      await syncWithPeerListenerSchedule();
    } catch (error: any) {
      console.error('❌ Error adding slots:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Error', 
        `Failed to add time slots.\n\nError: ${error.message || 'Unknown error'}\n\nCheck console for details.`
      );
    } finally {
      setLoading(false);
    }
  };

  const addCustomSlot = async () => {
    if (!selectedDate) return;

    const startTime = `${customSlot.startHour}:${customSlot.startMinute}:00`;
    const endTime = `${customSlot.endHour}:${customSlot.endMinute}:00`;

    if (startTime >= endTime) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      const dateStr = formatDateToLocalString(selectedDate);
      
      console.log('📝 Preparing to insert custom slot...');
      console.log('Student Reg:', studentRegNo);
      console.log('Student Name:', studentName);
      console.log('Date:', dateStr);
      console.log('Time:', startTime, '-', endTime);
      
      const slotData = {
        student_registration: studentRegNo,
        student_name: studentName,
        date: dateStr,
        start_time: startTime,
        end_time: endTime,
        is_available: true
      };
      
      console.log('📊 Slot data:', JSON.stringify(slotData, null, 2));

      const { data, error } = await supabase
        .from('student_schedule')
        .insert(slotData)
        .select();

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Custom slot added to student_schedule table:', data);
      
      Alert.alert(
        'Success', 
        `Custom time slot added to database!\n\nDate: ${selectedDate.toLocaleDateString()}\nTime: ${startTime.slice(0,5)} - ${endTime.slice(0,5)}`,
        [{ text: 'OK' }]
      );
      
      setCustomSlotModalVisible(false);
      await loadSlotsForDate(selectedDate);
      await loadAllSchedules();
      await syncWithPeerListenerSchedule();
    } catch (error: any) {
      console.error('❌ Error adding custom slot:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Error', 
        `Failed to add custom slot.\n\nError: ${error.message || 'Unknown error'}\n\nCheck console for details.`
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    Alert.alert(
      'Delete Slot',
      'Are you sure you want to delete this time slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('student_schedule')
                .delete()
                .eq('id', slotId);

              if (error) throw error;

              console.log('✅ Slot deleted from student_schedule table');
              Alert.alert('Success', 'Time slot removed from database');
              if (selectedDate) await loadSlotsForDate(selectedDate);
              await loadAllSchedules();
              await syncWithPeerListenerSchedule();
            } catch (error) {
              console.error('Error deleting slot:', error);
              Alert.alert('Error', 'Failed to delete slot');
            }
          }
        }
      ]
    );
  };

  const toggleSlotAvailability = async (slot: TimeSlot) => {
    try {
      const { error } = await supabase
        .from('student_schedule')
        .update({ is_available: !slot.is_available })
        .eq('id', slot.id);

      if (error) throw error;

      console.log('✅ Slot availability updated in student_schedule table');
      if (selectedDate) await loadSlotsForDate(selectedDate);
      await loadAllSchedules();
      await syncWithPeerListenerSchedule();
    } catch (error) {
      console.error('Error updating slot:', error);
      Alert.alert('Error', 'Failed to update slot availability');
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDateToLocalString(date);
      const hasSchedule = allSchedules.has(dateStr);
      const isToday = formatDateToLocalString(new Date()) === dateStr;

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.day,
            hasSchedule && styles.dayWithSchedule,
            isToday && styles.today
          ]}
          onPress={() => handleDateSelect(date)}
        >
          <Text style={[styles.dayText, hasSchedule && styles.dayWithScheduleText]}>
            {day}
          </Text>
          {hasSchedule && <View style={styles.scheduleDot} />}
        </TouchableOpacity>
      );
    }

    return (
      <View>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
            <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekDay}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendar}>{days}</View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <TouchableOpacity onPress={() => {
          loadAllSlotsForTable();
          setTableViewModalVisible(true);
        }}>
          <Ionicons name="list-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Manage Your Schedule</Text>
        <Text style={styles.subtitle}>Set your availability for study sessions</Text>

        {renderCalendar()}

        {/* Date Slots Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedDate?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.slotsContainer}>
                {loading ? (
                  <ActivityIndicator size="large" color={Colors.primary} />
                ) : slots.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={64} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>No time slots for this day</Text>
                    <Text style={styles.emptySubtext}>Add default slots or create custom ones</Text>
                  </View>
                ) : (
                  slots.map((slot) => (
                    <View key={slot.id} style={styles.slotCard}>
                      <View style={styles.slotInfo}>
                        <Text style={styles.slotTime}>
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: slot.is_available ? Colors.success : Colors.error }
                        ]}>
                          <Text style={styles.statusText}>
                            {slot.is_available ? 'Available' : 'Booked'}
                          </Text>
                        </View>
                        {slot.booked_by && (
                          <Text style={styles.bookedBy}>Booked by: {slot.booked_by}</Text>
                        )}
                      </View>
                      <View style={styles.slotActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => toggleSlotAvailability(slot)}
                        >
                          <Ionicons 
                            name={slot.is_available ? 'lock-closed' : 'lock-open'} 
                            size={20} 
                            color={Colors.primary} 
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => slot.id && deleteSlot(slot.id)}
                        >
                          <Ionicons name="trash" size={20} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.defaultButton]}
                  onPress={addDefaultSlots}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Add Default Slots</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.customButton]}
                  onPress={() => setCustomSlotModalVisible(true)}
                >
                  <Text style={styles.buttonText}>Custom Slot</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Custom Slot Modal */}
        <Modal
          visible={customSlotModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCustomSlotModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Custom Time Slot</Text>
                <TouchableOpacity onPress={() => setCustomSlotModalVisible(false)}>
                  <Ionicons name="close" size={28} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.customSlotForm}>
                <Text style={styles.label}>Start Time</Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={customSlot.startHour}
                    onChangeText={(text) => setCustomSlot({...customSlot, startHour: text})}
                    placeholder="HH"
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={customSlot.startMinute}
                    onChangeText={(text) => setCustomSlot({...customSlot, startMinute: text})}
                    placeholder="MM"
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>

                <Text style={styles.label}>End Time</Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={customSlot.endHour}
                    onChangeText={(text) => setCustomSlot({...customSlot, endHour: text})}
                    placeholder="HH"
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={customSlot.endMinute}
                    onChangeText={(text) => setCustomSlot({...customSlot, endMinute: text})}
                    placeholder="MM"
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={addCustomSlot}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Adding...' : 'Add Slot'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Table View Modal */}
      <Modal
        visible={tableViewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTableViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tableModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Time Slots</Text>
              <TouchableOpacity onPress={() => setTableViewModalVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tableContainer}>
              {allSlotsList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={64} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>No time slots created yet</Text>
                  <Text style={styles.emptySubtext}>Create slots from the calendar view</Text>
                </View>
              ) : (
                <View style={styles.tableWrapper}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Start</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>End</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Status</Text>
                  </View>

                  {/* Table Rows */}
                  {allSlotsList.map((slot, index) => (
                    <View 
                      key={slot.id || `slot-${index}`} 
                      style={[
                        styles.tableRow,
                        index % 2 === 0 && styles.tableRowEven
                      ]}
                    >
                      <Text style={[styles.tableCell, { flex: 2 }]}>
                        {new Date(slot.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>
                        {slot.start_time.slice(0, 5)}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>
                        {slot.end_time.slice(0, 5)}
                      </Text>
                      <View style={{ flex: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={[
                          styles.statusBadgeSmall,
                          { backgroundColor: slot.is_available ? Colors.success : Colors.error }
                        ]}>
                          <Text style={styles.statusTextSmall}>
                            {slot.is_available ? 'Free' : 'Booked'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.tableFooter}>
              <Text style={styles.tableFooterText}>
                Total Slots: {allSlotsList.length}
              </Text>
              <Text style={styles.tableFooterText}>
                Available: {allSlotsList.filter(s => s.is_available).length}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDay: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayText: {
    fontSize: 14,
    color: Colors.text,
  },
  dayWithSchedule: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  dayWithScheduleText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  today: {
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  scheduleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  slotsContainer: {
    maxHeight: 400,
    padding: 20,
  },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    marginBottom: 12,
  },
  slotInfo: {
    flex: 1,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  bookedBy: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: Colors.primary,
  },
  customButton: {
    backgroundColor: Colors.accent,
  },
  submitButton: {
    backgroundColor: Colors.success,
    margin: 20,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  customSlotForm: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  // Table View Styles
  tableModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
    height: '95%',
  },
  tableContainer: {
    flex: 1,
    padding: 16,
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: Colors.backgroundLight,
  },
  tableCell: {
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'center',
  },
  statusTextSmall: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  tableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: Colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tableFooterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});

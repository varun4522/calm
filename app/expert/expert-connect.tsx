import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

interface SessionRequest {
  id: string;
  studentName: string;
  studentReg: string;
  studentEmail: string;
  studentCourse: string;
  psychologistId: string;
  psychologistName: string;
  expertRegistration?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  requestedAt: string;
  notes: string;
};

export default function ExpertConnect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration?: string }>();
  const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
  const [expertInfo, setExpertInfo] = useState({
    name: '',
    registration: ''
  });
  const [expertId, setExpertId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showTodaysSessionsModal, setShowTodaysSessionsModal] = useState(false);

  // Clean up previous day's session history
  const cleanupPreviousDayHistory = useCallback(async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      // Remove completed sessions from yesterday
      const { error } = await supabase
        .from('book_request')
        .delete()
        .eq('session_date', yesterdayString)
        .eq('status', 'completed');

      if (error) {
        console.error('Error cleaning up previous day history:', error);
      }
    } catch (error) {
      console.error('Error in cleanup function:', error);
    }
  }, []);

  // Load expert data
  useEffect(() => {
    const loadExpertData = async () => {
      try {
        let regNo = params.registration;
        if (!regNo) {
          const storedReg = await AsyncStorage.getItem('currentExpertReg');
          if (storedReg) regNo = storedReg;
        }

        if (regNo) {
          const storedName = await AsyncStorage.getItem('currentExpertName');
          const storedId = await AsyncStorage.getItem('currentExpertId');
          setExpertInfo({
            name: storedName || 'Expert',
            registration: regNo
          });
          if (storedId) setExpertId(storedId);
        }
      } catch (error) {
        console.error('Error loading expert data:', error);
      }
    };

    loadExpertData();
  }, [params.registration]);

  // Load session requests from Supabase only
  const loadSessionRequests = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch sessions by robust matching on expert_registration and expert_id
      const results: any[] = [];
      const seen = new Set<string>();

      if (expertInfo.registration) {
        const { data: byReg, error: byRegErr } = await supabase
          .from('book_request')
          .select('*')
          .eq('expert_registration', expertInfo.registration);
        if (byRegErr) console.error('Supabase error (expert_registration):', byRegErr);
        if (byReg) {
          for (const row of byReg) {
            if (row && row.id && !seen.has(row.id)) { seen.add(row.id); results.push(row); }
          }
        }

        const { data: byIdAsReg, error: byIdAsRegErr } = await supabase
          .from('book_request')
          .select('*')
          .eq('expert_id', expertInfo.registration);
        if (byIdAsRegErr) console.error('Supabase error (expert_id=registration):', byIdAsRegErr);
        if (byIdAsReg) {
          for (const row of byIdAsReg) {
            if (row && row.id && !seen.has(row.id)) { seen.add(row.id); results.push(row); }
          }
        }
      }

      if (expertId) {
        const { data: byExpertId, error: byExpertIdErr } = await supabase
          .from('book_request')
          .select('*')
          .eq('expert_id', expertId);
        if (byExpertIdErr) console.error('Supabase error (expert_id):', byExpertIdErr);
        if (byExpertId) {
          for (const row of byExpertId) {
            if (row && row.id && !seen.has(row.id)) { seen.add(row.id); results.push(row); }
          }
        }
      }

      // Fallback: match by expert_name only if nothing else found
      if (results.length === 0 && expertInfo.name) {
        const { data, error } = await supabase
          .from('book_request')
          .select('*')
          .eq('expert_name', expertInfo.name);
        if (!error && data) {
          for (const row of data) {
            if (row && row.id && !seen.has(row.id)) { seen.add(row.id); results.push(row); }
          }
        }
      }

      // Sort newest first
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Convert Supabase data format to component format
      const formattedRequests: SessionRequest[] = results.map(request => ({
        id: request.id,
        studentName: request.student_name,
        studentReg: request.student_reg,
        studentEmail: request.student_email || '',
        studentCourse: request.student_course || '',
        psychologistId: request.expert_id,
        psychologistName: request.expert_name,
        expertRegistration: request.expert_registration,
        date: request.session_date,
        time: request.session_time,
        status: (request.status === 'approved' ? 'confirmed' : request.status),
        requestedAt: request.created_at,
        notes: request.reason || ''
      }));

      setSessionRequests(formattedRequests);
    } catch (error) {
      console.error('❌ Error loading session requests from Supabase:', error);
      // Set empty array on error - no dummy data
      setSessionRequests([]);
    } finally {
      setLoading(false);
    }
  }, [expertInfo.registration, expertInfo.name, expertId]);

  // Load requests when expert info is available
  useEffect(() => {
    if (expertInfo.registration) {
      loadSessionRequests();
      // Clean up previous day's history when component loads
      cleanupPreviousDayHistory();
    }
  }, [expertInfo.registration, loadSessionRequests, cleanupPreviousDayHistory]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessionRequests();
    setRefreshing(false);
  }, [loadSessionRequests]);

  // Check for existing confirmed sessions (prevent any additional bookings)
  const checkExistingConfirmedSessions = async (studentReg: string) => {
    try {
      // Check if student has ANY confirmed sessions (regardless of time/date)
      const { data: confirmedSessions, error } = await supabase
        .from('book_request')
        .select('*')
        .eq('student_reg', studentReg)
        .in('status', ['approved']);

      if (error) {
        console.error('Error checking existing confirmed sessions:', error);
        return { hasConfirmedSession: false, sessionDetails: null };
      }

      if (confirmedSessions && confirmedSessions.length > 0) {
        return {
          hasConfirmedSession: true,
          sessionDetails: confirmedSessions[0] // Return first confirmed session for display
        };
      }

      return { hasConfirmedSession: false, sessionDetails: null };
    } catch (error) {
      console.error('Error in checkExistingConfirmedSessions:', error);
      return { hasConfirmedSession: false, sessionDetails: null };
    }
  };

  // Update session status in Supabase database
  const updateSessionStatus = async (requestId: string, newStatus: 'confirmed' | 'rejected' | 'completed') => {
    try {
      setLoading(true);

      // Find the session request to get student details
      const sessionRequest = sessionRequests.find(req => req.id === requestId);
      if (!sessionRequest) {
        Alert.alert('Error', 'Session request not found.');
        return;
      }

      // Check for existing ACTIVE sessions if confirming a session (pending or confirmed)
      if (newStatus === 'confirmed') {
        const { data: activeRows, error: activeErr } = await supabase
          .from('book_request')
          .select('id, expert_name, session_date, session_time, status')
          .eq('student_reg', sessionRequest.studentReg)
          .in('status', ['pending', 'approved'])
          .neq('id', requestId)
          .limit(1);

        if (activeErr) {
          console.error('❌ Error checking active sessions:', activeErr);
          Alert.alert('Error', 'Could not verify existing sessions. Please try again.');
          return;
        }

        if (activeRows && activeRows.length > 0) {
          const s = activeRows[0];
          const existingSessionDate = new Date(s.session_date).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
          });
          let existingSessionTime: string = s.session_time;
          try {
            const [hours, minutes] = s.session_time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            existingSessionTime = `${displayHour}:${minutes} ${ampm}`;
          } catch {}

          Alert.alert(
            'Student Already Has Active Session',
            `${sessionRequest.studentName} already has an active session (${s.status}) with ${s.expert_name || 'an expert'} on ${existingSessionDate} at ${existingSessionTime}.\n\nStudents can only have one active session (pending or confirmed) at a time. Ask the student to complete or cancel the existing session first.`,
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Update in Supabase
      const dbStatus = newStatus === 'confirmed' ? 'approved' : newStatus;
      const { error } = await supabase
        .from('book_request')
        .update({
          status: dbStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('❌ Error updating session status:', error);
        Alert.alert('Error', 'Failed to update session status. Please try again.');
        return;
      }

      // Update local state
      setSessionRequests(prevRequests =>
        prevRequests.map(request =>
          request.id === requestId
            ? { ...request, status: newStatus }
            : request
        )
      );

      // Show success message
      const statusMessages = {
        confirmed: 'Session confirmed successfully! The student will be notified.',
        rejected: 'Session rejected. The student will be notified.',
        completed: 'Session marked as completed.'
      };

      Alert.alert('Success', statusMessages[newStatus]);

      // Reload session requests to reflect changes
      await loadSessionRequests();

    } catch (error) {
      console.error('❌ Error in updateSessionStatus:', error);
      Alert.alert('Error', 'Failed to update session status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Mark session as completed
  const handleCompleteSession = async (requestId: string) => {
    try {
      setLoading(true);

      // First, get the session details to find the student
      const { data: sessionData, error: fetchError } = await supabase
        .from('book_request')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching session data:', fetchError);
        Alert.alert('Error', `Failed to fetch session data: ${fetchError.message}`);
        return;
      }

      if (!sessionData) {
        Alert.alert('Error', 'Session not found.');
        return;
      }

      // Update the session status to completed
      const { error: updateError } = await supabase
        .from('book_request')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('❌ Error updating session status:', updateError);
        Alert.alert('Error', `Failed to mark session as completed: ${updateError.message}`);
        return;
      }

      // Update local state
      setSessionRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, status: 'completed' } : r
      ));      Alert.alert(
        'Success',
        'Session marked as completed! The student can now book another session.',
        [{ text: 'OK' }]
      );

      // Reload session requests to reflect changes
      await loadSessionRequests();

    } catch (error) {
      console.error('❌ Error in handleCompleteSession:', error);
      Alert.alert('Error', `Failed to mark session as completed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete session request
  const handleDeleteSession = async (requestId: string) => {
    Alert.alert(
      'Delete Session Request',
      'Are you sure you want to delete this session request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('book_request')
                .delete()
                .eq('id', requestId);
              if (error) {
                Alert.alert('Error', 'Failed to delete session request.');
                return;
              }
              setSessionRequests(prev => prev.filter(r => r.id !== requestId));
              Alert.alert('Success', 'Session request deleted.');
              await loadSessionRequests();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete session request.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'confirmed': return '#27ae60';
      case 'rejected': return '#e74c3c';
      case 'completed': return '#3498db';
      default: return '#95a5a6';
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
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🔗 Session Requests</Text>
          <Text style={styles.headerSubtitle}>Dr. {expertInfo.name}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowTodaysSessionsModal(true)}
          style={styles.logoButton}
        >
          <Text style={styles.logoIcon}>📊</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{sessionRequests.filter(r => r.status === 'pending').length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{sessionRequests.filter(r => r.status === 'confirmed').length}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{sessionRequests.length}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
        </View>

        {/* Session Requests List */}
        <ScrollView
          style={styles.requestsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading session requests...</Text>
            </View>
          ) : (
            sessionRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No session requests yet.</Text>
              </View>
            ) : (
              sessionRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                {/* Request Header */}
                <View style={styles.requestHeader}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{request.studentName}</Text>
                    <Text style={styles.studentDetails}>
                      {request.studentReg} • {request.studentCourse}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                    <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
                  </View>
                </View>

                {/* Session Details */}
                <View style={styles.sessionDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(request.date)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🕒</Text>
                    <Text style={styles.detailLabel}>Time:</Text>
                    <Text style={styles.detailValue}>{formatTime(request.time)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📧</Text>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{request.studentEmail || 'N/A'}</Text>
                  </View>

                  {request.notes && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>📝</Text>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <Text style={styles.detailValue}>{request.notes}</Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                {request.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.confirmButton]}
                      onPress={() => updateSessionStatus(request.id, 'confirmed')}
                    >
                      <Text style={styles.actionButtonText}>✓ Confirm</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => updateSessionStatus(request.id, 'rejected')}
                    >
                      <Text style={styles.actionButtonText}>✗ Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleCompleteSession(request.id)}
                    >
                      <Text style={styles.actionButtonText}>✔️ Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteSession(request.id)}
                    >
                      <Text style={styles.actionButtonText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {request.status === 'confirmed' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.contactButton]}
                      onPress={() => router.push({
                        pathname: './expert-chat',
                        params: {
                          studentId: request.studentReg,
                          studentName: request.studentName,
                          studentReg: request.studentReg,
                          studentEmail: request.studentEmail,
                          studentCourse: request.studentCourse,
                          expertReg: expertInfo.registration,
                          expertName: expertInfo.name,
                        }
                      })}
                    >
                      <Text style={styles.actionButtonText}>💬 Contact Student</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleCompleteSession(request.id)}
                    >
                      <Text style={styles.actionButtonText}>✔️ Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteSession(request.id)}
                    >
                      <Text style={styles.actionButtonText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {request.status !== 'pending' && request.status !== 'confirmed' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleCompleteSession(request.id)}
                    >
                      <Text style={styles.actionButtonText}>✔️ Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteSession(request.id)}
                    >
                      <Text style={styles.actionButtonText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Request Time */}
                <Text style={styles.requestTime}>
                  Requested: {new Date(request.requestedAt).toLocaleString()}
                </Text>
              </View>
            ))
          ))}
        </ScrollView>
      </View>

      {/* Today's Sessions Modal */}
      <Modal
        visible={showTodaysSessionsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTodaysSessionsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📅 Today's Sessions</Text>
            <TouchableOpacity
              onPress={() => setShowTodaysSessionsModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>

          <ScrollView style={styles.modalContent}>
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const todaysSessions = sessionRequests.filter(request =>
                request.date === today && (request.status === 'confirmed' || request.status === 'completed')
              );

              return todaysSessions.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Text style={styles.modalEmptyIcon}>🗓️</Text>
                  <Text style={styles.modalEmptyTitle}>No Sessions Today</Text>
                  <Text style={styles.modalEmptyText}>
                    You don't have any confirmed or completed sessions scheduled for today.
                  </Text>
                </View>
              ) : (
                todaysSessions.map((session) => (
                <View key={session.id} style={styles.modalSessionCard}>
                  <View style={styles.modalSessionHeader}>
                    <Text style={styles.modalSessionTime}>{formatTime(session.time)}</Text>
                    <View style={[
                      styles.modalSessionStatusBadge,
                      { backgroundColor: getStatusColor(session.status) }
                    ]}>
                      <Text style={styles.modalSessionStatusText}>
                        {session.status === 'completed' ? '✓ Completed' : '⏰ Confirmed'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.modalSessionStudentName}>{session.studentName}</Text>
                  <Text style={styles.modalSessionStudentDetails}>
                    {session.studentReg} • {session.studentCourse}
                  </Text>

                  <View style={styles.modalSessionActions}>
                    {session.status === 'confirmed' && (
                      <TouchableOpacity
                        style={styles.modalCompleteButton}
                        onPress={() => {
                          updateSessionStatus(session.id, 'completed');
                          setShowTodaysSessionsModal(false);
                        }}
                      >
                        <Text style={styles.modalCompleteButtonText}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.modalChatButton}
                      onPress={() => {
                        setShowTodaysSessionsModal(false);
                        router.push({
                          pathname: './expert-chat',
                          params: {
                            studentId: session.studentReg,
                            studentName: session.studentName,
                            studentReg: session.studentReg,
                            studentEmail: session.studentEmail,
                            studentCourse: session.studentCourse,
                            expertReg: expertInfo.registration,
                            expertName: expertInfo.name,
                          }
                        });
                      }}
                    >
                      <Text style={styles.modalChatButtonText}>💬 Chat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
              );
            })()}
          </ScrollView>
        </View>
      </Modal>
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
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7b1fa2',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  requestsList: {
    flex: 1,
  },
  loadingContainer: {
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    margin: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  studentDetails: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sessionDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 60,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  confirmButton: {
    backgroundColor: '#27ae60',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  contactButton: {
    backgroundColor: '#3498db',
  },
  completeButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#e57373',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Header logo styles
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  logoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#7b1fa2',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalDate: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 16,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  modalEmptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.5,
  },
  modalEmptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalSessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  modalSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSessionTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  modalSessionStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalSessionStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalSessionStudentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  modalSessionStudentDetails: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  modalSessionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCompleteButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  modalCompleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalChatButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  modalChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface PeerListener {
  id: string;
  name: string;
  email: string;
  username: string;
  student_id: string;
  phone: string;
  course: string;
  year: string;
  status: string;
  training_completed: boolean;
}

interface BookingRequest {
  id: number;
  student_name: string;
  student_registration: string;
  peer_listener_id: string;
  peer_listener_name: string;
  peer_listener_username: string;
  booking_date: string;
  booking_time: string;
  status: string;
  message: string;
  peer_notes?: string;
  created_at: string;
  updated_at?: string;
}

interface PeerConnectProps {
  peerListener: PeerListener | null;
}

export default function PeerConnect({ peerListener }: PeerConnectProps) {
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (peerListener) {
      loadBookingRequests();

      // Set up real-time subscription for new booking requests
      const subscription = supabase
        .channel('peer_booking_updates')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'book_request',
            filter: `expert_id=eq.${peerListener.student_id || peerListener.id}`
          },
          (payload) => {
            console.log('Real-time booking update:', payload);
            // Refresh booking requests when the table changes
            loadBookingRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [peerListener]);

  const loadBookingRequests = async () => {
    try {
      setIsLoading(true);

      // Fetch real booking requests from the book_request table (from student bookings)
      const { data: bookings, error } = await supabase
        .from('book_request')
        .select('*')
        .eq('expert_id', peerListener?.student_id || peerListener?.id)
        .eq('session_type', 'peer_listener')
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching peer listener bookings:', error);
        // If error, just show empty state - no fallback dummy data
        setBookingRequests([]);
        return;
      }

      // Map the data to match our BookingRequest interface
      const mappedBookings: BookingRequest[] = (bookings || []).map(booking => ({
        id: booking.id,
        student_name: booking.student_name,
        student_registration: booking.student_reg,
        peer_listener_id: booking.expert_id,
        peer_listener_name: booking.expert_name,
        peer_listener_username: peerListener?.username || '',
        booking_date: booking.session_date,
        booking_time: booking.session_time,
        status: booking.status,
        message: booking.reason || '',
        created_at: booking.created_at,
        updated_at: booking.updated_at
      }));

      setBookingRequests(mappedBookings);
    } catch (error) {
      console.error('Error loading booking requests:', error);
      // No fallback dummy data - just show empty state
      setBookingRequests([]);
    } finally {
      setIsLoading(false);
    }
  };  const handleAcceptBooking = async (bookingId: number) => {
    try {
      // Update booking status to 'confirmed' in book_request table
      const { error } = await supabase
        .from('book_request')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) {
        console.error('Error accepting booking:', error);
        Alert.alert('Error', 'Failed to accept booking');
      } else {
        Alert.alert('Success', 'Booking accepted successfully!');
        loadBookingRequests(); // Refresh the list
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleDeclineBooking = async (bookingId: number) => {
    try {
      // Update booking status to 'declined' in book_request table
      const { error } = await supabase
        .from('book_request')
        .update({ status: 'declined' })
        .eq('id', bookingId);

      if (error) {
        console.error('Error declining booking:', error);
        Alert.alert('Error', 'Failed to decline booking');
      } else {
        Alert.alert('Success', 'Booking declined');
        loadBookingRequests(); // Refresh the list
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderBookingRequest = (booking: BookingRequest) => (
    <View key={booking.id} style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.studentName}>{booking.student_name}</Text>
        <View style={[
          styles.statusBadge,
          booking.status === 'pending' && styles.pendingBadge,
          booking.status === 'confirmed' && styles.acceptedBadge,
          booking.status === 'declined' && styles.declinedBadge
        ]}>
          <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <Text style={styles.detailLabel}>Registration: <Text style={styles.detailValue}>{booking.student_registration}</Text></Text>
        <Text style={styles.detailLabel}>Date: <Text style={styles.detailValue}>{formatDate(booking.booking_date)}</Text></Text>
        <Text style={styles.detailLabel}>Time: <Text style={styles.detailValue}>{booking.booking_time}</Text></Text>
        {booking.message && (
          <Text style={styles.detailLabel}>Message: <Text style={styles.detailValue}>{booking.message}</Text></Text>
        )}
      </View>

      {booking.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptBooking(booking.id)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => handleDeclineBooking(booking.id)}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Connect with Students</Text>

      {/* Recent Connections with Booking Requests */}
      <View style={styles.connectCard}>
        <Text style={styles.connectTitle}>Recent Connections & Booking Requests</Text>
        {isLoading ? (
          <Text style={styles.connectSubtitle}>Loading booking requests...</Text>
        ) : bookingRequests.length > 0 ? (
          <View style={styles.bookingsList}>
            {bookingRequests.map(renderBookingRequest)}
          </View>
        ) : (
          <Text style={styles.connectSubtitle}>No recent connections or booking requests</Text>
        )}
      </View>
  {/* Removed Peer Network / Active Chat Rooms / Support Request Queue per request */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  connectCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  connectSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  connectButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Booking Request Styles
  bookingsList: {
    marginTop: 12,
  },
  bookingCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#FFA500',
  },
  acceptedBadge: {
    backgroundColor: '#10B981',
  },
  declinedBadge: {
    backgroundColor: '#FF4444',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  bookingDetails: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontWeight: '600',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  acceptButton: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 0.45,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  declineButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 0.45,
  },
  declineButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

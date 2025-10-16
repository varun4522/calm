import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';

interface StudentLocation {
  id: number;
  student_reg: string;
  student_name: string;
  latitude: number;
  longitude: number;
  address?: string;
  shared_at: string;
  is_emergency?: boolean;
  status: 'active' | 'inactive';
}

export default function AdminLocation() {
  const router = useRouter();
  const [studentLocations, setStudentLocations] = useState<StudentLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch student locations from Supabase
  const fetchStudentLocations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('student_locations')
        .select('*')
        .eq('status', 'active')
        .order('shared_at', { ascending: false });

      if (error) {
        console.error('Error fetching student locations:', error);
        if (error.message.includes('relation "student_locations" does not exist')) {
          Alert.alert(
            'Database Setup Required',
            'The student_locations table needs to be created in Supabase. Please contact the developer to set up the database schema.',
            [{ text: 'OK', style: 'default' }]
          );
        } else if (error.code === '42501' || error.message.includes('row-level security policy')) {
          Alert.alert(
            'Database Permissions Required',
            'Row Level Security policies need to be configured for the student_locations table. Please contact the administrator.',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert('Error', `Failed to fetch student locations: ${error.message}`);
        }
      } else {
        setStudentLocations(data || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudentLocations();

    // Set up real-time subscription for new location shares
    const subscription = supabase
      .channel('student_locations')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'student_locations' },
        async (payload) => {
          console.log('New location shared:', payload.new);
          setStudentLocations(prev => [payload.new as StudentLocation, ...prev]);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'student_locations' },
        async (payload) => {
          console.log('Location updated:', payload.new);
          setStudentLocations(prev =>
            prev.map(loc =>
              loc.id === payload.new.id ? payload.new as StudentLocation : loc
            )
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentLocations();
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const openInMaps = (latitude: number, longitude: number, name: string) => {
    Alert.alert(
      'Open Location',
      `Open ${name}'s location in maps?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Maps',
          onPress: () => {
            // You can implement map opening functionality here
            Alert.alert('Maps', `Opening location: ${latitude}, ${longitude}`);
          }
        }
      ]
    );
  };

  const markAsInactive = async (locationId: number) => {
    try {
      const { error } = await supabase
        .from('student_locations')
        .update({ status: 'inactive' })
        .eq('id', locationId);

      if (error) {
        console.error('Error updating location status:', error);
        Alert.alert('Error', 'Failed to update location status.');
      } else {
        setStudentLocations(prev => prev.filter(loc => loc.id !== locationId));
        Alert.alert('Success', 'Location marked as inactive.');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#D8BFD8', padding: 24 }}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.push('/admin/admin-setting')}
        style={{ marginBottom: 20, marginTop: 40 }}
      >
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{'< Back'}</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={{ backgroundColor: '#7965AF', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>
          📍 Student Locations
        </Text>
        <Text style={{ color: 'white', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
          Live location sharing from students
        </Text>
      </View>

      {/* Location Count */}
      <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <Text style={{ color: '#7965AF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
          Active Locations: {studentLocations.length}
        </Text>
      </View>

      {/* Student Locations List */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: 'gray' }}>Loading student locations...</Text>
          </View>
        ) : studentLocations.length > 0 ? (
          studentLocations.map((location) => (
            <View key={location.id} style={{
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              borderLeftWidth: 4,
              borderLeftColor: location.is_emergency ? '#FF6F61' : '#7965AF',
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#7965AF', marginBottom: 4 }}>
                    {location.student_name}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    ID: {location.student_reg}
                  </Text>
                </View>
                {location.is_emergency && (
                  <View style={{ backgroundColor: '#FF6F61', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>EMERGENCY</Text>
                  </View>
                )}
              </View>

              {/* Location Details */}
              <View style={{ backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>COORDINATES</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 }}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>

                {location.address && (
                  <>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>ADDRESS</Text>
                    <Text style={{ fontSize: 14, color: '#333', marginBottom: 8 }}>
                      {location.address}
                    </Text>
                  </>
                )}

                <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>SHARED AT</Text>
                <Text style={{ fontSize: 14, color: '#333' }}>
                  {formatDateTime(location.shared_at)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#2ecc71',
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    flex: 0.48
                  }}
                  onPress={() => openInMaps(location.latitude, location.longitude, location.student_name)}
                >
                  <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
                    🗺️ Open Maps
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#e74c3c',
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    flex: 0.48
                  }}
                  onPress={() => markAsInactive(location.id)}
                >
                  <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
                    ❌ Mark Inactive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, color: '#7965AF', fontWeight: 'bold', marginBottom: 8 }}>
              📍 No Active Locations
            </Text>
            <Text style={{ fontSize: 14, color: 'gray', textAlign: 'center' }}>
              Student locations will appear here when they share their location from the student app.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

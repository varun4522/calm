import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function AdminSetting() {
  const router = useRouter();
  const [helpMessages, setHelpMessages] = useState<{ id: string; message: string; sender_type?: string; created_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch help messages from Supabase
    const fetchHelpMessages = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('help')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching help messages:', error);
          Alert.alert('Error', 'Failed to fetch help messages.');
        } else {
          setHelpMessages(data || []);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        Alert.alert('Error', 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHelpMessages();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('adminUser');
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/');
    }
  };

  const formatDateTime = (dateTimeString: string | number | Date) => {
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

  return (
    <View style={{ flex: 1, backgroundColor: '#D8BFD8', padding: 24 }}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.push('/admin/admin-home')}
        style={{ marginBottom: 20, marginTop: 60, padding: 2, backgroundColor: '#7965AF' }}
      >
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 10 }}>{' Back'}</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        onPress={handleLogout}
        style={{ backgroundColor: '#FF6F61', padding: 16, borderRadius: 8, marginBottom: 20 }}
      >
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Logout</Text>
      </TouchableOpacity>

      {/* Help Messages Display */}
      <ScrollView style={{ flex: 1, backgroundColor: 'white', borderRadius: 8, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#7965AF', marginBottom: 16, textAlign: 'center' }}>
          Help Messages
        </Text>

        {isLoading ? (
          <Text style={{ fontSize: 16, color: 'gray', textAlign: 'center' }}>Loading messages...</Text>
        ) : helpMessages.length > 0 ? (
          helpMessages.map((messageObj, index) => (
            <View key={messageObj.id || index} style={{
              backgroundColor: '#f8f9fa',
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#7965AF'
            }}>
              <Text style={{ fontSize: 16, color: 'black', marginBottom: 8, lineHeight: 22 }}>
                {messageObj.message}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>
                  {messageObj.sender_type || 'Student'}
                </Text>
                <Text style={{ fontSize: 12, color: '#666' }}>
                  {formatDateTime(messageObj.created_at)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 16, color: 'gray', textAlign: 'center' }}>No help messages available.</Text>
        )}
      </ScrollView>

      {/* Location Button */}
      <TouchableOpacity
        style={{
          backgroundColor: '#7965AF',
          padding: 16,
          borderRadius: 8,
          marginTop: 20,
          alignItems: 'center',
          justifyContent: 'center',
          aspectRatio: 1,
          alignSelf: 'center',
          width: 100,
          height: 100
        }}
        onPress={() => {
          router.push('/admin/location');
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
          📍{'\n'}Location
        </Text>
      </TouchableOpacity>
    </View>
  );
}

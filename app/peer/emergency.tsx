import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function Emergency() {
  const router = useRouter();

  const handleShareLocation = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to share your location.');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Get student information from AsyncStorage
      const storedReg = await AsyncStorage.getItem('currentStudentReg');
      const studentData = await AsyncStorage.getItem('currentStudentData');

      if (!storedReg) {
        Alert.alert('Error', 'Student information not found. Please login again.');
        return;
      }

      let studentName = 'Student';
      if (studentData) {
        const data = JSON.parse(studentData);
        studentName = data.name || data.username || 'Student';
      }

      // Get address from coordinates (optional)
      let address = '';
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (reverseGeocode.length > 0) {
          const location = reverseGeocode[0];
          address = `${location.street || ''} ${location.city || ''} ${location.region || ''} ${location.country || ''}`.trim();
        }
      } catch (error) {
        console.log('Reverse geocoding failed:', error);
      }

      // Save location to Supabase database
      const locationData = {
        student_reg: storedReg,
        student_name: studentName,
        latitude: latitude,
        longitude: longitude,
        address: address || null,
        shared_at: new Date().toISOString(),
        is_emergency: true, // Mark as emergency since it's from emergency tab
        status: 'active'
      };

      const { data, error } = await supabase
        .from('student_locations')
        .insert([locationData]);

      if (error) {
        console.error('Error saving location:', error);

        if (error.code === '42501' || error.message.includes('row-level security policy')) {
          Alert.alert(
            'Database Setup Required',
            'The location sharing feature needs to be configured in the database. Please contact the administrator to set up the required permissions.\n\nError: Row Level Security policy violation',
            [
              { text: 'Copy Error Details', onPress: () => {
                // In a real app, you could copy to clipboard here
                console.log('RLS Error Details:', error);
              }},
              { text: 'OK', style: 'default' }
            ]
          );
        } else if (error.message.includes('relation "student_locations" does not exist')) {
          Alert.alert(
            'Database Setup Required',
            'The student_locations table needs to be created in the database. Please contact the administrator.',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert('Error', `Failed to share location with admin: ${error.message}`);
        }
        return;
      }

      console.log('Location shared successfully:', data);
      Alert.alert(
        'Location Shared',
        `Your emergency location has been shared with the admin.\n\nLocation: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}${address ? `\nAddress: ${address}` : ''}`,
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Failed to share location. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.replace('./student-home')}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>Emergency Support</Text>

      {/* Live Love Button */}
      <TouchableOpacity
        onPress={() => Linking.openURL('https://www.thelivelovelaughfoundation.org/find-help/helplines')}
        style={styles.liveLoveButton}
      >
        <Text style={styles.liveLoveButtonIcon}>💚</Text>
        <Text style={styles.liveLoveButtonText}>Live Love Laugh Foundation</Text>
        <Text style={styles.buttonDescription}>Mental health helplines & support</Text>
      </TouchableOpacity>

      {/* Share Location Button */}
      <TouchableOpacity
        onPress={handleShareLocation}
        style={styles.shareLocationButton}
      >
        <Text style={styles.shareLocationButtonIcon}>📍</Text>
        <Text style={styles.shareLocationButtonText}>Share My Location</Text>
        <Text style={styles.buttonDescription}>Send location to admin dashboard</Text>
      </TouchableOpacity>

      {/* Emergency Hotline */}
      <TouchableOpacity
        onPress={() => Linking.openURL('tel:102')}
        style={styles.hotlineButton}
      >
        <Text style={styles.hotlineButtonIcon}>📞</Text>
        <Text style={styles.hotlineButtonText}>Emergency Hotline: 102</Text>
        <Text style={styles.buttonDescription}>24/7 Emergency services</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 12,
    backgroundColor: '#3498db',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: '#e74c3c',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    color: '#7f8c8d',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  liveLoveButton: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#2ecc71',
    borderRadius: 15,
    alignItems: 'center',
    width: '90%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  liveLoveButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  liveLoveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  shareLocationButton: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#e74c3c',
    borderRadius: 15,
    alignItems: 'center',
    width: '90%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  shareLocationButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  shareLocationButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hotlineButton: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#f39c12',
    borderRadius: 15,
    alignItems: 'center',
    width: '90%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  hotlineButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  hotlineButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buttonDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
});

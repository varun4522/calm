import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/api/Profile';

export default function Emergency() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile } = useProfile(session?.user?.id);

  const handleShareLocation = async () => {
    try {
      // Check if user is authenticated
      if (!session?.user?.id || !profile) {
        Alert.alert('Error', 'User not authenticated. Please login again.');
        return;
      }

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to share your location.');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

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
        student_reg: profile.registration_number,
        student_name: profile.name,
        latitude: latitude,
        longitude: longitude,
        address: address || null,
        shared_at: new Date().toISOString(),
        is_emergency: true, // Mark as emergency since it's from emergency tab
        status: 'active'
      };

      console.log('📍 Sharing location:', locationData);

      const { data, error } = await supabase
        .from('student_locations')
        .insert([locationData])
        .select();

      if (error) {
        console.error('❌ Error saving location:', error);

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

      console.log('✅ Location shared successfully:', data);
      Alert.alert(
        '✅ Location Shared Successfully!',
        `Your emergency location has been shared with the admin.\n\n` +
        `📍 Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}` +
        `${address ? `\n📍 Address: ${address}` : ''}\n\n` +
        `Student: ${profile.name}\n` +
        `Reg No: ${profile.registration_number}\n\n` +
        `The admin can now see your location on their dashboard.`,
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error) {
      console.error('❌ Error sharing location:', error);
      Alert.alert('Error', 'Failed to share location. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.replace('./support')}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>{'<'}</Text>
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>Emergency Support</Text>

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

      {/* Mental Health Helplines */}
      <Text style={styles.sectionTitle}>Mental Health Helplines</Text>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:9999666555')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Vandrevala Foundation</Text>
        <Text style={styles.helplineNumber}>9999666555</Text>
        <Text style={styles.helplineTime}>24x7 | 7 days a week</Text>
        <Text style={styles.helplineNote}>WhatsApp chat support available</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:14416')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Tele MANAS</Text>
        <Text style={styles.helplineNumber}>14416</Text>
        <Text style={styles.helplineTime}>24/7 | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:1800120820050')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>MPower Minds</Text>
        <Text style={styles.helplineNumber}>1800-120-820050</Text>
        <Text style={styles.helplineTime}>24 hours | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:+918376804102')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Fortis</Text>
        <Text style={styles.helplineNumber}>+91-8376804102</Text>
        <Text style={styles.helplineTime}>24 hours | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:7893078930')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>1Life Suicide Prevention & Crisis Support</Text>
        <Text style={styles.helplineNumber}>7893078930</Text>
        <Text style={styles.helplineTime}>5am to 12am | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:8448844845')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Voice That Cares (VTC)</Text>
        <Text style={styles.helplineNumber}>8448-8448-45</Text>
        <Text style={styles.helplineTime}>9am-9pm | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:+919922001122')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Connecting Trust Distress Helpline</Text>
        <Text style={styles.helplineNumber}>+91-9922001122, +91-9922004305</Text>
        <Text style={styles.helplineTime}>12:00 PM - 08:00 PM | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:+918142020033')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Roshni Trust</Text>
        <Text style={styles.helplineNumber}>+91 8142020033/+91 8142020044</Text>
        <Text style={styles.helplineTime}>11:00 AM - 9:00 PM | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:+919163940404')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Lifeline</Text>
        <Text style={styles.helplineNumber}>+91-9163940404, +91-9088030303</Text>
        <Text style={styles.helplineTime}>10:00 AM - 10:00 PM | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:+918686139139')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Mann Talks</Text>
        <Text style={styles.helplineNumber}>+91-8686139139</Text>
        <Text style={styles.helplineTime}>9:00 AM - 8:00 PM | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:+918023655557')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Arpita Foundation</Text>
        <Text style={styles.helplineNumber}>+91 80 23655557, +91 80 23656667</Text>
        <Text style={styles.helplineTime}>7:00 AM - 09:00 PM | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:9375493754')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Speak2Us</Text>
        <Text style={styles.helplineNumber}>9375493754</Text>
        <Text style={styles.helplineTime}>9am-6pm | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:01141198666')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Sangath</Text>
        <Text style={styles.helplineNumber}>011-41198666</Text>
        <Text style={styles.helplineTime}>10:00 AM - 6:00 PM | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:8655486966')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Ankahee Helpline</Text>
        <Text style={styles.helplineNumber}>8655486966</Text>
        <Text style={styles.helplineTime}>4pm-10pm | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:01123389090')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Sumaitri</Text>
        <Text style={styles.helplineNumber}>011-23389090, +91-9315767849</Text>
        <Text style={styles.helplineTime}>12:30 PM - 5:00 PM | 7 days a week</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:02225521111')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>iCALL</Text>
        <Text style={styles.helplineNumber}>022-25521111</Text>
        <Text style={styles.helplineTime}>10 AM - 8 PM | Monday to Saturday</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:7887889882')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Muktaa Helpline</Text>
        <Text style={styles.helplineNumber}>788-788-9882, 080-69267931</Text>
        <Text style={styles.helplineTime}>12-8 PM | Monday-Saturday</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:+917676602602')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>Parivarthan</Text>
        <Text style={styles.helplineNumber}>+91-7676602602</Text>
        <Text style={styles.helplineTime}>1:00 PM - 10:00 PM | Monday to Friday</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('tel:+916361612525')}
        style={styles.helplineButton}
      >
        <Text style={styles.helplineButtonText}>COOJ Mental Health Foundation (COOJ)</Text>
        <Text style={styles.helplineNumber}>+91-6361612525</Text>
        <Text style={styles.helplineTime}>01:00 PM - 07:00 PM | Monday to Friday</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 20,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: Colors.primary,
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
  shareLocationButton: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: 25,
    alignItems: 'center',
    width: '90%',
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  shareLocationButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  shareLocationButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hotlineButton: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: 25,
    alignItems: 'center',
    width: '90%',
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  hotlineButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  hotlineButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buttonDescription: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  sectionTitle: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  helplineButton: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: '90%',
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  helplineButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  helplineNumber: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  helplineTime: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
  helplineNote: {
    color: '#27ae60',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

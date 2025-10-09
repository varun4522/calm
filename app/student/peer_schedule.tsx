import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Colors } from '../../constants/Colors';

export default function PeerSchedulePage() {
  const router = useRouter();
  const [peerName, setPeerName] = useState('');

  useEffect(() => {
    loadPeerInfo();
  }, []);

  const loadPeerInfo = async () => {
    try {
      const storedData = await AsyncStorage.getItem('currentPeerData') || await AsyncStorage.getItem('currentStudentData');
      
      if (storedData) {
        const data = JSON.parse(storedData);
        setPeerName(data.name || data.user_name || 'Peer Listener');
      }
    } catch (error) {
      console.error('Error loading peer info:', error);
    }
  };

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Peer Listener Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Welcome Message */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Welcome, {peerName}!</Text>
        <Text style={styles.welcomeSubtext}>Choose an option below to manage your peer listener activities</Text>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/student/schedule')}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={32} color={Colors.white} />
          <Text style={styles.navButtonText}>My Schedule</Text>
          <Text style={styles.navButtonSubtext}>Manage your availability</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/student/clients')}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={32} color={Colors.white} />
          <Text style={styles.navButtonText}>My Requests</Text>
          <Text style={styles.navButtonSubtext}>View session requests</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  welcomeContainer: {
    padding: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  navigationContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },
  navButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 150,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 12,
    marginBottom: 4,
  },
  navButtonSubtext: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
});

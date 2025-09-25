import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import PeerConnect from './peer-connect';
import PeerSettings from './peer-settings';

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

const { width } = Dimensions.get('window');

export default function PeerHome() {
  const router = useRouter();
  const [peerListener, setPeerListener] = useState<PeerListener | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [sessionStats, setSessionStats] = useState({
    activeSessions: 0,
    completedSessions: 0,
    pendingRequests: 0
  });

  useEffect(() => {
    loadPeerListenerData();
  }, []);

  useEffect(() => {
    if (peerListener) {
      loadSessionStats();
    }
  }, [peerListener]);

  const loadPeerListenerData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('currentPeerListener');
      if (storedData) {
        const data = JSON.parse(storedData);
        setPeerListener(data);
      } else {
        // No session found, redirect to login
        router.replace('/peer-listener-login');
      }
    } catch (error) {
      console.error('Error loading peer listener data:', error);
      router.replace('/peer-listener-login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionStats = async () => {
    try {
      if (!peerListener) return;

      // Fetch session statistics from database
      const { data: activeBookings, error: activeError } = await supabase
        .from('peer_connections')
        .select('id')
        .eq('peer_listener_id', peerListener.id)
        .eq('status', 'confirmed');

      const { data: completedBookings, error: completedError } = await supabase
        .from('peer_connections')
        .select('id')
        .eq('peer_listener_id', peerListener.id)
        .eq('status', 'completed');

      const { data: pendingBookings, error: pendingError } = await supabase
        .from('peer_connections')
        .select('id')
        .eq('peer_listener_id', peerListener.id)
        .eq('status', 'pending');

      if (activeError || completedError || pendingError) {
        console.error('Error fetching session stats:', { activeError, completedError, pendingError });
      }

      setSessionStats({
        activeSessions: activeBookings?.length || 0,
        completedSessions: completedBookings?.length || 0,
        pendingRequests: pendingBookings?.length || 0
      });
    } catch (error) {
      console.error('Error loading session stats:', error);
      // Keep default values on error
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('currentPeerListener');
              router.replace('/select');
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        }
      ]
    );
  };

  const renderHomeTab = () => (
    <>
      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{sessionStats.activeSessions}</Text>
          <Text style={styles.statLabel}>Active Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{sessionStats.completedSessions}</Text>
          <Text style={styles.statLabel}>Completed Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{peerListener?.training_completed ? '✓' : '✗'}</Text>
          <Text style={styles.statLabel}>Training</Text>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Peer Listener Dashboard</Text>
        
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.iconText}>{item.icon}</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  const renderConnectTab = () => (
    <PeerConnect peerListener={peerListener} />
  );

  const renderSettingsTab = () => (
    <PeerSettings peerListener={peerListener} />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeTab();
      case 'connect':
        return renderConnectTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderHomeTab();
    }
  };

  const menuItems = [
    {
      title: `Active Sessions (${sessionStats.activeSessions})`,
      subtitle: 'View ongoing peer support sessions',
      icon: '💬',
      onPress: () => {
        if (sessionStats.activeSessions > 0) {
          setActiveTab('connect');
        } else {
          Alert.alert('No Active Sessions', 'You currently have no active sessions.');
        }
      },
    },
    {
      title: `Pending Requests (${sessionStats.pendingRequests})`,
      subtitle: 'Review and respond to booking requests',
      icon: '📋',
      onPress: () => {
        setActiveTab('connect');
      },
    },
    {
      title: 'My Schedule',
      subtitle: 'Manage your availability and appointments',
      icon: '📅',
      onPress: () => Alert.alert('Coming Soon', 'Schedule management feature will be available soon'),
    },
    {
      title: 'Support Resources',
      subtitle: 'Access training materials and guidelines',
      icon: '📚',
      onPress: () => Alert.alert('Coming Soon', 'Support resources feature will be available soon'),
    },
    {
      title: 'Peer Directory',
      subtitle: 'Connect with other peer listeners',
      icon: '👥',
      onPress: () => Alert.alert('Coming Soon', 'Peer directory feature will be available soon'),
    },
    {
      title: 'Training Status',
      subtitle: 'View your training progress and certifications',
      icon: '🎓',
      onPress: () => Alert.alert('Training Status', `Training Completed: ${peerListener?.training_completed ? 'Yes' : 'No'}`),
    },
    {
      title: 'Profile Settings',
      subtitle: 'Update your profile and preferences',
      icon: '⚙️',
      onPress: () => Alert.alert('Coming Soon', 'Profile settings feature will be available soon'),
    },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.nameText}>{peerListener?.name || 'Peer Listener'}</Text>
          <Text style={styles.statusText}>
            Status: {peerListener?.status === 'approved' ? '✅ Approved' : '⏳ Pending'}
          </Text>
        </View>
      </View>

      {/* Tab Content - Flex 1 to take remaining space */}
      <View style={styles.tabContentContainer}>
        {renderTabContent()}
      </View>

      {/* Bottom Tab Navigation - Fixed at bottom */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'home' && styles.activeTab]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.activeTabText]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'connect' && styles.activeTab]}
          onPress={() => setActiveTab('connect')}
        >
          <Text style={[styles.tabText, activeTab === 'connect' && styles.activeTabText]}>🤝</Text>
          <Text style={[styles.tabLabel, activeTab === 'connect' && styles.activeTabText]}>Connect</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.activeTabText]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    backgroundColor: '#10B981',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContentContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
  },
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#E8F5E8',
  },
  tabText: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#10B981',
    fontWeight: 'bold',
  },
});

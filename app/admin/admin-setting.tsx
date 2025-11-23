import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {   Alert,   ScrollView,   Text,   TouchableOpacity,   View,   StyleSheet, 
  ActivityIndicator,  StatusBar,  RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { formatDateTime } from '@/lib/utils';


export default function AdminSetting() {
  const router = useRouter();
  const [helpMessages, setHelpMessages] = useState<{ id: string; message: string; sender_type?: string; created_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHelpMessages = async () => {
    try {
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHelpMessages();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHelpMessages();
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
              const { error } = await supabase.auth.signOut();
              
              if (error) {
                console.error('Supabase logout error:', error);
                Alert.alert('Error', 'Failed to logout properly');
              }
              
              await AsyncStorage.removeItem('adminUser');
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
              router.replace('/');
            }
          }
        }
      ]
    );
  };

  const getSenderIcon = (senderType?: string) => {
    switch (senderType?.toUpperCase()) {
      case 'STUDENT':
        return 'school-outline';
      case 'EXPERT':
        return 'medical-outline';
      case 'PEER':
        return 'people-outline';
      default:
        return 'person-outline';
    }
  };

  const getSenderColor = (senderType?: string) => {
    switch (senderType?.toUpperCase()) {
      case 'STUDENT':
        return '#4A90E2';
      case 'EXPERT':
        return '#E24A4A';
      case 'PEER':
        return '#50C878';
      default:
        return '#9B59B6';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.push('/admin/admin-home')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Ionicons name="settings-outline" size={28} color="white" />
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
          
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#6C5CE7' }]}
              onPress={() => router.push('/admin/location')}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="location" size={32} color="white" />
              </View>
              <Text style={styles.actionTitle}>Manage Location</Text>
              <Text style={styles.actionSubtitle}>View & update locations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#00B894' }]}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="refresh" size={32} color="white" />
              </View>
              <Text style={styles.actionTitle}>Refresh</Text>
              <Text style={styles.actionSubtitle}>Update help messages</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Help Messages Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="chatbubbles-outline" size={24} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Help Messages</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{helpMessages.length}</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : helpMessages.length > 0 ? (
            <View style={styles.messageList}>
              {helpMessages.map((messageObj, index) => (
                <View key={`message-${messageObj.id}-${index}`} style={styles.messageCard}>
                  <View style={styles.messageHeader}>
                    <View style={styles.senderInfo}>
                      <View 
                        style={[
                          styles.senderIconContainer, 
                          { backgroundColor: getSenderColor(messageObj.sender_type) + '20' }
                        ]}
                      >
                        <Ionicons 
                          name={getSenderIcon(messageObj.sender_type) as any} 
                          size={20} 
                          color={getSenderColor(messageObj.sender_type)} 
                        />
                      </View>
                      <Text style={[styles.senderType, { color: getSenderColor(messageObj.sender_type) }]}>
                        {messageObj.sender_type || 'Student'}
                      </Text>
                    </View>
                    <Text style={styles.timestamp}>{formatDateTime(messageObj.created_at)}</Text>
                  </View>
                  
                  <Text style={styles.messageText}>{messageObj.message}</Text>
                  
                  <View style={styles.messageDivider} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#DDD" />
              <Text style={styles.emptyTitle}>No Help Messages</Text>
              <Text style={styles.emptySubtitle}>Messages from users will appear here</Text>
            </View>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={()=> {router.push('/admin/change-password')}}
            activeOpacity={0.8}
          >
            <View style={styles.logoutContent}>
              <View style={styles.logoutIconContainer}>
                <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.logoutTextContainer}>
                <Text style={styles.logoutText}>Change Password</Text>
                <Text style={styles.logoutSubtext}>Change your account password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={styles.logoutContent}>
              <View style={styles.logoutIconContainer}>
                <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.logoutTextContainer}>
                <Text style={styles.logoutText}>Logout</Text>
                <Text style={styles.logoutSubtext}>Sign out of your account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  messageList: {
    gap: 12,
  },
  messageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  senderIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderType: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messageText: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
  },
  messageDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  logoutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logoutTextContainer: {
    flex: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  logoutSubtext: {
    fontSize: 13,
    color: '#999',
  },
});

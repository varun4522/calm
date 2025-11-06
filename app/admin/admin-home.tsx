import { useRouter } from 'expo-router';
import { JSX, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, Alert } from 'react-native';
import { supabase } from '@/lib/supabase'; // Corrected import path
import Toast from 'react-native-toast-message';

console.log('AdminHome component loaded');

export default function AdminHome() {
  const [activeTab, setActiveTab] = useState<'home' | 'settings' | 'requests' | 'BuddyConnect' | 'ai'>('home');
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [hasUnreadRequests, setHasUnreadRequests] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buddyMessages, setBuddyMessages] = useState<any[]>([]);
  const [buddyMessage, setBuddyMessage] = useState('');
  const [buddySending, setBuddySending] = useState(false);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [changingType, setChangingType] = useState(false);
  const router = useRouter();
  // Redirect to admin AI page when AI tab is selected
  useEffect(() => {
    if (activeTab === 'ai') {
      router.push('./admin-ai');
    }
  }, [activeTab]);

  // Redirect to admin settings page when settings tab is selected
  useEffect(() => {
    if (activeTab === 'settings') {
      router.push('./admin-setting');
    }
  }, [activeTab]);

  // Test database connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing database connection...');
        const { data, error } = await supabase.from('profiles').select('count');
        console.log('Connection test result:', { data, error });
      } catch (err) {
        console.error('Connection test error:', err);
      }
    };
    testConnection();
  }, []);

  // Fetch all user data from profiles table
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        console.log('Fetching users from profiles table...');

        // Fetch all profiles with their details (includes Students, Experts, Peer Listeners, and Admins)
        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, username, type, registration_number, email, course, phone_number, date_of_birth');

        console.log('Profiles results:', { data: profilesData, error: profileError });

        if (profileError) {
          console.error('Error fetching profiles:', profileError);
        }

        const allUsers: any[] = [];

        // Helper function to determine online status (if updated within last 30 minutes)
        const getOnlineStatus = (updatedAt: string) => {
          const lastUpdate = new Date(updatedAt);
          const now = new Date();
          const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
          return diffMinutes <= 30 ? 'Online' : 'Offline';
        };

        // Process profiles data (includes Students, Experts, Peer Listeners, and Admins)
        if (profilesData && profilesData.length > 0) {
          profilesData.forEach(profile => {
            allUsers.push({
              id: profile.id,
              name: profile.name,
              username: profile.username || profile.registration_number,
              reg_no: profile.registration_number,
              email: profile.email || 'N/A',
              course: profile.course || 'N/A',
              type: profile.type, // 'STUDENT', 'EXPERT', 'PEER', 'ADMIN'
              request_status: 'approved', // All users in profiles are approved
              phone: profile.phone_number || 'N/A',
              dob: profile.date_of_birth || 'N/A',
              details: 'N/A',
              category: profile.type.toLowerCase()
            });
          });
        }

        // Sort by type first (Students, Experts, Peer Listeners), then by status (online first), then by name
        allUsers.sort((a, b) => {
          if (a.type !== b.type) {
            const typeOrder: { [key: string]: number } = { 'Student': 1, 'Expert': 2, 'Peer Listener': 3 };
            return typeOrder[a.type] - typeOrder[b.type];
          }
          if (a.status !== b.status) {
            return a.status === 'Online' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        setUsers(allUsers);
        console.log('Final users array:', allUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    if (activeTab === 'home') fetchUsers();
  }, [activeTab]);

  // Fetch requests from Supabase (profiles table)
  useEffect(() => {
    const fetchRequests = async () => {
      if (activeTab === 'requests') {
        try {
          // Fetch all profiles (includes Students, Experts, Peer Listeners, and Admins)
          const { data: profilesData, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, username, type, registration_number, email, course, phone_number, date_of_birth');

          if (profileError) {
            console.error('Error fetching profiles:', profileError);
          }

          const allRequests: any[] = [];

          // Add profiles (all registered users are considered "approved")
          if (profilesData) {
            profilesData.forEach(profile => {
              allRequests.push({
                ...profile,
                request_type: 'profile',
                user_name: profile.name,
                user_type: profile.type,
                registration_number: profile.registration_number,
                phone: profile.phone_number,
                dob: profile.date_of_birth,
                status: 'approved' // All users in profiles table are approved
              });
            });
          }

          // Sort by creation date
          allRequests.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
          });

          setRequests(allRequests);

          // Set unread flag if there are pending requests
          const pendingRequests = allRequests.filter(r => r.status === 'pending');
          setHasUnreadRequests(pendingRequests.length > 0);

        } catch (error) {
          console.error('Unexpected error fetching requests:', error);
        }
      }
    };

    fetchRequests();

    // Set up real-time subscription for new profiles
    const profileSubscription = supabase
      .channel('profiles')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        async (payload) => {
          const newProfile = {
            ...payload.new,
            request_type: 'profile',
            user_name: payload.new.name,
            user_type: payload.new.type,
            registration_number: payload.new.registration_number,
            phone: payload.new.phone_number,
            dob: payload.new.date_of_birth,
            status: 'approved'
          };
          setRequests(prev => [newProfile, ...prev]);
          if (activeTab !== 'requests') {
            setHasUnreadRequests(true);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        async (payload) => {
          setRequests(prev => prev.map(req =>
            req.id === payload.new.id && req.request_type === 'profile' ? {
              ...payload.new,
              request_type: 'profile',
              user_name: payload.new.name,
              user_type: payload.new.type,
              registration_number: payload.new.registration_number,
              phone: payload.new.phone_number,
              dob: payload.new.date_of_birth,
              status: 'approved'
            } : req
          ));
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
    };
  }, [activeTab]);

  // Handle request approval/rejection for both user requests and peer listeners
  const handleRequestAction = async (requestId: number, action: 'approved' | 'rejected', requestType: string) => {
    try {
      const tableName = requestType === 'peer_listener' ? 'peer_listeners' : 'user_requests';

      // Update the request status in Supabase
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          status: action,
          processed_at: new Date().toISOString(),
          processed_by: 'admin' // You can customize this to track which admin processed it
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request:', updateError);
        return;
      }

      // If approved, create the user account (only for user_requests, not peer_listeners)
      if (action === 'approved' && requestType === 'user_request') {
        // Fetch the original request data from user_requests table to get the password
        const { data: originalRequest, error: fetchError } = await supabase
          .from('user_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (fetchError || !originalRequest) {
          console.error('Error fetching original request data:', fetchError);
          return;
        }

        if (originalRequest.user_type === 'Student') {
          // Create student account
          const { error: studentError } = await supabase
            .from('students')
            .insert([{
              user_name: originalRequest.user_name,
              username: originalRequest.username || originalRequest.registration_number,
              registration_number: originalRequest.registration_number,
              email: originalRequest.email,
              course: originalRequest.course || 'Not Specified',
              password: originalRequest.password,
              phone: originalRequest.phone,
              dob: originalRequest.dob
            }]);

          if (studentError) {
            console.error('Error creating student account:', studentError);
            alert('Error creating student account. Please try again.');
          } else {
            console.log('Student account created successfully');
            alert('Student account created successfully! They can now login.');
          }
        } else if (originalRequest.user_type === 'Expert') {
          // Create expert account
          const { error: expertError } = await supabase
            .from('experts')
            .insert([{
              user_name: originalRequest.user_name,
              username: originalRequest.username || originalRequest.registration_number,
              registration_number: originalRequest.registration_number,
              email: originalRequest.email,
              specialization: originalRequest.course || 'General', // Use course as specialization
              password: originalRequest.password,
              phone: originalRequest.phone,
              dob: originalRequest.dob
            }]);

          if (expertError) {
            console.error('Error creating expert account:', expertError);
            alert('Error creating expert account. Please try again.');
          } else {
            console.log('Expert account created successfully');
            alert('Expert account created successfully! They can now login.');
          }
        } else if (originalRequest.user_type === 'Peer Listener') {
          // Create peer listener account
          const { error: peerError } = await supabase
            .from('peer_listeners')
            .insert([{
              user_name: originalRequest.user_name,
              username: originalRequest.username || originalRequest.registration_number,
              registration_number: originalRequest.registration_number,
              email: originalRequest.email,
              password: originalRequest.password,
              phone: originalRequest.phone,
              dob: originalRequest.dob
            }]);

          if (peerError) {
            console.error('Error creating peer listener account:', peerError);
            alert('Error creating peer listener account. Please try again.');
          } else {
            console.log('Peer listener account created successfully');
            alert('Peer listener account created successfully! They can now login.');
          }
        }
      }

      // Update local state
      setRequests(prev => prev.map(req =>
        req.id === requestId && req.request_type === requestType ? { ...req, status: action } : req
      ));

      // Update unread status
      const updatedRequests = requests.map(req =>
        req.id === requestId && req.request_type === requestType ? { ...req, status: action } : req
      );
      const pendingCount = updatedRequests.filter(r => r.status === 'pending').length;
      setHasUnreadRequests(pendingCount > 0);

      // Show success message for the action
      if (action === 'approved') {
        alert(`Request approved successfully!`);
      } else if (action === 'rejected') {
        alert(`Request rejected successfully.`);
      }

    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  // Fetch buddy messages
  useEffect(() => {
    const fetchBuddyMessages = async () => {
      if (activeTab === 'BuddyConnect') {
        try {
          const { data, error } = await supabase
            .from('buddy_messages')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching buddy messages:', error);
          } else if (data) {
            setBuddyMessages(data);
          }
        } catch (error) {
          console.error('Unexpected error fetching buddy messages:', error);
        }
      }
    };

    fetchBuddyMessages();

    // Set up real-time subscription for buddy messages
    const subscription = supabase
      .channel('buddy_messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'buddy_messages' },
        async (payload) => {
          setBuddyMessages(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeTab]);

  const handleSendBuddyMessage = async () => {
    if (!buddyMessage.trim()) {
      console.log('Cannot send admin message - empty input');
      return;
    }

    setBuddySending(true);
    console.log('Admin sending buddy message:', buddyMessage.trim());

    try {
      const messageData = {
        sender_type: 'admin',
        sender_reg: 'admin_001',
        sender_name: 'Admin',
        content: buddyMessage.trim(),
        created_at: new Date().toISOString(),
        is_global: true
      };

      const { data, error } = await supabase.from('buddy_messages').insert([messageData]);

      if (error) {
        console.error('Error sending admin buddy message:', error);
      } else {
        console.log('Admin buddy message sent successfully:', data);
        setBuddyMessage('');
      }
    } catch (error) {
      console.error('Unexpected error sending admin buddy message:', error);
    } finally {
      setBuddySending(false);
    }
  };

  const handleChangeUserType = async (newType: string) => {
    if (!selectedUser) return;
    
    setChangingType(true);
    console.log(`🔄 Changing user type for ${selectedUser.name} from ${selectedUser.type} to ${newType}`);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ type: newType })
        .eq('id', selectedUser.id)
        .select();

      if (error) {
        console.error('❌ Error updating user type:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to update user type',
          text2: error.message,
          position: 'bottom',
          visibilityTime: 3000
        });
        return;
      }

      console.log('✅ User type updated successfully:', data);
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, type: newType, category: newType.toLowerCase() }
          : u
      ));
      
      setRequests(prev => prev.map(r => 
        r.id === selectedUser.id 
          ? { ...r, type: newType, user_type: newType }
          : r
      ));

      Toast.show({
        type: 'success',
        text1: 'User type updated',
        text2: `${selectedUser.name} is now ${newType}`,
        position: 'bottom',
        visibilityTime: 2000
      });

      setShowUserTypeModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('❌ Unexpected error updating user type:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to update user type',
        text2: 'An unexpected error occurred',
        position: 'bottom',
        visibilityTime: 3000
      });
    } finally {
      setChangingType(false);
    }
  };

  let Content: JSX.Element | null = null;
  // Logout handler (make available for settings tab)
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/'); // Navigate to main login page
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (activeTab === 'home') {
    Content = (
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ color: '#FFB347', fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>Admin Home</Text>

          {/* Debug Button */}
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#f39c12',
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 15,
              }}
              onPress={async () => {
                console.log('Debug button pressed');
                setLoading(true);
                try {
                  const { data: userRequests, error: requestError } = await supabase.from('user_requests').select('*');
                  const { data: students, error: studentError } = await supabase.from('students').select('*');
                  const { data: experts, error: expertError } = await supabase.from('experts').select('*');
                  const { data: peerListeners, error: peerError } = await supabase.from('peer_listeners').select('*');
                  console.log('User Requests:', userRequests, 'Error:', requestError);
                  console.log('Students:', students, 'Error:', studentError);
                  console.log('Experts:', experts, 'Error:', expertError);
                  console.log('Peer Listeners:', peerListeners, 'Error:', peerError);
                } catch (error) {
                  console.error('Debug error:', error);
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Text style={{ color: '#222', fontSize: 14, fontWeight: 'bold' }}>Debug DB</Text>
            </TouchableOpacity>
          </View>

          {/* User Statistics */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, backgroundColor: '#111', borderRadius: 12, padding: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#1e90ff', fontSize: 24, fontWeight: 'bold' }}>
                {users.filter(u => u.type === 'Student').length}
              </Text>
              <Text style={{ color: 'white', fontSize: 12 }}>Students</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#7965AF', fontSize: 24, fontWeight: 'bold' }}>
                {users.filter(u => u.type === 'Expert').length}
              </Text>
              <Text style={{ color: 'white', fontSize: 12 }}>Experts</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#8b5cf6', fontSize: 24, fontWeight: 'bold' }}>
                {users.filter(u => u.type === 'Peer Listener').length}
              </Text>
              <Text style={{ color: 'white', fontSize: 12 }}>Peer Listeners</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#2ecc71', fontSize: 24, fontWeight: 'bold' }}>
                {users.filter(u => u.request_status === 'approved').length}
              </Text>
              <Text style={{ color: 'white', fontSize: 12 }}>Approved</Text>
            </View>
          </View>

          <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>All User ({users.length})</Text>

          {loading ? (
            <View style={{ alignItems: 'center', marginTop: 40, backgroundColor: '#111', borderRadius: 12, padding: 20 }}>
              <Text style={{ color: '#FFB347', fontSize: 18, marginBottom: 8 }}>Loading users...</Text>
              <Text style={{ color: '#666', fontSize: 14 }}>Please wait while we fetch all user data</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40, backgroundColor: '#111', borderRadius: 12, padding: 20 }}>
              <Text style={{ color: '#aaa', fontSize: 18, marginBottom: 8 }}>No user found</Text>
              <Text style={{ color: '#666', fontSize: 14 }}>User registration requests will appear here</Text>
            </View>
          ) : (
            users.map((user, idx) => (
              <View key={`${user.type}-${user.id}`} style={{
                backgroundColor: '#222',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: user.request_status === 'approved' ? '#2ecc71' :
                  user.request_status === 'pending' ? '#f39c12' : '#e74c3c',
                elevation: 3,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}>
                {/* Header Row with Profile Info */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFB347', fontWeight: 'bold', fontSize: 20, marginBottom: 2 }}>{user.user_name}</Text>
                    <Text style={{ color: '#888', fontSize: 13 }}>User ID: {user.id}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{
                      backgroundColor: user.type === 'Student' ? '#1e90ff' : '#7965AF',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      marginBottom: 8
                    }}>
                      <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>{user.type}</Text>
                    </View>
                    <View style={{
                      backgroundColor: user.request_status === 'approved' ? '#2ecc71' :
                        user.request_status === 'pending' ? '#f39c12' : '#e74c3c',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      marginBottom: 6
                    }}>
                      <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>
                        {user.request_status?.toUpperCase() || 'UNKNOWN'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Comprehensive Details Section */}
                <View style={{ backgroundColor: '#111', borderRadius: 10, padding: 14 }}>
                  {/* Registration Details */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#FFB347', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>📋 Registration Details</Text>
                    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>REGISTRATION NUMBER</Text>
                        <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>{user.reg_no || 'N/A'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>PHONE NUMBER</Text>
                         <Text style={{ color: 'white', fontSize: 14 }}>{user.phone}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Request Details Section */}
                  {user.details && user.details !== 'N/A' && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ color: '#9b59b6', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>📝 Request Details</Text>
                      <View style={{ backgroundColor: '#0a0a0a', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#444' }}>
                        <Text style={{ color: 'white', fontSize: 13, lineHeight: 18 }}>{user.details}</Text>
                      </View>
                    </View>
                  )}

                  {/* Student-specific comprehensive details */}
                  {user.type === 'Student' && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ color: '#1e90ff', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>🎓 Student Information</Text>
                      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>EMAIL ADDRESS</Text>
                          <Text style={{ color: 'white', fontSize: 13 }}>{user.email}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>COURSE/PROGRAM</Text>
                          <Text style={{ color: 'white', fontSize: 13 }}>{user.course}</Text>
                        </View>
                      </View>
                      {user.username && user.username !== user.reg_no && (
                        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>USERNAME</Text>
                            <Text style={{ color: '#FFD600', fontSize: 13, fontWeight: 'bold' }}>@{user.username}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>REG NUMBER</Text>
                            <Text style={{ color: 'white', fontSize: 13 }}>{user.reg_no}</Text>
                          </View>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>STUDENT ROLE</Text>
                          <Text style={{ color: '#1e90ff', fontSize: 13, fontWeight: 'bold' }}>Student User</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>ACCOUNT TYPE</Text>
                          <Text style={{ color: '#1e90ff', fontSize: 13, fontWeight: 'bold' }}>Academic Account</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Expert-specific comprehensive details */}
                  {user.type === 'Expert' && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ color: '#7965AF', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>👨‍⚕️ Expert Information</Text>
                      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>EXPERT ID</Text>
                          <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>{user.reg_no}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>PROFESSION</Text>
                          <Text style={{ color: '#7965AF', fontSize: 13, fontWeight: 'bold' }}>Mental Health Expert</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>SPECIALIZATION</Text>
                          <Text style={{ color: 'white', fontSize: 13 }}>Mental Health Support & Counseling</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>AVAILABILITY STATUS</Text>
                          <Text style={{ color: user.status === 'Online' ? '#2ecc71' : '#e74c3c', fontSize: 13, fontWeight: 'bold' }}>
                            {user.status === 'Online' ? 'Available for Support' : 'Currently Unavailable'}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>EXPERT ROLE</Text>
                          <Text style={{ color: '#7965AF', fontSize: 13, fontWeight: 'bold' }}>Mental Health Professional</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>ACCOUNT TYPE</Text>
                          <Text style={{ color: '#7965AF', fontSize: 13, fontWeight: 'bold' }}>Professional Account</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Change User Type Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#9b59b6',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                    }}
                    onPress={() => {
                      setSelectedUser(user);
                      setShowUserTypeModal(true);
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', marginRight: 8 }}>🔄 Change User Type</Text>
                    <View style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8
                    }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Current: {user.type}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
    // Logout handler
    const handleLogout = async () => {
      try {
        await supabase.auth.signOut();
        router.replace('/'); // Navigate to main login page
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

  } else if (activeTab === 'settings') {
    Content = null; // Navigation handled in useEffect
  } else if (activeTab === 'requests') {
    Content = (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>User Requests</Text>

        {/* Request Statistics */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, backgroundColor: '#111', borderRadius: 12, padding: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#f39c12', fontSize: 24, fontWeight: 'bold' }}>
              {requests.filter(r => r.status === 'pending').length}
            </Text>
            <Text style={{ color: 'white', fontSize: 12 }}>Pending</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#2ecc71', fontSize: 24, fontWeight: 'bold' }}>
              {requests.filter(r => r.status === 'approved').length}
            </Text>
            <Text style={{ color: 'white', fontSize: 12 }}>Approved</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#e74c3c', fontSize: 24, fontWeight: 'bold' }}>
              {requests.filter(r => r.status === 'rejected').length}
            </Text>
            <Text style={{ color: 'white', fontSize: 12 }}>Rejected</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#FFB347', fontSize: 24, fontWeight: 'bold' }}>
              {requests.length}
            </Text>
            <Text style={{ color: 'white', fontSize: 12 }}>Total</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {requests.length === 0 ? (
            <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>No requests found.</Text>
          ) : (
            requests.map((request, idx) => (
              <View key={`request-${request.id}-${idx}`} style={{
                backgroundColor: '#222',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: request.status === 'pending' ? '#f39c12' :
                  request.status === 'approved' ? '#2ecc71' : '#e74c3c'
              }}>
                {/* Request Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFB347', fontWeight: 'bold', fontSize: 18 }}>{request.user_name}</Text>
                    <Text style={{ color: 'white', fontSize: 14, marginTop: 2 }}>{request.user_type} Registration</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{
                      backgroundColor: request.user_type === 'Student' ? '#1e90ff' :
                        request.user_type === 'Expert' ? '#7965AF' : '#10B981',
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 12,
                      marginBottom: 6
                    }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{request.user_type}</Text>
                    </View>
                    <View style={{
                      backgroundColor: request.status === 'pending' ? '#f39c12' :
                        request.status === 'approved' ? '#2ecc71' : '#e74c3c',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8
                    }}>
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                        {request.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Request Details */}
                <View style={{ backgroundColor: '#111', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>REQUEST DETAILS</Text>
                  <Text style={{ color: 'white', fontSize: 14, lineHeight: 20 }}>
                    {request.request_type === 'peer_listener' ? 'Peer Listener application request' : `${request.user_type} account registration request`}
                  </Text>

                  <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 8 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>REG NUMBER</Text>
                      <Text style={{ color: 'white', fontSize: 12 }}>{request.registration_number}</Text>
                    </View>
                    {((request.user_type === 'Student' && request.email) || (request.request_type === 'peer_listener' && request.email)) && (
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>EMAIL</Text>
                        <Text style={{ color: 'white', fontSize: 12 }}>{request.email}</Text>
                      </View>
                    )}
                  </View>

                  {request.user_type === 'Student' && request.course && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>COURSE</Text>
                      <Text style={{ color: 'white', fontSize: 12 }}>{request.course}</Text>
                    </View>
                  )}

                  {request.request_type === 'peer_listener' && request.experience && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>EXPERIENCE</Text>
                      <Text style={{ color: 'white', fontSize: 12 }}>{request.experience}</Text>
                    </View>
                  )}

                  {request.request_type === 'peer_listener' && request.availability && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>AVAILABILITY</Text>
                      <Text style={{ color: 'white', fontSize: 12 }}>{request.availability}</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>SUBMITTED</Text>
                      <Text style={{ color: 'white', fontSize: 12 }}>{new Date(request.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>REQUEST ID</Text>
                      <Text style={{ color: 'white', fontSize: 12 }}>#{request.id}</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons for Pending Requests */}
                {request.status === 'pending' && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#2ecc71',
                        paddingVertical: 8,
                        paddingHorizontal: 20,
                        borderRadius: 8,
                        flex: 0.48
                      }}
                      onPress={() => handleRequestAction(request.id, 'approved', request.request_type)}
                    >
                      <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#e74c3c',
                        paddingVertical: 8,
                        paddingHorizontal: 20,
                        borderRadius: 8,
                        flex: 0.48
                      }}
                      onPress={() => handleRequestAction(request.id, 'rejected', request.request_type)}
                    >
                      <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  } else if (activeTab === 'BuddyConnect') {
    Content = (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'black' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ color: '#FFB347', fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>Buddy Connect</Text>
          <ScrollView style={{ flex: 1, marginBottom: 16 }}>
            {buddyMessages && buddyMessages.length === 0 ? (
              <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>No buddy messages yet.</Text>
            ) : (
              buddyMessages.map(msg => (
                <View key={msg.id} style={{ marginBottom: 18, backgroundColor: '#222', borderRadius: 10, padding: 12 }}>
                  <Text style={{ color: msg.sender_type === 'admin' ? '#FFB347' : msg.sender_type === 'expert' ? '#7965AF' : '#1e90ff', fontWeight: 'bold', fontSize: 16 }}>{msg.sender_name || msg.sender_type} ({msg.sender_reg})</Text>
                  <Text style={{ color: '#aaa', fontSize: 12, marginTop: 2, marginBottom: 8 }}>{new Date(msg.created_at).toLocaleString()}</Text>
                  <View style={{ backgroundColor: '#111', borderRadius: 8, padding: 12, minHeight: 60, borderWidth: 1, borderColor: '#444' }}>
                    <Text style={{ color: 'white', fontSize: 16, lineHeight: 22 }}>{msg.content}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', borderRadius: 8, padding: 8 }}>
            <TextInput
              value={buddyMessage}
              onChangeText={setBuddyMessage}
              placeholder="Type your message..."
              placeholderTextColor="#aaa"
              style={{ flex: 1, color: 'white', padding: 12, fontSize: 16 }}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSendBuddyMessage}
            />
            <TouchableOpacity
              onPress={handleSendBuddyMessage}
              disabled={buddySending || !buddyMessage.trim()}
              style={{
                backgroundColor: buddySending ? '#aaa' : (buddyMessage.trim() ? '#FFB347' : '#666'),
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: 8,
                marginLeft: 8
              }}
            >
              <Text style={{ color: '#222', fontWeight: 'bold' }}>{buddySending ? 'Sending...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  } else if (activeTab === 'ai') {
    // Show placeholder while redirecting
    Content = (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#FFB347', fontSize: 24, fontWeight: 'bold' }}>Redirecting to Admin AI...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>{Content}</View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'home' && styles.activeTabItem]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabIcon, activeTab === 'home' && styles.activeTabIcon]}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.activeTabLabel]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ai' && styles.activeTabItem]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabIcon, activeTab === 'ai' && styles.activeTabIcon]}>🤖</Text>
          <Text style={[styles.tabLabel, activeTab === 'ai' && styles.activeTabLabel]}>AI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'requests' && styles.activeTabItem]}
          onPress={() => setActiveTab('requests')}
        >
          <View style={styles.tabIconContainer}>
            <Text style={[styles.tabIcon, activeTab === 'requests' && styles.activeTabIcon]}>📋</Text>
            {hasUnreadRequests && (
              <View style={styles.redDot} />
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'requests' && styles.activeTabLabel]}>Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'settings' && styles.activeTabItem]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabIcon, activeTab === 'settings' && styles.activeTabIcon]}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.activeTabLabel]}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'BuddyConnect' && styles.activeTabItem]}
          onPress={() => setActiveTab('BuddyConnect')}
        >
          <Text style={[styles.tabIcon, activeTab === 'BuddyConnect' && styles.activeTabIcon]}>💬</Text>
          <Text style={[styles.tabLabel, activeTab === 'BuddyConnect' && styles.activeTabLabel]}>Buddy</Text>
        </TouchableOpacity>
      </View>

      {/* User Type Change Modal */}
      <Modal
        visible={showUserTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowUserTypeModal(false);
          setSelectedUser(null);
        }}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#222',
            borderRadius: 20,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            borderWidth: 2,
            borderColor: '#9b59b6'
          }}>
            <Text style={{
              color: '#FFB347',
              fontSize: 24,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 8
            }}>
              🔄 Change User Type
            </Text>
            
            {selectedUser && (
              <>
                <Text style={{
                  color: '#aaa',
                  fontSize: 14,
                  textAlign: 'center',
                  marginBottom: 20
                }}>
                  Change type for: <Text style={{ color: 'white', fontWeight: 'bold' }}>{selectedUser.name}</Text>
                  {'\n'}
                  Current type: <Text style={{ color: '#9b59b6', fontWeight: 'bold' }}>{selectedUser.type}</Text>
                </Text>

                <View style={{ marginBottom: 20 }}>
                  {['STUDENT', 'PEER', 'EXPERT', 'ADMIN'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={{
                        backgroundColor: selectedUser.type === type ? '#9b59b6' : '#333',
                        paddingVertical: 14,
                        paddingHorizontal: 20,
                        borderRadius: 12,
                        marginBottom: 10,
                        borderWidth: 2,
                        borderColor: selectedUser.type === type ? '#FFB347' : '#444',
                        elevation: selectedUser.type === type ? 4 : 2,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onPress={() => handleChangeUserType(type)}
                      disabled={changingType || selectedUser.type === type}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, marginRight: 12 }}>
                          {type === 'STUDENT' ? '🎓' : type === 'PEER' ? '👥' : type === 'EXPERT' ? '🩺' : '👑'}
                        </Text>
                        <Text style={{
                          color: 'white',
                          fontSize: 16,
                          fontWeight: 'bold'
                        }}>
                          {type}
                        </Text>
                      </View>
                      {selectedUser.type === type && (
                        <Text style={{ color: '#FFB347', fontSize: 14, fontWeight: 'bold' }}>✓ Current</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {changingType && (
                  <Text style={{
                    color: '#f39c12',
                    textAlign: 'center',
                    marginBottom: 16,
                    fontSize: 14
                  }}>
                    Updating user type...
                  </Text>
                )}
              </>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: '#e74c3c',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 10,
                elevation: 3
              }}
              onPress={() => {
                setShowUserTypeModal(false);
                setSelectedUser(null);
              }}
              disabled={changingType}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 15,
    paddingBottom: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabItem: {
    backgroundColor: 'transparent',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
    color: 'white',
  },
  activeTabIcon: {
    color: '#FFB347',
  },
  tabLabel: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#FFB347',
    fontWeight: 'bold',
  },
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
  },
});


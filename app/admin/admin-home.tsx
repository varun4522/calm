import { useRouter } from 'expo-router';
import { JSX, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, Alert, FlatList, Image } from 'react-native';
import * as Updates from 'expo-updates';
import { supabase } from '@/lib/supabase';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime, uploadMediaToSupabase, pickMediaFromGallery } from '@/lib/utils';
import { profilePics } from '@/constants/ProfilePhotos';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '@/lib/notificationService';

console.log('AdminHome component loaded');

export default function AdminHome() {
  const [activeTab, setActiveTab] = useState<'home' | 'settings' | 'BuddyConnect'>('home');
  const [users, setUsers] = useState<any[]>([]);
  const [userTypeFilter, setUserTypeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [adminRegNo, setAdminRegNo] = useState('');
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [changingType, setChangingType] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const router = useRouter();


  // Redirect to admin settings page when settings tab is selected
  useEffect(() => {
    if (activeTab === 'settings') {
      router.push('./admin-setting');
    }
  }, [activeTab]);

  // Fetch posts when community tab is active
  useEffect(() => {
    if (activeTab === 'BuddyConnect') {
      fetchPosts();
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
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'home') {
      fetchUsers();

      // Set up real-time subscription for profile changes
      const profileSubscription = supabase
        .channel('admin_profiles_realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'profiles' },
          (payload) => {
            console.log('New profile added:', payload.new);
            const newProfile = payload.new as any;
            const newUser = {
              id: newProfile.id,
              name: newProfile.name,
              username: newProfile.username || newProfile.registration_number,
              reg_no: newProfile.registration_number,
              email: newProfile.email || 'N/A',
              course: newProfile.course || 'N/A',
              type: newProfile.type,
              request_status: 'approved',
              phone: newProfile.phone_number || 'N/A',
              dob: newProfile.date_of_birth || 'N/A',
              details: 'N/A',
              category: newProfile.type?.toLowerCase()
            };
            setUsers(prev => [...prev, newUser]);
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          (payload) => {
            console.log('Profile updated:', payload.new);
            const updatedProfile = payload.new as any;
            setUsers(prev => prev.map(user =>
              user.id === updatedProfile.id ? {
                ...user,
                name: updatedProfile.name,
                username: updatedProfile.username || updatedProfile.registration_number,
                email: updatedProfile.email || 'N/A',
                course: updatedProfile.course || 'N/A',
                type: updatedProfile.type,
                phone: updatedProfile.phone_number || 'N/A',
                dob: updatedProfile.date_of_birth || 'N/A',
                category: updatedProfile.type?.toLowerCase()
              } : user
            ));
          }
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'profiles' },
          (payload) => {
            console.log('Profile deleted:', payload.old);
            setUsers(prev => prev.filter(user => user.id !== (payload.old as any).id));
          }
        )
        .subscribe();

      return () => {
        profileSubscription.unsubscribe();
      };
    }
  }, [activeTab]);

  // Community functions
  const pickMedia = async () => {
    try {
      const result = await pickMediaFromGallery();
      if (result) {
        setSelectedMedia(result);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const createPost = async () => {
    if (!postText.trim() && !selectedMedia) {
      Alert.alert('Error', 'Please add some text or media to your post.');
      return;
    }

    setIsPosting(true);
    try {
      let mediaUrl = null;

      if (selectedMedia) {
        try {
          mediaUrl = await uploadMediaToSupabase(selectedMedia.uri, selectedMedia.type);
        } catch (mediaError) {
          Alert.alert('Error', `Failed to upload media: ${mediaError instanceof Error ? mediaError.message : 'Unknown error'}`);
          return;
        }
      }

      const { data, error } = await supabase
        .from('community_post')
        .insert([
          {
            user_id: adminRegNo || 'admin',
            content: postText.trim(),
            media_url: mediaUrl,
            media_type: selectedMedia?.type || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      Alert.alert('Success', 'Post created successfully!');
      setModalVisible(false);
      setPostText('');
      setSelectedMedia(null);
      fetchPosts();

    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', `Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPosting(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const { data, error } = await supabase
        .from('community_post')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        Alert.alert('Error', 'Failed to load posts');
        return;
      }

      const postsWithUserData = await Promise.all(
        (data || []).map(async (post) => {
          try {
            let username = `User ${post.user_id}`;
            
            const { data: userData } = await supabase
              .from('user_requests')
              .select('username, name')
              .eq('registration_number', post.user_id)
              .single();

            if (userData) {
              username = userData.name || userData.username || `User ${post.user_id}`;
            }

            return {
              ...post,
              username,
              profilePicIndex: Math.floor(Math.random() * profilePics.length)
            };
          } catch (error) {
            return {
              ...post,
              username: `User ${post.user_id}`,
              profilePicIndex: 0
            };
          }
        })
      );

      setPosts(postsWithUserData);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const deletePost = async (post: any) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Attempting to delete post with ID:', post.id);
              
              const { data, error } = await supabase
                .from('community_post')
                .delete()
                .eq('id', post.id)
                .select();

              if (error) {
                console.error('❌ Delete error:', error);
                Alert.alert(
                  'Delete Failed', 
                  `Error: ${error.message}\n\nThis might be a permissions issue. Please check:\n1. Admin has delete permissions\n2. Row Level Security policies allow deletion`
                );
                return;
              }

              console.log('✅ Post deleted successfully:', data);
              Alert.alert('Success', 'Post deleted successfully');
              fetchPosts();
            } catch (error: any) {
              console.error('❌ Unexpected error deleting post:', error);
              Alert.alert('Error', `Failed to delete post: ${error.message || 'Unknown error'}`);
            }
          }
        }
      ]
    );
  };

  const updatePost = async () => {
    if (!editingPost) return;
    
    if (!postText.trim() && !selectedMedia) {
      Alert.alert('Empty Post', 'Please add some text or media');
      return;
    }

    setIsPosting(true);
    try {
      console.log('📝 Updating post with ID:', editingPost.id);
      
      let mediaUrl = editingPost.media_url;
      let mediaType = editingPost.media_type;

      // Upload new media if changed
      if (selectedMedia && selectedMedia.uri !== editingPost.media_url) {
        console.log('📤 Uploading new media...');
        const uploadedUrl = await uploadMediaToSupabase(selectedMedia.uri, selectedMedia.type);
        if (uploadedUrl) {
          mediaUrl = uploadedUrl;
          mediaType = selectedMedia.type;
        }
      } else if (!selectedMedia) {
        // Media was removed
        mediaUrl = null;
        mediaType = null;
      }

      const { data, error } = await supabase
        .from('community_post')
        .update({
          content: postText.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
        })
        .eq('id', editingPost.id)
        .select();

      if (error) {
        console.error('❌ Update error:', error);
        Alert.alert('Update Failed', `Error: ${error.message}`);
        return;
      }

      console.log('✅ Post updated successfully:', data);
      Alert.alert('Success', 'Post updated successfully');
      
      setEditModalVisible(false);
      setPostText('');
      setSelectedMedia(null);
      setEditingPost(null);
      fetchPosts();
    } catch (error: any) {
      console.error('❌ Error updating post:', error);
      Alert.alert('Error', `Failed to update post: ${error.message || 'Unknown error'}`);
    } finally {
      setIsPosting(false);
    }
  };

  const openComments = async (post: any) => {
    setSelectedPostForComments(post);
    setCommentsModalVisible(true);
    await fetchComments(post.id);
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comment')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      const commentsWithUserData = await Promise.all(
        (data || []).map(async (comment) => {
          let username = `User ${comment.user_id}`;
          let userLabel = 'USER';

          if (comment.user_id === 'admin' || String(comment.user_id).toLowerCase().includes('admin')) {
            username = 'Admin';
            userLabel = 'ADMIN';
          } else {
            const { data: userData } = await supabase
              .from('profiles')
              .select('name, username, type, registration_number')
              .eq('registration_number', comment.user_id)
              .single();

            if (userData) {
              username = userData.username || userData.name || `User ${comment.user_id}`;
              
              if (userData.type === 'EXPERT') {
                userLabel = 'EXPERT';
              } else if (userData.type === 'PEER') {
                userLabel = 'PEER LISTENER';
              } else {
                userLabel = userData.registration_number ? `USER (${userData.registration_number})` : 'USER';
              }
            } else {
              userLabel = `USER (${comment.user_id})`;
            }
          }

          return {
            ...comment,
            username,
            userLabel
          };
        })
      );

      setComments(commentsWithUserData);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedPostForComments) return;

    try {
      const { error } = await supabase
        .from('post_comment')
        .insert([{
          post_id: selectedPostForComments.id,
          user_id: adminRegNo || 'admin',
          content: newComment.trim(),
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      setNewComment('');
      await fetchComments(selectedPostForComments.id);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const deleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('post_comment')
                .delete()
                .eq('id', commentId);

              if (error) throw error;

              if (selectedPostForComments) {
                await fetchComments(selectedPostForComments.id);
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
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
          <Text style={{ color: '#FFB347', fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>Admin Home</Text>

          {/* Search Input */}
          <View style={{ marginBottom: 16 }}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name, email, registration number..."
              placeholderTextColor="#888"
              style={{
                backgroundColor: '#222',
                color: 'white',
                padding: 14,
                borderRadius: 12,
                fontSize: 16,
                borderWidth: 2,
                borderColor: searchQuery ? '#FFB347' : '#444'
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 12,
                  backgroundColor: '#e74c3c',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

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
            <TouchableOpacity 
              style={{ 
                alignItems: 'center', 
                backgroundColor: userTypeFilter === 'STUDENT' ? '#1e90ff30' : 'transparent',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: userTypeFilter === 'STUDENT' ? 2 : 0,
                borderColor: '#1e90ff'
              }}
              onPress={() => setUserTypeFilter(userTypeFilter === 'STUDENT' ? null : 'STUDENT')}
            >
              <Text style={{ color: '#1e90ff', fontSize: 24, fontWeight: 'bold' }}>
                {users.filter(u => u.type === 'STUDENT').length}
              </Text>
              <Text style={{ color: 'white', fontSize: 12 }}>Students</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ 
                alignItems: 'center',
                backgroundColor: userTypeFilter === 'EXPERT' ? '#7965AF30' : 'transparent',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: userTypeFilter === 'EXPERT' ? 2 : 0,
                borderColor: '#7965AF'
              }}
              onPress={() => setUserTypeFilter(userTypeFilter === 'EXPERT' ? null : 'EXPERT')}
            >
              <Text style={{ color: '#7965AF', fontSize: 24, fontWeight: 'bold' }}>
                {users.filter(u => u.type === 'EXPERT').length}
              </Text>
              <Text style={{ color: 'white', fontSize: 12 }}>Experts</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ 
                alignItems: 'center',
                backgroundColor: userTypeFilter === 'PEER' ? '#8b5cf630' : 'transparent',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: userTypeFilter === 'PEER' ? 2 : 0,
                borderColor: '#8b5cf6'
              }}
              onPress={() => setUserTypeFilter(userTypeFilter === 'PEER' ? null : 'PEER')}
            >
              <Text style={{ color: '#8b5cf6', fontSize: 24, fontWeight: 'bold' }}>
                {users.filter(u => u.type === 'PEER').length}
              </Text>
              <Text style={{ color: 'white', fontSize: 12 }}>Peer Listeners</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ 
                alignItems: 'center',
                backgroundColor: userTypeFilter === 'ALL' ? '#2ecc7130' : 'transparent',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: userTypeFilter === 'ALL' ? 2 : 0,
                borderColor: '#2ecc71'
              }}
              onPress={() => setUserTypeFilter(null)}
            >
              <Text style={{ color: '#2ecc71', fontSize: 24, fontWeight: 'bold' }}>
                {users.length}
              </Text>
              <Text style={{ color: 'white', fontSize: 12 }}>All Users</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>
              {userTypeFilter === 'STUDENT' ? 'Students' : 
               userTypeFilter === 'EXPERT' ? 'Experts' : 
               userTypeFilter === 'PEER' ? 'Peer Listeners' : 
               'All Users'} ({userTypeFilter ? users.filter(u => u.type === userTypeFilter).length : users.length})
            </Text>
            {userTypeFilter && (
              <TouchableOpacity
                onPress={() => setUserTypeFilter(null)}
                style={{ backgroundColor: '#e74c3c', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>

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
            users
              .filter(u => !userTypeFilter || u.type === userTypeFilter)
              .filter(u => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase().trim();
                return (
                  (u.name && u.name.toLowerCase().includes(query)) ||
                  (u.email && u.email.toLowerCase().includes(query)) ||
                  (u.reg_no && String(u.reg_no).toLowerCase().includes(query)) ||
                  (u.username && u.username.toLowerCase().includes(query)) ||
                  (u.phone && String(u.phone).includes(query))
                );
              })
              .map((user, idx) => (
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
                    <Text style={{ color: '#FFB347', fontWeight: 'bold', fontSize: 20, marginBottom: 2 }}>{user.name}</Text>
                    <Text style={{ color: '#888', fontSize: 13 }}>User ID: {user.id}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{
                      backgroundColor: user.type === 'STUDENT' ? '#1e90ff' : 
                                      user.type === 'EXPERT' ? '#7965AF' : 
                                      user.type === 'PEER' ? '#8b5cf6' : '#FFB347',
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
  } else if (activeTab === 'BuddyConnect') {
    Content = (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 15,
        }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFB347' }}>Community</Text>
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={28} color="#FFB347" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{
              backgroundColor: '#222',
              margin: 10,
              borderRadius: 15,
              padding: 15,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <Image
                  source={profilePics[item.profilePicIndex || 0]}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: 10,
                    borderWidth: 2,
                    borderColor: '#FFB347',
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                    {item.username}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#888' }}>
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>
              </View>

              {item.content && (
                <Text style={{
                  fontSize: 16,
                  color: 'white',
                  marginBottom: 10,
                  lineHeight: 22,
                }}>
                  {item.content}
                </Text>
              )}

              {item.media_url && (
                <View style={{ marginBottom: 10 }}>
                  {item.media_type === 'image' ? (
                    <Image
                      source={{ uri: item.media_url }}
                      style={{
                        width: '100%',
                        height: 200,
                        borderRadius: 10,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: '100%',
                      height: 200,
                      backgroundColor: '#000',
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name="videocam" size={48} color="white" />
                      <Text style={{ color: 'white', marginTop: 10, fontSize: 14 }}>Video</Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 8,
                  backgroundColor: '#111',
                  borderRadius: 8,
                  alignSelf: 'flex-start',
                  marginTop: 5
                }}
                onPress={() => openComments(item)}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#FFB347" />
                <Text style={{ marginLeft: 5, color: '#FFB347', fontSize: 14, fontWeight: '600' }}>
                  Comments
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            loadingPosts ? (
              <View style={{ alignItems: 'center', padding: 50 }}>
                <Text style={{ color: '#888', fontSize: 16 }}>Loading posts...</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', padding: 50 }}>
                <Text style={{ color: '#888', fontSize: 16 }}>No posts yet. Be the first to share!</Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />

        {/* Create Post Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
          }}>
            <View style={{
              backgroundColor: '#222',
              borderRadius: 20,
              padding: 20,
              width: '90%',
              maxHeight: '80%',
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#FFB347',
                marginBottom: 20,
                textAlign: 'center',
              }}>
                Create New Post
              </Text>
              
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#444',
                  borderRadius: 10,
                  padding: 15,
                  fontSize: 16,
                  color: 'white',
                  minHeight: 100,
                  textAlignVertical: 'top',
                  marginBottom: 20,
                  backgroundColor: '#111',
                }}
                placeholder="Share your thoughts..."
                placeholderTextColor="#666"
                multiline
                value={postText}
                onChangeText={setPostText}
              />
              
              {selectedMedia && (
                <View style={{
                  marginBottom: 20,
                  padding: 10,
                  backgroundColor: '#111',
                  borderRadius: 10,
                  alignItems: 'center',
                }}>
                  <Text style={{ color: 'white', fontSize: 14, marginBottom: 10 }}>
                    Selected {selectedMedia.type}:
                  </Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>
                    {selectedMedia.uri.split('/').pop()}
                  </Text>
                  <TouchableOpacity
                    style={{ marginTop: 10, padding: 5 }}
                    onPress={() => setSelectedMedia(null)}
                  >
                    <Ionicons name="close" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  padding: 15,
                  backgroundColor: '#111',
                  borderRadius: 15,
                  marginBottom: 20,
                }}
                onPress={pickMedia}
              >
                <Ionicons name="images" size={24} color="#FFB347" />
                <Text style={{ color: 'white', marginTop: 5 }}>Add Photo/Video</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#444',
                    padding: 15,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setModalVisible(false);
                    setPostText('');
                    setSelectedMedia(null);
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: isPosting ? '#666' : '#FFB347',
                    padding: 15,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                  onPress={createPost}
                  disabled={isPosting}
                >
                  <Text style={{ color: '#222', fontWeight: 'bold' }}>
                    {isPosting ? 'Posting...' : 'Post'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Post Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
          }}>
            <View style={{
              backgroundColor: '#222',
              borderRadius: 20,
              padding: 20,
              width: '90%',
              maxHeight: '80%',
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#FFB347',
                marginBottom: 20,
                textAlign: 'center',
              }}>
                Edit Post
              </Text>
              
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#444',
                  borderRadius: 10,
                  padding: 15,
                  fontSize: 16,
                  color: 'white',
                  minHeight: 100,
                  textAlignVertical: 'top',
                  marginBottom: 20,
                  backgroundColor: '#111',
                }}
                placeholder="Share your thoughts..."
                placeholderTextColor="#666"
                multiline
                value={postText}
                onChangeText={setPostText}
              />
              
              {selectedMedia && (
                <View style={{
                  marginBottom: 20,
                  padding: 10,
                  backgroundColor: '#111',
                  borderRadius: 10,
                  alignItems: 'center',
                }}>
                  <Text style={{ color: 'white', fontSize: 14, marginBottom: 10 }}>
                    Selected {selectedMedia.type}:
                  </Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>
                    {selectedMedia.uri.split('/').pop()}
                  </Text>
                  <TouchableOpacity
                    style={{ marginTop: 10, padding: 5 }}
                    onPress={() => setSelectedMedia(null)}
                  >
                    <Ionicons name="close" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  padding: 15,
                  backgroundColor: '#111',
                  borderRadius: 15,
                  marginBottom: 20,
                }}
                onPress={pickMedia}
              >
                <Ionicons name="images" size={24} color="#FFB347" />
                <Text style={{ color: 'white', marginTop: 5 }}>Change Photo/Video</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#444',
                    padding: 15,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setEditModalVisible(false);
                    setPostText('');
                    setSelectedMedia(null);
                    setEditingPost(null);
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: isPosting ? '#666' : '#FFB347',
                    padding: 15,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                  onPress={updatePost}
                  disabled={isPosting}
                >
                  <Text style={{ color: '#222', fontWeight: 'bold' }}>
                    {isPosting ? 'Updating...' : 'Update'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Comments Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={commentsModalVisible}
          onRequestClose={() => setCommentsModalVisible(false)}
        >
          <View style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.7)',
          }}>
            <View style={{
              backgroundColor: '#222',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: '80%',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFB347' }}>Comments</Text>
                <TouchableOpacity onPress={() => setCommentsModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#FFB347" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 400, marginBottom: 15 }}>
                {comments.length === 0 ? (
                  <Text style={{ color: '#888', textAlign: 'center', paddingVertical: 20 }}>No comments yet</Text>
                ) : (
                  comments.map((comment) => (
                    <View key={comment.id} style={{
                      backgroundColor: '#111',
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 10
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{comment.username}</Text>
                          <Text style={{ color: '#FFB347', fontSize: 11, fontWeight: '600' }}>{comment.userLabel}</Text>
                          <Text style={{ color: '#888', fontSize: 11 }}>{formatRelativeTime(comment.created_at)}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteComment(comment.id)}
                          style={{ padding: 5 }}
                        >
                          <Ionicons name="trash" size={16} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                      <Text style={{ color: 'white', marginTop: 8, lineHeight: 20 }}>{comment.content}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, padding: 8 }}>
                <TextInput
                  style={{
                    flex: 1,
                    color: 'white',
                    padding: 10,
                    fontSize: 14
                  }}
                  placeholder="Add a comment..."
                  placeholderTextColor="#666"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity
                  onPress={addComment}
                  disabled={!newComment.trim()}
                  style={{
                    backgroundColor: newComment.trim() ? '#FFB347' : '#444',
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 8,
                    marginLeft: 8
                  }}
                >
                  <Ionicons name="send" size={20} color="#222" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
          <Text style={[styles.tabIcon, activeTab === 'BuddyConnect' && styles.activeTabIcon]}>👥</Text>
          <Text style={[styles.tabLabel, activeTab === 'BuddyConnect' && styles.activeTabLabel]}>Community</Text>
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
});


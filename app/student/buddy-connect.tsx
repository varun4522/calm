import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Modal, TextInput, Alert, FlatList, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/api/Profile';

const profilePics = [
  require('@/assets/images/profile/pic1.png'),
  require('@/assets/images/profile/pic2.png'),
  require('@/assets/images/profile/pic3.png'),
  require('@/assets/images/profile/pic4.png'),
  require('@/assets/images/profile/pic5.png'),
  require('@/assets/images/profile/pic6.png'),
  require('@/assets/images/profile/pic7.png'),
  require('@/assets/images/profile/pic8.png'),
  require('@/assets/images/profile/pic9.png'),
  require('@/assets/images/profile/pic10.png'),
  require('@/assets/images/profile/pic11.png'),
  require('@/assets/images/profile/pic12.png'),
  require('@/assets/images/profile/pic13.png'),
];

export default function BuddyConnect() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session } = useAuth();
  const { data: profile } = useProfile(session?.user.id);
  const [modalVisible, setModalVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [studentRegNo, setStudentRegNo] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const loadStudentRegNo = async () => {
      try {
        // First try to get from profile
        if (profile?.registration_number) {
          setStudentRegNo(String(profile.registration_number));
          await AsyncStorage.setItem('currentStudentReg', String(profile.registration_number));
          return;
        }

        // If not in profile, try params
        let regNo = params.registration as string;
        
        // If not in params, try AsyncStorage
        if (!regNo) {
          regNo = await AsyncStorage.getItem('currentStudentReg') || '';
        }
        
        // If we have a registration number, save it for future use
        if (regNo) {
          setStudentRegNo(regNo);
          await AsyncStorage.setItem('currentStudentReg', regNo);
        }
      } catch (error) {
        console.error('Error loading student registration:', error);
      }
    };

    loadStudentRegNo();
  }, [params.registration, profile]);

  useEffect(() => {
    fetchPosts();

    // Set up real-time subscription for community posts
    const channel = supabase
      .channel('community_posts_all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_post',
        },
        (payload) => {
          console.log('Community post changed:', payload);
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pickMedia = async () => {
    try {
      // Request permissions for both camera roll and media library
      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      const { status: imagePickerStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (mediaStatus !== 'granted' || imagePickerStatus !== 'granted') {
        Alert.alert('Permission needed', 'Please grant media library permissions to select photos and videos.');
        return;
      }

      // Launch the native image picker/gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Both images and videos
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const type = asset.type === 'video' ? 'video' : 'image';

        setSelectedMedia({
          uri: asset.uri,
          type,
        });
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };



  const uploadMediaToSupabase = async (uri: string, type: 'image' | 'video') => {
    try {
      console.log('Starting media upload for URI:', uri, 'Type:', type);

      // Validate URI
      if (!uri || !uri.startsWith('file://')) {
        throw new Error('Invalid file URI provided');
      }

      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${type === 'image' ? 'jpg' : 'mp4'}`;
      const filePath = `community/${fileName}`;

      console.log('Generated file path:', filePath);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist at the provided URI');
      }

      console.log('File exists, size:', fileInfo.size);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });

      console.log('File read as base64, length:', base64.length);

      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('Converted to bytes, length:', bytes.length);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, bytes, {
          contentType: type === 'image' ? 'image/jpeg' : 'video/mp4',
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      console.log('Upload successful, data:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded media');
      }

      console.log('Public URL generated:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const createPost = async () => {
    if (!postText.trim() && !selectedMedia) {
      Alert.alert('Error', 'Please add some text or media to your post.');
      return;
    }

    setIsPosting(true);
    try {
      console.log('Starting post creation...');

      // Check authentication first
      if (!session?.user?.id) {
        Alert.alert('Error', 'User not authenticated. Please log in again.');
        return;
      }

      // Get current user ID (student registration number)
      let userId = studentRegNo;
      
      // If studentRegNo is not set, try to get from profile
      if (!userId && profile?.registration_number) {
        userId = String(profile.registration_number);
        setStudentRegNo(String(profile.registration_number));
      }

      console.log('User ID:', userId);

      if (!userId) {
        Alert.alert('Error', 'Unable to identify user. Please log in again.');
        return;
      }

      let mediaUrl = null;

      // Upload media if selected
      if (selectedMedia) {
        console.log('Uploading media...', selectedMedia);
        try {
          mediaUrl = await uploadMediaToSupabase(selectedMedia.uri, selectedMedia.type);
          console.log('Media uploaded successfully:', mediaUrl);
        } catch (mediaError) {
          console.error('Media upload failed:', mediaError);
          Alert.alert('Error', `Failed to upload media: ${mediaError instanceof Error ? mediaError.message : 'Unknown error'}`);
          return;
        }
      }

      // Insert post into community_post table
      console.log('Inserting post into database...');
      const { data, error } = await supabase
        .from('community_post')
        .insert([
          {
            user_id: userId,
            content: postText.trim(),
            media_url: mediaUrl,
            media_type: selectedMedia?.type || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('Post created successfully:', data);

      // Success
      Alert.alert('Success', 'Post created successfully!');
      setModalVisible(false);
      setPostText('');
      setSelectedMedia(null);

      // Refresh posts
      fetchPosts();

    } catch (error) {
      console.error('Error creating post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to create post: ${errorMessage}`);
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
        if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          Alert.alert('Network Error', 'Unable to load posts. Please check your internet connection.');
        } else {
          Alert.alert('Error', 'Failed to load posts');
        }
        return;
      }

      // Fetch user data for each post
      const postsWithUserData = await Promise.all(
        (data || []).map(async (post) => {
          try {
            let username = `User ${post.user_id}`;
            let userType = 'student';

            // Try multiple tables to get user data
            // 1. Try user_requests table (general users)
            const { data: userData, error: userError } = await supabase
              .from('user_requests')
              .select('username, name')
              .eq('registration_number', post.user_id)
              .single();

            if (userData?.username || userData?.name) {
              username = userData.username || userData.name;
            } else {
              // 2. Try student_registrations table
              const { data: studentData } = await supabase
                .from('student_registrations')
                .select('name, username')
                .eq('registration', post.user_id)
                .single();

              if (studentData?.name || studentData?.username) {
                username = studentData.name || studentData.username;
                userType = 'student';
              }
            }

            // Get profile picture index from AsyncStorage
            let profilePicIndex = 0;
            try {
              const storedPic = await AsyncStorage.getItem(`profilePic_${post.user_id}`);
              if (storedPic !== null) {
                profilePicIndex = parseInt(storedPic, 10);
              }
            } catch (picError) {
              console.log('Error getting profile pic for user:', post.user_id);
            }

            return {
              ...post,
              username: username,
              userType: userType,
              profilePicIndex: profilePicIndex,
            };
          } catch (userError) {
            console.log('Error fetching user data for post:', post.id, userError);
            return {
              ...post,
              username: `User ${post.user_id}`,
              userType: 'student',
              profilePicIndex: 0,
            };
          }
        })
      );

      setPosts(postsWithUserData);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoadingPosts(false);
    }
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

      // Fetch user data for each comment
      const commentsWithUserData = await Promise.all(
        (data || []).map(async (comment) => {
          try {
            let username = `User ${comment.user_id}`;
            let userType = 'student';
            let isExpert = false;

            // Try multiple tables to get user data
            // 1. Try profiles table (for all user types including experts)
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name, username, type, registration_number')
              .eq('registration_number', comment.user_id)
              .single();

            if (profileData) {
              username = profileData.name || profileData.username || username;
              userType = profileData.type?.toLowerCase() || 'student';
              isExpert = profileData.type === 'EXPERT';
            } else {
              // 2. Try user_requests table (general users)
              const { data: userData } = await supabase
                .from('user_requests')
                .select('username, name')
                .eq('registration_number', comment.user_id)
                .single();

              if (userData?.username || userData?.name) {
                username = userData.username || userData.name;
              } else {
                // 3. Try student_registrations table
                const { data: studentData } = await supabase
                  .from('student_registrations')
                  .select('name, username')
                  .eq('registration', comment.user_id)
                  .single();

                if (studentData?.name || studentData?.username) {
                  username = studentData.name || studentData.username;
                  userType = 'student';
                }
              }
            }

            // Get profile picture index from AsyncStorage
            let profilePicIndex = 0;
            try {
              const storedPic = await AsyncStorage.getItem(`profilePic_${comment.user_id}`);
              if (storedPic !== null) {
                profilePicIndex = parseInt(storedPic, 10);
              }
            } catch (picError) {
              console.log('Error getting profile pic for comment user:', comment.user_id);
            }

            return {
              ...comment,
              username: username,
              userType: userType,
              isExpert: isExpert,
              profilePicIndex: profilePicIndex,
            };
          } catch (userError) {
            console.log('Error fetching user data for comment:', comment.id, userError);
            return {
              ...comment,
              username: `User ${comment.user_id}`,
              userType: 'student',
              isExpert: false,
              profilePicIndex: 0,
            };
          }
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
      // Check authentication
      if (!session?.user?.id) {
        Alert.alert('Error', 'User not authenticated. Please log in again.');
        return;
      }

      // Get current user ID
      let userId = studentRegNo;
      
      // If studentRegNo is not set, try to get from profile
      if (!userId && profile?.registration_number) {
        userId = String(profile.registration_number);
        setStudentRegNo(String(profile.registration_number));
      }

      if (!userId) {
        Alert.alert('Error', 'Unable to identify user. Please log in again.');
        return;
      }

      const { data, error } = await supabase
        .from('post_comment')
        .insert([
          {
            post_id: selectedPostForComments.id,
            user_id: userId,
            content: newComment.trim(),
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error('Error adding comment:', error);
        Alert.alert('Error', 'Failed to add comment');
        return;
      }

      // Refresh comments to get updated user data
      await fetchComments(selectedPostForComments.id);
      setNewComment('');

      // Update comment count in posts
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === selectedPostForComments.id
            ? { ...post, comment_count: (post.comment_count || 0) + 1 }
            : post
        )
      );
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };



  const deletePost = async (post: any) => {
    console.log('Delete button clicked for post ID:', post.id, 'by user:', studentRegNo);

    // Check if the current user is the author of the post
    if (post.user_id !== studentRegNo) {
      console.log('Delete denied: User', studentRegNo, 'is not the author of post', post.id);
      Alert.alert('Error', 'You can only delete your own posts');
      return;
    }

    console.log('Delete authorized: User is the post author, proceeding with deletion');

    // Show confirmation alert
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // First, delete all comments associated with this post
              const { error: commentsError } = await supabase
                .from('post_comment')
                .delete()
                .eq('post_id', post.id);

              if (commentsError) {
                console.error('Error deleting comments:', commentsError);
                // Continue with post deletion even if comments deletion fails
              }

              // Delete media file from storage if it exists
              if (post.media_url) {
                try {
                  // Extract file path from the public URL
                  const urlParts = post.media_url.split('/storage/v1/object/public/media/');
                  if (urlParts.length > 1) {
                    const filePath = urlParts[1];
                    const { error: storageError } = await supabase.storage
                      .from('media')
                      .remove([filePath]);

                    if (storageError) {
                      console.error('Error deleting media file:', storageError);
                      // Continue with post deletion even if media deletion fails
                    }
                  }
                } catch (storageError) {
                  console.error('Error deleting media file:', storageError);
                  // Continue with post deletion even if media deletion fails
                }
              }

              // Delete the post from Supabase community_post table
              console.log('Deleting post , post ID:', post.id);
              const { error } = await supabase
                .from('community_post')
                .delete()
                .eq('id', post.id);

              if (error) {
                console.error('Error deleting post:', error);
                Alert.alert('Error', 'Failed to delete post from database');
                return;
              }

              console.log('Successfully deleted post');

              // Remove the post from local state
              setPosts(prevPosts => prevPosts.filter(p => p.id !== post.id));
              console.log('Post removed from local state, UI updated');
              Alert.alert('Success', 'Post deleted associated data removed');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        },
      ]
    );
  };

  const openComments = async (post: any) => {
    setSelectedPostForComments(post);
    setCommentsModalVisible(true);
    await fetchComments(post.id);
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: Colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
          }}
          onPress={() => router.push('/student/student-home')}
        >
          <Text style={{ marginLeft: 8, color: Colors.white, fontSize: 16 }}>{'<'}</Text>
        </TouchableOpacity>
        
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: Colors.white,
          textAlign: 'center',
        }}>
          Community
        </Text>
        
        <TouchableOpacity
          style={{
            padding: 8,
          }}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Posts List */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: Colors.surface,
            margin: 10,
            borderRadius: 15,
            padding: 15,
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
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
                  borderColor: Colors.primary,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: Colors.text,
                }}>
                  {item.username}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: Colors.textSecondary,
                }}>
                  {formatRelativeTime(item.created_at)}
                </Text>
              </View>
              {item.user_id === studentRegNo && (
                <TouchableOpacity
                  style={{
                    padding: 8,
                    borderRadius: 20,
                    backgroundColor: Colors.error,
                  }}
                  onPress={() => deletePost(item)}
                >
                  <Ionicons name="trash" size={16} color={Colors.white} />
                </TouchableOpacity>
              )}
            </View>

            {item.content && (
              <Text style={{
                fontSize: 16,
                color: Colors.text,
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
                    <Ionicons name="videocam" size={48} color={Colors.white} />
                    <Text style={{
                      color: Colors.white,
                      marginTop: 10,
                      fontSize: 14,
                    }}>
                      Video
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 8,
                backgroundColor: Colors.background,
                borderRadius: 8,
                alignSelf: 'flex-start',
              }}
              onPress={() => openComments(item)}
            >
              <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
              <Text style={{
                marginLeft: 5,
                color: Colors.primary,
                fontSize: 14,
                fontWeight: '600',
              }}>
                Comments
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          loadingPosts ? (
            <View style={{
              alignItems: 'center',
              padding: 50,
            }}>
              <Text style={{
                color: Colors.textSecondary,
                fontSize: 16,
              }}>
                Loading posts...
              </Text>
            </View>
          ) : (
            <View style={{
              alignItems: 'center',
              padding: 50,
            }}>
              <Text style={{
                color: Colors.textSecondary,
                fontSize: 16,
              }}>
                No posts yet. Be the first to share!
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

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
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <View style={{
            backgroundColor: Colors.surface,
            borderRadius: 20,
            padding: 20,
            width: '90%',
            maxHeight: '80%',
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.text,
              marginBottom: 20,
              textAlign: 'center',
            }}>
              Create New Post
            </Text>
            
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 10,
                padding: 15,
                fontSize: 16,
                color: Colors.text,
                minHeight: 100,
                textAlignVertical: 'top',
                marginBottom: 20,
              }}
              placeholder="Share your thoughts..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              value={postText}
              onChangeText={setPostText}
            />
            
            {selectedMedia && (
              <View style={{
                marginBottom: 20,
                padding: 10,
                backgroundColor: Colors.background,
                borderRadius: 10,
                alignItems: 'center',
              }}>
                <Text style={{
                  color: Colors.text,
                  fontSize: 14,
                  marginBottom: 10,
                }}>
                  Selected {selectedMedia.type}:
                </Text>
                <Text style={{
                  color: Colors.textSecondary,
                  fontSize: 12,
                }}>
                  {selectedMedia.uri.split('/').pop()}
                </Text>
                <TouchableOpacity
                  style={{
                    marginTop: 10,
                    padding: 5,
                  }}
                  onPress={() => setSelectedMedia(null)}
                >
                  <Ionicons name="close" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={{
              alignItems: 'center',
              marginBottom: 30,
            }}>
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  padding: 20,
                  backgroundColor: Colors.background,
                  borderRadius: 15,
                  width: '60%',
                }}
                onPress={() => pickMedia()}
              >
                <Ionicons name="images" size={32} color={Colors.primary} />
                <Text style={{
                  color: Colors.primary,
                  fontSize: 16,
                  fontWeight: '600',
                  marginTop: 8,
                }}>
                  image/videos
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.background,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 10,
                  flex: 1,
                  marginRight: 10,
                  alignItems: 'center',
                }}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{
                  color: Colors.text,
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 10,
                  flex: 1,
                  marginLeft: 10,
                  alignItems: 'center',
                  opacity: isPosting ? 0.6 : 1,
                }}
                onPress={createPost}
                disabled={isPosting}
              >
                <Text style={{
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                  {isPosting ? 'Posting...' : 'Post'}
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
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <View style={{
            flex: 1,
            marginTop: 50,
            backgroundColor: Colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: Colors.text,
              }}>
                Comments
              </Text>
              <TouchableOpacity
                onPress={() => setCommentsModalVisible(false)}
                style={{ padding: 5 }}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedPostForComments && (
              <View style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 10,
                }}>
                  <Image
                    source={profilePics[selectedPostForComments.profilePicIndex || 0]}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      marginRight: 10,
                      borderWidth: 1,
                      borderColor: Colors.primary,
                    }}
                  />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: Colors.text,
                  }}>
                    {selectedPostForComments.username}
                  </Text>
                </View>
                {selectedPostForComments.content && (
                  <Text style={{
                    fontSize: 14,
                    color: Colors.text,
                    lineHeight: 20,
                  }}>
                    {selectedPostForComments.content}
                  </Text>
                )}
              </View>
            )}

            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{
                  padding: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.background,
                  backgroundColor: item.isExpert ? '#f0f4ff' : Colors.surface,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 5,
                  }}>
                    <Image
                      source={profilePics[item.profilePicIndex || 0]}
                      style={{
                        width: 25,
                        height: 25,
                        borderRadius: 12.5,
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: item.isExpert ? '#7b1fa2' : Colors.secondary,
                      }}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: item.isExpert ? '#7b1fa2' : Colors.text,
                      }}>
                        {item.username}
                      </Text>
                      {item.isExpert && (
                        <View style={{
                          backgroundColor: '#7b1fa2',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 10,
                          marginLeft: 6,
                        }}>
                          <Text style={{
                            fontSize: 9,
                            fontWeight: 'bold',
                            color: Colors.white,
                          }}>
                            EXPERT
                          </Text>
                        </View>
                      )}
                      <Text style={{
                        fontSize: 10,
                        color: Colors.textSecondary,
                        marginLeft: 10,
                      }}>
                        {formatRelativeTime(item.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Text style={{
                    fontSize: 14,
                    color: Colors.text,
                    lineHeight: 18,
                    marginLeft: 33,
                  }}>
                    {item.content}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <View style={{
                  padding: 20,
                  alignItems: 'center',
                }}>
                  <Text style={{
                    color: Colors.textSecondary,
                    fontSize: 14,
                  }}>
                    No comments yet. Be the first to comment!
                  </Text>
                </View>
              }
              contentContainerStyle={{ flexGrow: 1 }}
            />

            <View style={{
              flexDirection: 'row',
              padding: 15,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              backgroundColor: Colors.surface,
            }}>
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: 20,
                  paddingHorizontal: 15,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: Colors.text,
                  marginRight: 10,
                  maxHeight: 80,
                }}
                placeholder="Write a comment..."
                placeholderTextColor={Colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  borderRadius: 20,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  justifyContent: 'center',
                }}
                onPress={addComment}
              >
                <Ionicons name="send" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

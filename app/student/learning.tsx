import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface LearningResource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_name: string;
  file_type: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_by_type: 'admin' | 'expert' | 'student';
  created_at: string;
  category: string;
  tags: string[];
  download_count: number;
  file_size: number;
}

const { width } = Dimensions.get('window');

export default function LearningSupport() {
  const router = useRouter();
  const [studentInfo, setStudentInfo] = useState({ registration: '', name: '' });
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedResource, setSelectedResource] = useState<LearningResource | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const categories = ['All', 'Study Guides', 'Academic Resources', 'Mental Health', 'Career Support', 'Life Skills'];

  useEffect(() => {
    loadStudentInfo();
  }, []);

  const filterResources = useCallback(() => {
    if (selectedCategory === 'All') {
      setFilteredResources(resources);
    } else {
      setFilteredResources(resources.filter(resource => resource.category === selectedCategory));
    }
  }, [resources, selectedCategory]);

  useEffect(() => {
    if (studentInfo.registration) {
      loadResources();

      // Set up real-time subscription for new uploads to library table
      const subscription = supabase
        .channel('library_changes')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'library'
          },
          (payload) => {
            console.log('Library resource change detected:', payload);
            // Reload resources when changes occur
            loadResources();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [studentInfo.registration]);

  useEffect(() => {
    filterResources();
  }, [resources, selectedCategory, filterResources]);

  const loadStudentInfo = async () => {
    try {
      const storedReg = await AsyncStorage.getItem('currentStudentReg');
      const studentData = await AsyncStorage.getItem('currentStudentData');

      if (storedReg && studentData) {
        const data = JSON.parse(studentData);
        setStudentInfo({
          registration: storedReg,
          name: data.name || data.username || 'Student'
        });
      }
    } catch (error) {
      console.error('Error loading student info:', error);
    }
  };

  const loadResources = async () => {
    try {
      setLoading(true);

      // Fetch resources from library table in Supabase
      const { data: libraryData, error } = await supabase
        .from('library')
        .select('*');

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          console.log('Library table not found:', error);
          Alert.alert('Error', 'Library table does not exist in the database. Please contact your administrator.');
          setResources([]);
        } else {
          console.error('Error fetching library resources:', error);
          Alert.alert('Error', `Failed to load library resources: ${error.message}`);
          setResources([]);
        }
      } else {
        // Map library data to LearningResource format
        const mappedResources: LearningResource[] = (libraryData || []).map(item => ({
          id: item.id || String(Math.random()),
          title: item.title || item.name || 'Untitled Resource',
          description: item.description || 'No description available',
          file_url: item.file_url || item.url || '',
          file_name: item.file_name || item.name || 'Unknown file',
          file_type: item.file_type || item.type || 'unknown',
          uploaded_by: item.uploaded_by || item.author || 'Unknown',
          uploaded_by_name: item.uploaded_by_name || item.author_name || 'Unknown',
          uploaded_by_type: item.uploaded_by_type || 'admin',
          created_at: item.created_at || item.upload_date || new Date().toISOString(),
          category: item.category || 'Academic Resources',
          tags: item.tags || [],
          download_count: item.download_count || 0,
          file_size: item.file_size || 0
        }));

        console.log(`Loaded ${mappedResources.length} resources from library table`);
        setResources(mappedResources);
      }
    } catch (error) {
      console.error('Error loading library resources:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading resources');
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadResources();
    setRefreshing(false);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDownload = async (resource: LearningResource) => {
    try {
      // In a real app, you'd download the file or open it in a PDF viewer
      // For now, we'll show an alert and open in browser if it's a valid URL
      Alert.alert(
        'Download Resource',
        `Download "${resource.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: async () => {
              try {
                // Update download count
                await updateDownloadCount(resource.id);

                // Open PDF - in a real app you'd use expo-document-picker or similar
                if (resource.file_url.startsWith('http')) {
                await Linking.openURL(resource.file_url);
              } else {
                Alert.alert('Success', 'Resource downloaded successfully!');
              }
            } catch (downloadError) {
              console.error('Download error:', downloadError);
              Alert.alert('Error', 'Failed to download resource');
            }
          }
        }
      ]
    );
  } catch (error) {
    console.error('Download error:', error);
    Alert.alert('Error', 'Failed to download resource');
  }
};  const handlePreview = (resource: LearningResource) => {
    setSelectedResource(resource);
    setShowPreviewModal(true);
  };

  const updateDownloadCount = async (resourceId: string) => {
    try {
      // Get current download count first from library table
      const { data: currentResource } = await supabase
        .from('library')
        .select('download_count')
        .eq('id', resourceId)
        .single();

      if (currentResource) {
        // Update local state first for immediate UI response
        setResources(prev => prev.map(resource =>
          resource.id === resourceId
            ? { ...resource, download_count: resource.download_count + 1 }
            : resource
        ));

        // Update the library table with new count
        const { error: updateError } = await supabase
          .from('library')
          .update({ download_count: currentResource.download_count + 1 })
          .eq('id', resourceId);

        if (updateError) {
          console.error('Error updating download count:', updateError);
          // Revert local state if database update failed
          setResources(prev => prev.map(resource =>
            resource.id === resourceId
              ? { ...resource, download_count: resource.download_count - 1 }
              : resource
          ));
        }
      }
    } catch (err) {
      console.error('Error updating download count:', err);
    }
  };

  const renderCategoryButton = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item && styles.selectedCategoryButton
      ]}
      onPress={() => setSelectedCategory(item)}
      activeOpacity={0.3}
      delayPressIn={0}
    >
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === item && styles.selectedCategoryButtonText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderResourceItem = ({ item }: { item: LearningResource }) => (
    <View style={styles.resourceCard}>
      <View style={styles.resourceHeader}>
        <View style={styles.resourceIcon}>
          <Text style={styles.resourceIconText}>📄</Text>
        </View>
        <View style={styles.resourceInfo}>
          <Text style={styles.resourceTitle}>{item.title}</Text>
          <Text style={styles.resourceDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </View>

      <View style={styles.resourceMeta}>
        <Text style={styles.resourceMetaText}>
          📁 {item.category} • 👤 {item.uploaded_by_name}
        </Text>
        <Text style={styles.resourceMetaText}>
          📊 {formatFileSize(item.file_size)} • ⬇️ {item.download_count} downloads
        </Text>
        <Text style={styles.resourceDate}>
          📅 {formatDate(item.created_at)}
        </Text>
      </View>

      <View style={styles.resourceActions}>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => handlePreview(item)}
          activeOpacity={0.3}
          delayPressIn={0}
        >
          <Text style={styles.previewButtonText}>👁️ Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handleDownload(item)}
          activeOpacity={0.3}
          delayPressIn={0}
        >
          <Text style={styles.downloadButtonText}>⬇️ Download</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.3}
          delayPressIn={0}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Learning Support</Text>
          <Text style={styles.headerSubtitle}>Academic Resources for {studentInfo.name}</Text>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryButton}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Resources List */}
      <View style={styles.resourcesContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>📚 Loading resources...</Text>
          </View>
        ) : filteredResources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Resources Found</Text>
            <Text style={styles.emptyText}>
              {selectedCategory === 'All'
                ? 'No learning resources have been uploaded yet. Check back soon as experts regularly upload new materials!'
                : `No resources found in "${selectedCategory}" category. Try selecting a different category or check back later.`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredResources}
            renderItem={renderResourceItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#7b1fa2']}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resourcesList}
          />
        )}
      </View>

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resource Preview</Text>
              <TouchableOpacity
                onPress={() => setShowPreviewModal(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.3}
                delayPressIn={0}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedResource && (
              <View style={styles.modalBody}>
                <Text style={styles.modalResourceTitle}>{selectedResource.title}</Text>
                <Text style={styles.modalResourceDescription}>
                  {selectedResource.description}
                </Text>

                <View style={styles.modalResourceDetails}>
                  <Text style={styles.modalDetailText}>
                    📁 Category: {selectedResource.category}
                  </Text>
                  <Text style={styles.modalDetailText}>
                    👤 Uploaded by: {selectedResource.uploaded_by_name}
                  </Text>
                  <Text style={styles.modalDetailText}>
                    📊 Size: {formatFileSize(selectedResource.file_size)}
                  </Text>
                  <Text style={styles.modalDetailText}>
                    ⬇️ Downloads: {selectedResource.download_count}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalDownloadButton}
                    onPress={() => {
                      setShowPreviewModal(false);
                      handleDownload(selectedResource);
                    }}
                    activeOpacity={0.3}
                    delayPressIn={0}
                  >
                    <Text style={styles.modalDownloadButtonText}>⬇️ Download Resource</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {filteredResources.length} resources available • Pull to refresh
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#7b1fa2',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -80,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#e1bee7',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  categoriesContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCategoryButton: {
    backgroundColor: '#7b1fa2',
    borderColor: '#7b1fa2',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  resourcesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  resourcesList: {
    padding: 20,
  },
  resourceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resourceHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  resourceIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resourceIconText: {
    fontSize: 24,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  resourceMeta: {
    marginBottom: 12,
  },
  resourceMetaText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  resourceDate: {
    fontSize: 12,
    color: '#999',
  },
  resourceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 0.48,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  downloadButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 0.48,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  modalResourceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalResourceDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalResourceDetails: {
    marginBottom: 20,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  modalActions: {
    alignItems: 'center',
  },
  modalDownloadButton: {
    backgroundColor: '#7b1fa2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  modalDownloadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

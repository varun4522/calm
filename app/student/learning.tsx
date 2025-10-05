import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface LearningResource {
  id: string;
  resource_title: string;
  description: string;
  file_url: string;
  file_type: string;
  category: string;
}

const { width } = Dimensions.get('window');

export default function LearningSupport() {
  const router = useRouter();
  const [studentInfo, setStudentInfo] = useState({ registration: '', name: '' });
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedResource, setSelectedResource] = useState<LearningResource | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadStudentInfo();
  }, []);

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
          resource_title: item.resource_title || item.title || item.name || 'Untitled Resource',
          description: item.description || 'No description available',
          file_url: item.file_url || item.url || '',
          file_type: item.file_type || item.type || 'unknown',
          category: item.category || 'REMEMBER BETTER' // Default to BETTER category
        }));

        console.log(`Loaded ${mappedResources.length} resources from library table`);
        setResources(mappedResources);
        setFilteredResources(mappedResources);
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

  const handleDownload = async (resource: LearningResource) => {
    try {
      Alert.alert(
        'Open Resource',
        `Open "${resource.resource_title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open',
            onPress: async () => {
              try {
                setDownloading(true);

                // Get the file URL from Supabase storage
                let fileUrl = resource.file_url;

                // If it's a storage path, get the public URL
                if (!fileUrl.startsWith('http')) {
                  const { data } = supabase.storage
                    .from('library_pdfs')
                    .getPublicUrl(fileUrl);

                  fileUrl = data.publicUrl;
                }

                // Open the file URL in browser/viewer
                const supported = await Linking.canOpenURL(fileUrl);
                if (supported) {
                  await Linking.openURL(fileUrl);
                } else {
                  Alert.alert('Error', 'Unable to open this file type.');
                }
              } catch (downloadError) {
                console.error('Open error:', downloadError);
                Alert.alert('Error', 'Failed to open the file. Please try again.');
              } finally {
                setDownloading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to open resource');
    }
  };

  const handlePreview = async (resource: LearningResource) => {
    try {
      // Get the file URL from Supabase storage
      let fileUrl = resource.file_url;

      // If it's a storage path, get the public URL
      if (!fileUrl.startsWith('http')) {
        const { data } = supabase.storage
          .from('library_pdfs')
          .getPublicUrl(fileUrl);

        fileUrl = data.publicUrl;
      }

      // For PDFs, open in browser
      if (resource.file_type === 'application/pdf') {
        await Linking.openURL(fileUrl);
      }
      // For images, show in modal
      else if (resource.file_type.startsWith('image/')) {
        // Update resource with public URL for modal display
        setSelectedResource({ ...resource, file_url: fileUrl });
        setShowPreviewModal(true);
      }
      // For videos, open in external player
      else if (resource.file_type.startsWith('video/')) {
        await Linking.openURL(fileUrl);
      }
      // For other types, try to open
      else {
        await Linking.openURL(fileUrl);
      }
    } catch (error) {
      console.error('Preview error:', error);
      Alert.alert('Preview Error', 'Unable to preview this file. You can try downloading it instead.');
    }
  };

  const renderResourceItem = ({ item }: { item: LearningResource }) => (
    <View style={styles.resourceCard}>
      <View style={styles.resourceHeader}>
        <View style={styles.resourceIcon}>
          <Text style={styles.resourceIconText}>📄</Text>
        </View>
        <View style={styles.resourceInfo}>
          <Text style={styles.resourceTitle}>{item.resource_title}</Text>
          <Text style={styles.resourceDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </View>

      <View style={styles.resourceMeta}>
        <Text style={styles.resourceMetaText}>📁 {item.category}</Text>
      </View>

      <View style={styles.resourceActions}>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => handlePreview(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.previewButtonText}>👁️ Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handleDownload(item)}
          activeOpacity={0.7}
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
              No learning resources have been uploaded yet. Check back soon as experts regularly upload new materials!
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
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalResourceTitle}>{selectedResource.resource_title}</Text>
                <Text style={styles.modalResourceDescription}>
                  {selectedResource.description}
                </Text>

                {/* Preview Content - Only for images */}
                {selectedResource.file_type.startsWith('image/') && (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: selectedResource.file_url }}
                      style={styles.previewImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                <View style={styles.modalResourceDetails}>
                  <Text style={styles.modalDetailText}>
                    📁 Category: {selectedResource.category}
                  </Text>
                  <Text style={styles.modalDetailText}>
                    📄 Type: {selectedResource.file_type}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  {downloading ? (
                    <View style={styles.downloadingContainer}>
                      <ActivityIndicator size="small" color="#7b1fa2" />
                      <Text style={styles.downloadingText}>Downloading...</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.modalDownloadButton}
                      onPress={() => {
                        setShowPreviewModal(false);
                        handleDownload(selectedResource);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalDownloadButtonText}>⬇️ Download to Device</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resourceMetaText: {
    fontSize: 12,
    color: '#888',
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
  previewContainer: {
    marginVertical: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 300,
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  downloadingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#7b1fa2',
    fontWeight: '600',
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

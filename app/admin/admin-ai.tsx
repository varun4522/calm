import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AdminPrompt,
  clearAllAdminPromptsFromSupabase,
  deleteAdminPromptFromSupabase,
  saveAdminPromptToSupabase,
  syncAdminPrompts,
  updateAdminPromptInSupabase
} from '@/lib/aiChatStorage';

// Using AdminPrompt from aiChatStorage.ts for consistency
type CustomPrompt = AdminPrompt;

interface AISettings {
  name: string;
  personality: string;
  responseStyle: string;
  enabled: boolean;
}

interface SearchHistory {
  id: string;
  question: string;
  answer: string;
  source: string;
  created_at: string;
}

const AdminAI = () => {
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'prompts' | 'history' | 'settings'>('prompts');
  const [refreshing, setRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [aiSettings, setAISettings] = useState<AISettings>({
    name: 'AI Assistant',
    personality: 'Helpful and friendly',
    responseStyle: 'Informative',
    enabled: true,
  });

  useEffect(() => {
    loadAndSyncCustomPrompts();
    loadAISettings();
    loadSearchHistory();
    // Auto-load common Q&As if no custom prompts exist
    initializeCommonPrompts();
  }, []);

  const initializeCommonPrompts = async () => {
    try {
      const stored = await AsyncStorage.getItem('customPrompts');
    } catch (error) {
      console.error('Error initializing common prompts:', error);
    }
  };

  const loadSearchHistory = async () => {
    try {
      setRefreshing(true);
      // Load from local storage instead of Supabase for now
      const stored = await AsyncStorage.getItem('searchHistory');
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
      Alert.alert('Error', 'Failed to load search history');
    } finally {
      setRefreshing(false);
    }
  };

  const clearSearchHistory = async () => {
    Alert.alert(
      'Clear Search History',
      'Are you sure you want to delete all search history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('searchHistory');
              setSearchHistory([]);
              Alert.alert('Success', 'Search history cleared successfully');
            } catch (error) {
              console.error('Error clearing search history:', error);
              Alert.alert('Error', 'Failed to clear search history');
            }
          },
        },
      ]
    );
  };

  const loadAndSyncCustomPrompts = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus('Loading prompts...');

      // First load local prompts
      const localPrompts = await loadLocalCustomPrompts();

      // Try to sync with Supabase
      setSyncStatus('Syncing with cloud...');
      const syncedPrompts = await syncAdminPrompts(localPrompts);

      if (syncedPrompts.length > 0) {
        setCustomPrompts(syncedPrompts);
        await saveCustomPromptsLocally(syncedPrompts);
        setSyncStatus(`Synced ${syncedPrompts.length} prompts successfully`);
      } else {
        // If no synced prompts, use local prompts
        setCustomPrompts(localPrompts);
        setSyncStatus('Using local prompts only');
      }

      console.log(`Loaded ${syncedPrompts.length || localPrompts.length} admin prompts`);
    } catch (error) {
      console.error('Error loading and syncing prompts:', error);
      // Fallback to local prompts only
      const localPrompts = await loadLocalCustomPrompts();
      setCustomPrompts(localPrompts);
      setSyncStatus('Sync failed - using local prompts');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(''), 3000); // Clear status after 3 seconds
    }
  };

  const loadLocalCustomPrompts = async (): Promise<CustomPrompt[]> => {
    try {
      const stored = await AsyncStorage.getItem('customPrompts');
      if (stored) {
        const prompts = JSON.parse(stored);
        return prompts.map((prompt: any) => ({
          ...prompt,
          created_at: prompt.created_at ? new Date(prompt.created_at) : new Date(),
          updated_at: prompt.updated_at ? new Date(prompt.updated_at) : new Date()
        }));
      }
    } catch (error) {
      console.error('Error loading local custom prompts:', error);
    }
    return [];
  };

  const loadAISettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('aiSettings');
      if (stored) {
        setAISettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const saveCustomPromptsLocally = async (prompts: CustomPrompt[]) => {
    try {
      await AsyncStorage.setItem('customPrompts', JSON.stringify(prompts));
    } catch (error) {
      console.error('Error saving custom prompts locally:', error);
    }
  };

  const saveCustomPrompts = async (prompts: CustomPrompt[]) => {
    try {
      await saveCustomPromptsLocally(prompts);
      setCustomPrompts(prompts);
    } catch (error) {
      console.error('Error saving custom prompts:', error);
      Alert.alert('Error', 'Failed to save prompts');
    }
  };

  const saveAISettings = async (settings: AISettings) => {
    try {
      await AsyncStorage.setItem('aiSettings', JSON.stringify(settings));
      setAISettings(settings);
    } catch (error) {
      console.error('Error saving AI settings:', error);
      Alert.alert('Error', 'Failed to save AI settings');
    }
  };

  const addOrUpdatePrompt = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      Alert.alert('Error', 'Please fill in both question and answer fields');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Saving prompt...');

    try {
      if (editingPrompt) {
        // Update existing prompt
        const updatedPrompt: CustomPrompt = {
          ...editingPrompt,
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
          updated_at: new Date()
        };

        // Save to Supabase
        const supabaseSuccess = await updateAdminPromptInSupabase(updatedPrompt);

        // Update local state
        const updatedPrompts = customPrompts.map(prompt =>
          prompt.id === editingPrompt.id ? updatedPrompt : prompt
        );

        setCustomPrompts(updatedPrompts);
        await saveCustomPromptsLocally(updatedPrompts);

        setSyncStatus(supabaseSuccess ? 'Updated successfully!' : 'Updated locally (sync pending)');
        setEditingPrompt(null);
      } else {
        // Add new prompt
        const newPrompt: CustomPrompt = {
          id: Date.now().toString(),
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
          category: 'general',
          created_at: new Date(),
          updated_at: new Date(),
          is_active: true
        };

        // Save to Supabase
        const supabaseSuccess = await saveAdminPromptToSupabase(newPrompt);

        // Update local state
        const updatedPrompts = [...customPrompts, newPrompt];
        setCustomPrompts(updatedPrompts);
        await saveCustomPromptsLocally(updatedPrompts);

        setSyncStatus(supabaseSuccess ? 'Added successfully!' : 'Added locally (sync pending)');
      }

      setNewQuestion('');
      setNewAnswer('');
      Alert.alert('Success', `Prompt ${editingPrompt ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Error saving prompt:', error);
      setSyncStatus('Save failed');
      Alert.alert('Error', 'Failed to save prompt. Please try again.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  const editPrompt = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt);
    setNewQuestion(prompt.question);
    setNewAnswer(prompt.answer);
  };

  const deletePrompt = (id: string) => {
    Alert.alert(
      'Delete Prompt',
      'Are you sure you want to delete this prompt? This will remove it from all devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSyncing(true);
            setSyncStatus('Deleting prompt...');

            try {
              // Delete from Supabase
              const supabaseSuccess = await deleteAdminPromptFromSupabase(id);

              // Update local state
              const updatedPrompts = customPrompts.filter(prompt => prompt.id !== id);
              setCustomPrompts(updatedPrompts);
              await saveCustomPromptsLocally(updatedPrompts);

              setSyncStatus(supabaseSuccess ? 'Deleted successfully!' : 'Deleted locally (sync pending)');
              Alert.alert('Success', 'Prompt deleted successfully!');
            } catch (error) {
              console.error('Error deleting prompt:', error);
              setSyncStatus('Delete failed');
              Alert.alert('Error', 'Failed to delete prompt. Please try again.');
            } finally {
              setIsSyncing(false);
              setTimeout(() => setSyncStatus(''), 3000);
            }
          },
        },
      ]
    );
  };

  const cancelEdit = () => {
    setEditingPrompt(null);
    setNewQuestion('');
    setNewAnswer('');
  };

  const clearAllPrompts = () => {
    Alert.alert(
      'Clear All Prompts',
      'Are you sure you want to delete all custom prompts? This will remove them from all devices and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setIsSyncing(true);
            setSyncStatus('Clearing all prompts...');

            try {
              // Clear from Supabase
              const supabaseSuccess = await clearAllAdminPromptsFromSupabase();

              // Clear local state
              setCustomPrompts([]);
              await saveCustomPromptsLocally([]);

              setSyncStatus(supabaseSuccess ? 'All prompts cleared!' : 'Cleared locally (sync pending)');
              Alert.alert('Success', 'All prompts have been cleared!');
            } catch (error) {
              console.error('Error clearing prompts:', error);
              setSyncStatus('Clear failed');
              Alert.alert('Error', 'Failed to clear prompts. Please try again.');
            } finally {
              setIsSyncing(false);
              setTimeout(() => setSyncStatus(''), 3000);
            }
          },
        },
      ]
    );
  };

  const exportPrompts = async () => {
    try {
      const dataToExport = {
        prompts: customPrompts,
        settings: aiSettings,
        exportDate: new Date().toISOString(),
      };

      // In a real app, you would use a file picker or share dialog
      Alert.alert(
        'Export Data',
        `Data ready for export:\n${JSON.stringify(dataToExport, null, 2).substring(0, 200)}...`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.innerContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin AI Control</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={loadAndSyncCustomPrompts}
              style={styles.headerButton}
              disabled={isSyncing}
            >
              <Text style={styles.headerButtonText}>
                {isSyncing ? '🔄' : '↻'} Sync
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={exportPrompts} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Export</Text>
            </TouchableOpacity>
            {activeTab === 'history' && (
              <TouchableOpacity onPress={clearSearchHistory} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Clear History</Text>
              </TouchableOpacity>
            )}
            {activeTab === 'prompts' && (
              <TouchableOpacity onPress={clearAllPrompts} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sync Status */}
        {(isSyncing || syncStatus) && (
          <View style={styles.syncStatusContainer}>
            {isSyncing && (
              <Text style={styles.syncStatusText}>
                🔄 {syncStatus || 'Syncing...'}
              </Text>
            )}
            {!isSyncing && syncStatus && (
              <Text style={[styles.syncStatusText, { color: syncStatus.includes('successfully') ? '#4caf50' : '#ff9800' }]}>
                {syncStatus.includes('successfully') ? '✅' : '⚠️'} {syncStatus}
              </Text>
            )}
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'prompts' && styles.activeTab]}
            onPress={() => setActiveTab('prompts')}
          >
            <Text style={[styles.tabText, activeTab === 'prompts' && styles.activeTabText]}>
              Custom Prompts ({customPrompts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              Search History ({searchHistory.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
              AI Settings
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            activeTab === 'history' ? (
              <RefreshControl refreshing={refreshing} onRefresh={loadSearchHistory} />
            ) : undefined
          }
        >
        {activeTab === 'settings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Settings</Text>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>AI Status</Text>
              <Switch
                value={aiSettings.enabled}
                onValueChange={(value) => saveAISettings({ ...aiSettings, enabled: value })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>AI Name</Text>
              <TextInput
                style={styles.input}
                value={aiSettings.name}
                onChangeText={(text) => saveAISettings({ ...aiSettings, name: text })}
                placeholder="Enter AI name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Personality</Text>
              <TextInput
                style={styles.input}
                value={aiSettings.personality}
                onChangeText={(text) => saveAISettings({ ...aiSettings, personality: text })}
                placeholder="Describe AI personality"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Response Style</Text>
              <TextInput
                style={styles.input}
                value={aiSettings.responseStyle}
                onChangeText={(text) => saveAISettings({ ...aiSettings, responseStyle: text })}
                placeholder="Describe response style"
              />
            </View>
          </View>
        )}

        {activeTab === 'prompts' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Custom Prompt</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Question/Trigger</Text>
                <TextInput
                  style={styles.input}
                  value={newQuestion}
                  onChangeText={setNewQuestion}
                  placeholder="Enter question or keywords that will trigger this response"
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Answer/Response</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newAnswer}
                  onChangeText={setNewAnswer}
                  placeholder="Enter the response that AI should give"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, { opacity: isSyncing ? 0.6 : 1 }]}
                  onPress={addOrUpdatePrompt}
                  disabled={isSyncing}
                >
                  <Text style={styles.buttonText}>
                    {isSyncing ? 'Saving...' : (editingPrompt ? 'Update Prompt' : 'Add Prompt')}
                  </Text>
                </TouchableOpacity>

                {editingPrompt && (
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={cancelEdit}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Existing Prompts</Text>

              {customPrompts.length === 0 ? (
                <Text style={styles.emptyText}>No custom prompts yet. Add some above!</Text>
              ) : (
                customPrompts.map((prompt) => (
                  <View key={prompt.id} style={styles.promptCard}>
                    <View style={styles.promptContent}>
                      <Text style={styles.promptQuestion}>Q: {prompt.question}</Text>
                      <Text style={styles.promptAnswer}>A: {prompt.answer}</Text>
                    </View>
                    <View style={styles.promptActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => editPrompt(prompt)}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deletePrompt(prompt.id)}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {activeTab === 'history' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Student Search History</Text>

            {searchHistory.length === 0 ? (
              <Text style={styles.emptyText}>
                No search history yet. Students' questions will appear here once they start using the AI.
              </Text>
            ) : (
              searchHistory.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>
                      {new Date(item.created_at).toLocaleString()}
                    </Text>
                    <View style={[styles.sourceBadge,
                      item.source === 'custom_prompt' ? styles.customSourceBadge : styles.internetSourceBadge
                    ]}>
                      <Text style={styles.sourceBadgeText}>
                        {item.source === 'custom_prompt' ? 'Custom' : 'Internet'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyQuestion}>Q: {item.question}</Text>
                  <Text style={styles.historyAnswer}>A: {item.answer}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FF6B35',
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  headerButtonText: {
    color: 'white',
    fontSize: 14,
  },
  syncStatusContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  syncStatusText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  promptCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  promptContent: {
    marginBottom: 12,
  },
  promptQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  promptAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  // Search history styles
  historyCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  customSourceBadge: {
    backgroundColor: '#FF6B35',
  },
  internetSourceBadge: {
    backgroundColor: '#007AFF',
  },
  sourceBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  historyQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default AdminAI;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface AIChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  category?: string;
  wellness_tip?: string;
  session_id?: string;
  device_id?: string;
}

export interface SupabaseAIChatMessage {
  id: string;
  user_id: string;
  user_name?: string;
  message_id: string;
  message_text: string;
  message_type: 'user' | 'ai';
  ai_category?: string;
  wellness_tip?: string;
  session_id?: string;
  created_at: string;
  device_id?: string;
  is_synced: boolean;
}

/**
 * Get the current user information from AsyncStorage
 */
export const getCurrentUser = async (): Promise<{ id: string; name?: string } | null> => {
  try {
    // Prefer student if logged in
    const studentId = await AsyncStorage.getItem('currentStudentReg');
    const studentDataStr = await AsyncStorage.getItem('currentStudentData');
    if (studentId) {
      let name = undefined;
      if (studentDataStr) {
        const parsedData = JSON.parse(studentDataStr);
        name = parsedData.name || parsedData.username || parsedData.user_name;
      }
      return { id: studentId, name };
    }

    // Fallback to expert if logged in
    const expertId = await AsyncStorage.getItem('currentExpertReg');
    const expertName = await AsyncStorage.getItem('currentExpertName');
    if (expertId) {
      return { id: expertId, name: expertName || 'Expert' };
    }

    // Fallback: generate a unique device-based ID if no user is logged in
    let deviceId = await AsyncStorage.getItem('deviceUserId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('deviceUserId', deviceId);
    }

    return { id: deviceId, name: 'Anonymous User' };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Generate a unique session ID for grouping related messages
 */
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get or create current session ID
 */
export const getCurrentSessionId = async (): Promise<string> => {
  try {
    let sessionId = await AsyncStorage.getItem('currentAISessionId');
    if (!sessionId) {
      sessionId = generateSessionId();
      await AsyncStorage.setItem('currentAISessionId', sessionId);
    }
    return sessionId;
  } catch (error) {
    console.error('Error getting session ID:', error);
    return generateSessionId();
  }
};

/**
 * Save a message to Supabase
 */
export const saveMessageToSupabase = async (
  message: AIChatMessage,
  isUserMessage: boolean = true
): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('No user found for saving message');
      return false;
    }

    const sessionId = await getCurrentSessionId();

    const supabaseMessage: Omit<SupabaseAIChatMessage, 'id' | 'created_at'> = {
      user_id: user.id,
      user_name: user.name,
      message_id: message.id,
      message_text: message.text,
      message_type: isUserMessage ? 'user' : 'ai',
      ai_category: message.category,
      wellness_tip: message.wellness_tip,
      session_id: message.session_id || sessionId,
      device_id: message.device_id || 'mobile_app',
      is_synced: true
    };

    const { error } = await supabase
      .from('ai_chat_history')
      .insert([supabaseMessage]);

    if (error) {
      console.error('Error saving message to Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveMessageToSupabase:', error);
    return false;
  }
};

/**
 * Save a conversation pair (user prompt + AI response) to Supabase
 */
export const saveConversationPair = async (
  userMessage: AIChatMessage,
  aiMessage: AIChatMessage
): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('No user found for saving conversation');
      return false;
    }

    const sessionId = await getCurrentSessionId();

    const messages = [
      {
        user_id: user.id,
        user_name: user.name,
        message_id: userMessage.id,
        message_text: userMessage.text,
        message_type: 'user' as const,
        session_id: userMessage.session_id || sessionId,
        device_id: userMessage.device_id || 'mobile_app',
        is_synced: true
      },
      {
        user_id: user.id,
        user_name: user.name,
        message_id: aiMessage.id,
        message_text: aiMessage.text,
        message_type: 'ai' as const,
        ai_category: aiMessage.category,
        wellness_tip: aiMessage.wellness_tip,
        session_id: aiMessage.session_id || sessionId,
        device_id: aiMessage.device_id || 'mobile_app',
        is_synced: true
      }
    ];

    const { error } = await supabase
      .from('ai_chat_history')
      .insert(messages);

    if (error) {
      console.error('Error saving conversation to Supabase:', error);
      return false;
    }

    console.log('Successfully saved conversation pair to Supabase');
    return true;
  } catch (error) {
    console.error('Error in saveConversationPair:', error);
    return false;
  }
};

/**
 * Load chat history from Supabase for the current user
 */
export const loadChatHistoryFromSupabase = async (): Promise<AIChatMessage[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('No user found for loading chat history');
      return [];
    }

    const { data, error } = await supabase
      .from('ai_chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading chat history from Supabase:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert Supabase format to app format
    const messages: AIChatMessage[] = data.map((item: SupabaseAIChatMessage) => ({
      id: item.message_id,
      text: item.message_text,
      isUser: item.message_type === 'user',
      timestamp: new Date(item.created_at),
      category: item.ai_category,
      wellness_tip: item.wellness_tip,
      session_id: item.session_id,
      device_id: item.device_id
    }));

    console.log(`Loaded ${messages.length} messages from Supabase`);
    return messages;
  } catch (error) {
    console.error('Error in loadChatHistoryFromSupabase:', error);
    return [];
  }
};

/**
 * Sync local chat history with Supabase
 */
export const syncChatHistory = async (localMessages: AIChatMessage[]): Promise<AIChatMessage[]> => {
  try {
    // First, load messages from Supabase
    const supabaseMessages = await loadChatHistoryFromSupabase();

    // Create a map of existing message IDs from Supabase
    const supabaseMessageIds = new Set(supabaseMessages.map(msg => msg.id));

    // Find local messages that aren't in Supabase yet
    const unsyncedMessages = localMessages.filter(msg => !supabaseMessageIds.has(msg.id));

    // Save unsynced messages to Supabase
    for (const message of unsyncedMessages) {
      await saveMessageToSupabase(message, message.isUser);
    }

    // Return the combined and sorted messages
    const allMessages = [...supabaseMessages];

    // Add any local messages that weren't in Supabase
    for (const localMsg of unsyncedMessages) {
      if (!allMessages.find(msg => msg.id === localMsg.id)) {
        allMessages.push(localMsg);
      }
    }

    // Sort by timestamp
    allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    console.log(`Synced chat history: ${allMessages.length} total messages`);
    return allMessages;
  } catch (error) {
    console.error('Error syncing chat history:', error);
    return localMessages; // Return local messages as fallback
  }
};

/**
 * Clear all chat history for the current user
 */
export const clearChatHistoryFromSupabase = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('No user found for clearing chat history');
      return false;
    }

    const { error } = await supabase
      .from('ai_chat_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing chat history from Supabase:', error);
      return false;
    }

    // Also clear local session ID to start fresh
    await AsyncStorage.removeItem('currentAISessionId');

    console.log('Successfully cleared chat history from Supabase');
    return true;
  } catch (error) {
    console.error('Error in clearChatHistoryFromSupabase:', error);
    return false;
  }
};

/**
 * Get conversation statistics for the current user
 */
export const getChatStatistics = async (): Promise<{
  totalMessages: number;
  totalSessions: number;
  categories: { [key: string]: number };
} | null> => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('ai_chat_history')
      .select('message_type, ai_category, session_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error getting chat statistics:', error);
      return null;
    }

    const totalMessages = data?.length || 0;
    const sessions = new Set(data?.map(item => item.session_id).filter(Boolean));
    const totalSessions = sessions.size;

    const categories: { [key: string]: number } = {};
    data?.forEach(item => {
      if (item.ai_category) {
        categories[item.ai_category] = (categories[item.ai_category] || 0) + 1;
      }
    });

    return {
      totalMessages,
      totalSessions,
      categories
    };
  } catch (error) {
    console.error('Error in getChatStatistics:', error);
    return null;
  }
};

// ==================== ADMIN PROMPT FUNCTIONS ====================

export interface AdminPrompt {
  id: string;
  question: string;
  answer: string;
  category?: string;
  created_by?: string;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
}

export interface SupabaseAdminPrompt {
  id: string;
  prompt_id: string;
  question: string;
  answer: string;
  category?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

/**
 * Save an admin prompt to Supabase
 */
export const saveAdminPromptToSupabase = async (prompt: AdminPrompt): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('No admin user found for saving prompt');
      return false;
    }

    const supabasePrompt: Omit<SupabaseAdminPrompt, 'id' | 'created_at' | 'updated_at'> = {
      prompt_id: prompt.id,
      question: prompt.question,
      answer: prompt.answer,
      category: prompt.category || 'general',
      created_by: user.id,
      created_by_name: user.name || 'Admin',
      is_active: prompt.is_active !== false // default to true
    };

    const { error } = await supabase
      .from('admin_prompts')
      .insert([supabasePrompt]);

    if (error) {
      console.error('Error saving admin prompt to Supabase:', error);
      return false;
    }

    console.log('Successfully saved admin prompt to Supabase');
    return true;
  } catch (error) {
    console.error('Error in saveAdminPromptToSupabase:', error);
    return false;
  }
};

/**
 * Update an existing admin prompt in Supabase
 */
export const updateAdminPromptInSupabase = async (prompt: AdminPrompt): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('No admin user found for updating prompt');
      return false;
    }

    const { error } = await supabase
      .from('admin_prompts')
      .update({
        question: prompt.question,
        answer: prompt.answer,
        category: prompt.category || 'general',
        is_active: prompt.is_active !== false,
        updated_at: new Date().toISOString()
      })
      .eq('prompt_id', prompt.id)
      .eq('created_by', user.id); // Ensure user can only update their own prompts

    if (error) {
      console.error('Error updating admin prompt in Supabase:', error);
      return false;
    }

    console.log('Successfully updated admin prompt in Supabase');
    return true;
  } catch (error) {
    console.error('Error in updateAdminPromptInSupabase:', error);
    return false;
  }
};

/**
 * Delete an admin prompt from Supabase
 */
export const deleteAdminPromptFromSupabase = async (promptId: string): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('No admin user found for deleting prompt');
      return false;
    }

    const { error } = await supabase
      .from('admin_prompts')
      .delete()
      .eq('prompt_id', promptId)
      .eq('created_by', user.id); // Ensure user can only delete their own prompts

    if (error) {
      console.error('Error deleting admin prompt from Supabase:', error);
      return false;
    }

    console.log('Successfully deleted admin prompt from Supabase');
    return true;
  } catch (error) {
    console.error('Error in deleteAdminPromptFromSupabase:', error);
    return false;
  }
};

/**
 * Load all admin prompts from Supabase for the current admin
 */
export const loadAdminPromptsFromSupabase = async (): Promise<AdminPrompt[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('No admin user found for loading prompts');
      return [];
    }

    const { data, error } = await supabase
      .from('admin_prompts')
      .select('*')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading admin prompts from Supabase:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert Supabase format to app format
    const prompts: AdminPrompt[] = data.map((item: SupabaseAdminPrompt) => ({
      id: item.prompt_id,
      question: item.question,
      answer: item.answer,
      category: item.category,
      created_by: item.created_by,
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at),
      is_active: item.is_active
    }));

    console.log(`Loaded ${prompts.length} admin prompts from Supabase`);
    return prompts;
  } catch (error) {
    console.error('Error in loadAdminPromptsFromSupabase:', error);
    return [];
  }
};

/**
 * Sync local admin prompts with Supabase
 */
export const syncAdminPrompts = async (localPrompts: AdminPrompt[]): Promise<AdminPrompt[]> => {
  try {
    // First, load prompts from Supabase
    const supabasePrompts = await loadAdminPromptsFromSupabase();

    // Create a map of existing prompt IDs from Supabase
    const supabasePromptIds = new Set(supabasePrompts.map(prompt => prompt.id));

    // Find local prompts that aren't in Supabase yet
    const unsyncedPrompts = localPrompts.filter(prompt => !supabasePromptIds.has(prompt.id));

    // Save unsynced prompts to Supabase
    for (const prompt of unsyncedPrompts) {
      await saveAdminPromptToSupabase(prompt);
    }

    // Return the combined and sorted prompts
    const allPrompts = [...supabasePrompts];

    // Add any local prompts that weren't in Supabase
    for (const localPrompt of unsyncedPrompts) {
      if (!allPrompts.find(prompt => prompt.id === localPrompt.id)) {
        allPrompts.push(localPrompt);
      }
    }

    // Sort by creation date (newest first)
    allPrompts.sort((a, b) => {
      const dateA = a.created_at || new Date(0);
      const dateB = b.created_at || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`Synced admin prompts: ${allPrompts.length} total prompts`);
    return allPrompts;
  } catch (error) {
    console.error('Error syncing admin prompts:', error);
    return localPrompts; // Return local prompts as fallback
  }
};

/**
 * Clear all admin prompts for the current admin
 */
export const clearAllAdminPromptsFromSupabase = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('No admin user found for clearing prompts');
      return false;
    }

    const { error } = await supabase
      .from('admin_prompts')
      .delete()
      .eq('created_by', user.id);

    if (error) {
      console.error('Error clearing admin prompts from Supabase:', error);
      return false;
    }

    console.log('Successfully cleared all admin prompts from Supabase');
    return true;
  } catch (error) {
    console.error('Error in clearAllAdminPromptsFromSupabase:', error);
    return false;
  }
};

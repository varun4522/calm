/**
 * Global Refresh Configuration
 * 
 * This file centralizes all auto-refresh intervals across the app.
 * Adjust these values to control how frequently different screens update.
 * 
 * All intervals are in milliseconds (1000ms = 1 second)
 */

export const RefreshConfig = {
  // Chat page - Most frequent updates for real-time messaging
  CHAT_REFRESH_INTERVAL: 20000, // 20 seconds
  
  // Message/Conversation list - Frequent updates to show new messages
  MESSAGES_REFRESH_INTERVAL: 30000, // 30 seconds
  
  // Client/Session lists - Moderate updates for session management
  CLIENT_LIST_REFRESH_INTERVAL: 45000, // 45 seconds
  
  // Home pages - Less frequent updates for general content
  HOME_REFRESH_INTERVAL: 60000, // 60 seconds (1 minute)
  
  // AI/Learning pages - Slower updates for content that changes less often
  CONTENT_REFRESH_INTERVAL: 120000, // 120 seconds (2 minutes)
  
  // Status/Notification checks - Very frequent for real-time status
  STATUS_CHECK_INTERVAL: 15000, // 15 seconds
  
  // Background sync - Periodic background data sync
  BACKGROUND_SYNC_INTERVAL: 300000, // 300 seconds (5 minutes)
};

/**
 * Performance Modes
 * 
 * Presets for different performance/battery trade-offs
 */
export const RefreshModes = {
  // High Performance - Most frequent updates, higher battery usage
  HIGH_PERFORMANCE: {
    CHAT_REFRESH_INTERVAL: 10000, // 10 seconds
    MESSAGES_REFRESH_INTERVAL: 15000, // 15 seconds
    CLIENT_LIST_REFRESH_INTERVAL: 20000, // 20 seconds
    HOME_REFRESH_INTERVAL: 30000, // 30 seconds
    CONTENT_REFRESH_INTERVAL: 60000, // 60 seconds
    STATUS_CHECK_INTERVAL: 10000, // 10 seconds
    BACKGROUND_SYNC_INTERVAL: 120000, // 2 minutes
  },
  
  // Balanced - Current default settings
  BALANCED: {
    CHAT_REFRESH_INTERVAL: 20000, // 20 seconds
    MESSAGES_REFRESH_INTERVAL: 30000, // 30 seconds
    CLIENT_LIST_REFRESH_INTERVAL: 45000, // 45 seconds
    HOME_REFRESH_INTERVAL: 60000, // 60 seconds
    CONTENT_REFRESH_INTERVAL: 120000, // 2 minutes
    STATUS_CHECK_INTERVAL: 15000, // 15 seconds
    BACKGROUND_SYNC_INTERVAL: 300000, // 5 minutes
  },
  
  // Battery Saver - Less frequent updates, lower battery usage
  BATTERY_SAVER: {
    CHAT_REFRESH_INTERVAL: 30000, // 30 seconds
    MESSAGES_REFRESH_INTERVAL: 60000, // 60 seconds
    CLIENT_LIST_REFRESH_INTERVAL: 90000, // 90 seconds
    HOME_REFRESH_INTERVAL: 120000, // 2 minutes
    CONTENT_REFRESH_INTERVAL: 300000, // 5 minutes
    STATUS_CHECK_INTERVAL: 30000, // 30 seconds
    BACKGROUND_SYNC_INTERVAL: 600000, // 10 minutes
  },
};

/**
 * Helper function to get refresh interval based on mode
 */
export const getRefreshInterval = (
  type: keyof typeof RefreshConfig,
  mode: keyof typeof RefreshModes = 'BALANCED'
): number => {
  return RefreshModes[mode][type];
};

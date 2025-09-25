# AI Chat Cross-Device Synchronization

This implementation adds cross-device synchronization for AI chat prompts and responses using Supabase.

## Features Added

✅ **Automatic Sync**: All prompts and AI responses are automatically saved to Supabase  
✅ **Cross-Device Access**: Chat history syncs across all devices when logged in with same user  
✅ **Offline Support**: Works offline and syncs when connection is restored  
✅ **Manual Sync**: Sync button to manually trigger synchronization  
✅ **Cloud Backup**: Chat history is backed up in cloud storage  
✅ **Clear All**: Option to clear chat history from all devices  

## Database Setup

### 1. Run the Database Script
Execute the SQL script in your Supabase dashboard:

```sql
-- Run this script in Supabase SQL Editor
-- File: database/create_ai_chat_table.sql
```

This creates:
- `ai_chat_history` table to store all chat messages
- Proper indexes for performance
- Row Level Security (RLS) policies
- Automatic timestamp updates
- A view for easy conversation querying

### 2. Verify Table Creation
Check that the table was created successfully:

```sql
SELECT * FROM ai_chat_history LIMIT 1;
```

## How It Works

### Data Flow
1. **User sends prompt** → Saved locally + sent to AI server
2. **AI responds** → Both prompt and response saved to Supabase
3. **App loads** → Syncs with Supabase to get latest messages
4. **Cross-device** → Other devices get synced messages automatically

### User Identification
The system identifies users by their student registration number stored in AsyncStorage:
- `currentStudentReg` - Primary user identifier
- Falls back to device-specific ID if no user is logged in

### Session Management
- Each conversation session gets a unique `session_id`
- Related messages are grouped together
- Sessions persist across devices

## API Functions

### Core Functions (`lib/aiChatStorage.ts`)

```typescript
// Save a conversation pair (user + AI message)
await saveConversationPair(userMessage, aiMessage);

// Load chat history from Supabase
const messages = await loadChatHistoryFromSupabase();

// Sync local and cloud storage
const syncedMessages = await syncChatHistory(localMessages);

// Clear all chat history
await clearChatHistoryFromSupabase();

// Get conversation statistics
const stats = await getChatStatistics();
```

### Usage Example
```typescript
// When user sends a message
const success = await saveConversationPair(
  {
    id: 'user_msg_123',
    text: 'I feel anxious',
    isUser: true,
    timestamp: new Date()
  },
  {
    id: 'ai_msg_124', 
    text: 'Try deep breathing exercises...',
    isUser: false,
    timestamp: new Date(),
    category: 'anxiety',
    wellness_tip: 'Practice the 4-7-8 breathing technique'
  }
);
```

## User Interface Updates

### New Features
- **Sync Status Indicator**: Shows when syncing with cloud
- **Manual Sync Button**: Refresh button to manually sync
- **Enhanced Clear**: Clears from both local and cloud storage
- **Connection Status**: Shows online/offline status

### Visual Indicators
- 🔄 Syncing animation when uploading/downloading
- ✅ Success indicators for completed sync
- ⚠️ Offline mode indicator

## Error Handling

The system gracefully handles:
- Network connectivity issues
- Supabase connection failures  
- Database permission errors
- Partial sync failures

**Fallback Strategy**: If cloud sync fails, the app continues working with local storage only.

## Privacy & Security

### Data Protection
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- No sensitive data stored in plain text

### User Control
- Users can clear all their data
- Chat history is tied to user account
- Anonymous users get device-specific storage

## Troubleshooting

### Common Issues

**1. Table doesn't exist error**
```
Run the database setup script: database/create_ai_chat_table.sql
```

**2. Permission denied errors**
```sql
-- Check RLS policies are correct
SELECT * FROM pg_policies WHERE tablename = 'ai_chat_history';
```

**3. Messages not syncing**
- Check internet connection
- Verify user is logged in
- Check Supabase project URL and keys

### Debug Mode
Enable debug logging to see sync status:
```typescript
console.log('Sync result:', await syncChatHistory(messages));
```

## Benefits

1. **Seamless Experience**: Users can switch devices and continue conversations
2. **Data Backup**: Chat history is safely stored in cloud
3. **Improved Insights**: Analytics on user interaction patterns
4. **Scalability**: Supports unlimited users and message history
5. **Reliability**: Works offline with automatic sync when online

## Future Enhancements

- Real-time sync using Supabase subscriptions
- Message search and filtering
- Export chat history feature
- Advanced analytics dashboard
- Message categories and tagging
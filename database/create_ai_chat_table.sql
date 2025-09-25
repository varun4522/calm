-- Create AI Chat History table for cross-device synchronization
-- This table stores all prompts and AI responses for each user

CREATE TABLE IF NOT EXISTS ai_chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Student registration number or user identifier
    user_name TEXT, -- Optional: user's display name
    message_id TEXT NOT NULL, -- Unique message ID for client-side tracking
    message_text TEXT NOT NULL, -- The actual prompt/message text
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai')), -- 'user' for prompts, 'ai' for responses
    ai_category TEXT, -- Category assigned by AI (anxiety, stress, general, etc.)
    wellness_tip TEXT, -- Optional wellness tip from AI
    session_id TEXT, -- Optional: group related messages in a session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_id TEXT, -- Optional: track which device sent the message
    is_synced BOOLEAN DEFAULT true -- Track sync status
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_created_at ON ai_chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_chat_session_id ON ai_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user_created ON ai_chat_history(user_id, created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ai_chat_updated_at_trigger
    BEFORE UPDATE ON ai_chat_history
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_chat_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own chat history
CREATE POLICY "Users can view their own AI chat history" ON ai_chat_history
    FOR SELECT USING (true); -- Allow all reads for now, you can restrict to user_id if needed

-- Policy: Users can insert their own chat history
CREATE POLICY "Users can insert their own AI chat history" ON ai_chat_history
    FOR INSERT WITH CHECK (true); -- Allow all inserts for now

-- Policy: Users can update their own chat history
CREATE POLICY "Users can update their own AI chat history" ON ai_chat_history
    FOR UPDATE USING (true); -- Allow all updates for now

-- Policy: Users can delete their own chat history
CREATE POLICY "Users can delete their own AI chat history" ON ai_chat_history
    FOR DELETE USING (true); -- Allow all deletes for now

-- Optional: Create a view for easy querying of complete conversations
CREATE OR REPLACE VIEW ai_conversations AS
SELECT 
    user_id,
    user_name,
    session_id,
    ARRAY_AGG(
        JSON_BUILD_OBJECT(
            'id', message_id,
            'text', message_text,
            'type', message_type,
            'category', ai_category,
            'wellness_tip', wellness_tip,
            'timestamp', created_at,
            'device_id', device_id
        ) ORDER BY created_at
    ) as messages,
    MIN(created_at) as conversation_start,
    MAX(created_at) as last_activity,
    COUNT(*) as message_count
FROM ai_chat_history
GROUP BY user_id, user_name, session_id
ORDER BY last_activity DESC;

-- Grant necessary permissions (adjust based on your RLS setup)
-- GRANT ALL ON ai_chat_history TO authenticated;
-- GRANT ALL ON ai_conversations TO authenticated;
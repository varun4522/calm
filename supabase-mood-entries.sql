-- Create or update mood_entries table for cross-account mood tracking
-- Run this SQL in your Supabase SQL Editor

-- Drop existing table if you want to recreate (WARNING: This deletes all data)
-- DROP TABLE IF EXISTS mood_entries CASCADE;

-- Create mood_entries table with proper structure
CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('STUDENT', 'EXPERT', 'PEER_LISTENER', 'ADMIN')),
  mood_emoji TEXT NOT NULL,
  mood_label TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_time TIME NOT NULL DEFAULT CURRENT_TIME,
  scheduled_label TEXT,
  schedule_key TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on mood_entries table
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can view their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can update their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can delete their own mood entries" ON mood_entries;

-- Create RLS policies

-- Allow users to insert their own mood entries
CREATE POLICY "Users can insert their own mood entries"
ON mood_entries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own mood entries
CREATE POLICY "Users can view their own mood entries"
ON mood_entries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own mood entries
CREATE POLICY "Users can update their own mood entries"
ON mood_entries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own mood entries
CREATE POLICY "Users can delete their own mood entries"
ON mood_entries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_entry_date ON mood_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON mood_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_type ON mood_entries(user_type);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mood_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_mood_entries_updated_at_trigger ON mood_entries;
CREATE TRIGGER update_mood_entries_updated_at_trigger
BEFORE UPDATE ON mood_entries
FOR EACH ROW
EXECUTE FUNCTION update_mood_entries_updated_at();

-- Grant necessary permissions
GRANT ALL ON mood_entries TO authenticated;

-- Create a view for mood analytics (optional but useful)
CREATE OR REPLACE VIEW mood_analytics AS
SELECT 
  user_id,
  user_type,
  entry_date,
  COUNT(*) as entry_count,
  array_agg(mood_emoji ORDER BY entry_time) as moods,
  array_agg(mood_label ORDER BY entry_time) as labels,
  MIN(entry_time) as first_entry_time,
  MAX(entry_time) as last_entry_time
FROM mood_entries
WHERE user_id = auth.uid()  -- Only show current user's data
GROUP BY user_id, user_type, entry_date
ORDER BY entry_date DESC;

-- Grant access to the view
GRANT SELECT ON mood_analytics TO authenticated;

-- Verify the setup
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename = 'mood_entries';

-- Show sample of data structure (if any data exists)
SELECT 
  id,
  user_type,
  mood_emoji,
  mood_label,
  entry_date,
  entry_time,
  scheduled_label,
  created_at
FROM mood_entries
ORDER BY created_at DESC
LIMIT 5;

// Global type declarations

// React Native global
declare var __DEV__: boolean;

// Common type helpers
type AnyFunction = (...args: any[]) => any;
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Supabase payload types
interface DatabasePayload {
  new: any;
  old: any;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

// Notification types (matches actual structure from database)
interface Notification {
  id: string;
  title: string;
  message: string;
  is_read?: boolean;
  created_at: string;
  user_id?: string;
  type?: string;
  priority?: string;
  read_at?: string;
  updated_at?: string;
}

// Extended notification for local use
interface NotificationData extends Notification {
  is_read: boolean;
  user_id: string;
}

// Mood entry types (matches Supabase structure)
interface MoodEntry {
  id?: string;
  emoji: string;
  notes?: string;
  schedule_key?: string;
  created_at?: string;
  user_id?: string;
}

// Bubble animation config (matches actual bubbleConfigs structure)
interface BubbleConfig {
  size: number;
  color: string;
  opacity: number;
  left: number;    // Changed from x to left
  delay: number;   // Added delay
  duration: number;
}
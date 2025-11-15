/**
 * Common utility functions used across the application
 * Centralized to avoid code duplication
 */

/**
 * Format time from HH:MM:SS to 12-hour format with AM/PM
 * @param timeString - Time string in format "HH:MM:SS"
 * @returns Formatted time string like "9:00 AM"
 */
export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Format timestamp to relative time or date
 * @param timestamp - ISO timestamp string
 * @returns Formatted string like "Just now", "5m ago", "2h ago", or date
 */
export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Format full date and time
 * @param dateTimeString - Date/time string or Date object
 * @returns Formatted string like "Nov 14, 2025, 3:45 PM"
 */
export const formatDateTime = (dateTimeString: string | number | Date): string => {
  const date = new Date(dateTimeString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // For recent times, use relative format
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // For older times, use full format
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Format time only from Date object
 * @param date - Date object
 * @returns Time string in 12-hour format
 */
export const formatTimeOnly = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format seconds to MM:SS
 * @param seconds - Number of seconds
 * @returns Formatted time string like "03:45"
 */
export const formatSeconds = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format date to YYYY-MM-DD in local timezone
 * @param date - Date object
 * @returns Date string like "2025-11-14"
 */
export const formatDateToLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert HSL to Hex color
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color string like "#FF0000"
 */
export const hslToHex = (h: number, s: number, l: number): string => {
  const hDecimal = l / 100;
  const a = (s * Math.min(hDecimal, 1 - hDecimal)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = hDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

/**
 * Convert Hex to HSL color
 * @param hex - Hex color string like "#FF0000"
 * @returns Array [hue, saturation, lightness]
 */
export const hexToHsl = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

/**
 * Capitalize first letter of each word
 * @param text - Input text
 * @returns Capitalized text
 */
export const capitalizeWords = (text: string): string => {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Validate email format
 * @param email - Email string
 * @returns True if valid email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (10 digits)
 * @param phone - Phone number string
 * @returns True if valid 10-digit phone
 */
export const isValidPhone = (phone: string): boolean => {
  return /^\d{10}$/.test(phone);
};

/**
 * Convert base64 to Uint8Array for file uploads
 * @param base64 - Base64 string
 * @returns Uint8Array
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Handle Supabase errors with user-friendly messages
 * @param error - Supabase error object
 * @param defaultMessage - Default error message
 * @returns User-friendly error message
 */
export const getSupabaseErrorMessage = (error: any, defaultMessage: string = 'An error occurred'): string => {
  if (!error) return defaultMessage;

  // Table doesn't exist
  if (error.code === '42P01') {
    return 'Database table not found. Please contact support.';
  }
  
  // Permission denied
  if (error.code === '42501' || error.message?.includes('row-level security')) {
    return 'Permission denied. Please check your access rights.';
  }
  
  // Unique constraint violation
  if (error.code === '23505') {
    return 'This record already exists.';
  }
  
  // Foreign key violation
  if (error.code === '23503') {
    return 'Related record not found.';
  }

  return error.message || defaultMessage;
};

/**
 * Generate default time slots (9 AM - 4 PM, skip 1 PM)
 * @returns Array of time slot objects with start and end times
 */
export const generateDefaultSlots = (): Array<{ start: string; end: string }> => {
  const slots: Array<{ start: string; end: string }> = [];
  const hours = [9, 10, 11, 12, 14, 15]; // Skip 13 (1:00 PM)

  hours.forEach(hour => {
    slots.push({
      start: `${hour.toString().padStart(2, '0')}:00:00`,
      end: `${hour.toString().padStart(2, '0')}:50:00`
    });
  });

  return slots;
};

/**
 * Check if two time slots overlap
 * @param slot1Start - First slot start time
 * @param slot1End - First slot end time
 * @param slot2Start - Second slot start time
 * @param slot2End - Second slot end time
 * @returns True if slots overlap
 */
export const doSlotsOverlap = (
  slot1Start: string,
  slot1End: string,
  slot2Start: string,
  slot2End: string
): boolean => {
  return slot1Start < slot2End && slot1End > slot2Start;
};

/**
 * Debounce function to limit rapid function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format relative time for posts/messages
 * @param dateString - ISO date string
 * @returns Formatted string like "Just now", "5m ago", "2h ago", "3d ago", or date
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Pick media (image or video) from device gallery
 * Requires expo-image-picker and expo-media-library
 * @returns Selected media object with uri and type, or null if cancelled
 */
export const pickMediaFromGallery = async (): Promise<{ uri: string; type: 'image' | 'video' } | null> => {
  try {
    // Dynamic imports to avoid import errors if packages not installed
    const MediaLibrary = require('expo-media-library');
    const ImagePicker = require('expo-image-picker');

    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    const { status: imagePickerStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (mediaStatus !== 'granted' || imagePickerStatus !== 'granted') {
      throw new Error('Permission needed to access media library');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';
      return { uri: asset.uri, type };
    }

    return null;
  } catch (error) {
    console.error('Error picking media:', error);
    throw error;
  }
};

/**
 * Upload media file to Supabase storage
 * @param uri - File URI
 * @param type - Media type ('image' or 'video')
 * @param bucket - Storage bucket name (default: 'media')
 * @param folder - Folder path within bucket (default: 'community')
 * @returns Public URL of uploaded file
 */
export const uploadMediaToSupabase = async (
  uri: string,
  type: 'image' | 'video',
  bucket: string = 'media',
  folder: string = 'community'
): Promise<string> => {
  try {
    // Dynamic imports
    const FileSystem = require('expo-file-system');
    const { supabase } = require('./supabase');

    if (!uri || !uri.startsWith('file://')) {
      throw new Error('Invalid file URI provided');
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${type === 'image' ? 'jpg' : 'mp4'}`;
    const filePath = `${folder}/${fileName}`;

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist at the provided URI');
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, bytes, {
        contentType: type === 'image' ? 'image/jpeg' : 'video/mp4',
        upsert: false,
      });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!urlData?.publicUrl) throw new Error('Failed to get public URL for uploaded media');

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

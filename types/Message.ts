
export interface ChatMessage {
    id: string;
    sender_id: string;
    receiver_id: string;
    receiver_name: string;
    sender_name: string;
    sender_type: 'EXPERT' | 'STUDENT' | 'PEER' | 'ADMIN';
    receiver_type: 'EXPERT' | 'STUDENT' | 'PEER' | 'ADMIN';
    message: string;
    created_at: string;
    is_read?: boolean;
}

export interface GroupedConversation {
    sender_id: string;
    sender_name: string;
    sender_type: string;
    latest_message: string;
    latest_timestamp: string;
    message_count: number;
    is_read?: boolean;
}


export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantType: 'student' | 'expert' | 'peer' | 'admin';
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  profilePic: number;
  isOnline: boolean;
}

export interface ReceivedMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  sender_type: 'STUDENT' | 'EXPERT' | 'PEER' | 'ADMIN';
  message: string;
  created_at: string;
  is_read: boolean;
  profilePic?: number;
}
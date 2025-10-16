
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
import { useMemo } from "react";
import { ChatMessage } from "@/types/Message";
import { useMessagesByUserId } from "./ExpertMessages";

export const useConversations = (profileId: string | null | undefined) => {
  const { data: messages = [], isLoading, error, refetch } = useMessagesByUserId(profileId);

  const conversations = useMemo(() => {
    const map = new Map<string, ChatMessage>();

    messages.forEach((msg) => {
      const otherId = msg.sender_id === profileId ? msg.receiver_id : msg.sender_id;

      // If this participant already exists, keep only the latest message
      if (!map.has(otherId) || new Date(msg.created_at) > new Date(map.get(otherId)!.created_at)) {
        map.set(otherId, msg);
      }
    });

    // Convert map → array
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [messages, profileId]);

  return { conversations, isLoading, error , refetch};
};

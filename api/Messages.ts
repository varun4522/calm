import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/Message';


// Fetch messages for a specific user (sent or received)
export const useMessagesByUserId = (userId: string | null | undefined) => {
  return useQuery<ChatMessage[]>({
    queryKey: ["messages", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data as ChatMessage[];
    },
    enabled: !!userId,
  });
};

// Insert a new message
export const useInsertMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newMessage: Omit<ChatMessage, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            ...newMessage,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as ChatMessage;
    },
    onSuccess: (data) => {
      // Invalidate both expert & student cache
      queryClient.invalidateQueries({
        queryKey: ["chatMessages", data.sender_id, data.receiver_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["chatMessages", data.receiver_id, data.sender_id],
      });
    },
  });
};


// Delete a message
export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<ChatMessage[]>(["messages"], (old) =>
        old ? old.filter((m) => m.id !== id) : []
      );
    },
  });
};


export const useChatMessages = (expertId: string | null | undefined, studentId: string | null | undefined) => {
  return useQuery<ChatMessage[]>({
    queryKey: ["chatMessages", expertId, studentId],
    queryFn: async () => {
      if (!expertId || !studentId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${expertId},receiver_id.eq.${studentId}),and(sender_id.eq.${studentId},receiver_id.eq.${expertId})`
        )
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data as ChatMessage[];
    },
    enabled: !!expertId && !!studentId,
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types/Notification";

export const useNotificationsByExpertId = (expertId: string | null | undefined) => {
  return useQuery<Notification[]>({
    queryKey: ["notifications", expertId],
    queryFn: async () => {
      if (!expertId) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("sender_id", expertId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as Notification[];
    },
    enabled: !!expertId,
  });
};

export const useInsertNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newNotification: Omit<Notification, "id">) => {
      const { data, error } = await supabase
        .from("notifications")
        .insert([newNotification])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Notification;
    },
    onSuccess: (data) => {
      // invalidate cache so it refetches updated list
      queryClient.invalidateQueries({ queryKey: ["notifications", data.sender_id] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (_, id) => {
      // remove deleted notification from cache
      queryClient.setQueryData<Notification[]>(["notifications"], (old) =>
        old ? old.filter((n) => n.id !== id) : []
      );
    },
  });
};

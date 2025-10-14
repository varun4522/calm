import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";


export const useProfile = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, username, group, avatar_url")
        .eq("id", userId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId, // only runs if userId is available
  });
};

export const useSaveProfileChanges = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; username: string; full_name: string }) => {
      const { error, data: updatedProfile } = await supabase
        .from("profiles")
        .update({
          username: data.username,
          full_name: data.full_name, 
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updatedProfile;
    },

    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['profile', variables.id], 
      });
      Toast.show({
        type: 'success',
        text1: 'Changes saved',
        text2: 'Your profile was updated successfully.',
        position: 'bottom',
      });
    },
  });
};

const getAllUsernames = async() => {
  const { data, error } = await supabase.from("profiles").select("username");
  if (error) {
    return [];
  }
  const usernames = data.map((user) => user.username);
  return usernames;
};

export default getAllUsernames;
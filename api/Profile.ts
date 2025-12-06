import { supabase } from "@/lib/supabase";
import { Profile } from "@/types/Profile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";


export const useGetProfileList = (user_type: string) => {
  return useQuery({
    queryKey: ["profiles", user_type], // Better key based on user type
    queryFn: async() => {
      console.log(`📋 Fetching profiles with type: ${user_type}`);
      const {data, error} = await supabase.from("profiles").select("*").eq("type",user_type);
      if (error){
        console.log("❌ Error fetching profiles:", error);
        throw new Error("Error fetching profiles");
      }
      console.log(`✅ Found ${data?.length || 0} ${user_type} profiles`);
      return data;
    }
  })
}

export const useProfile = (userId: string | null | undefined) => {
  return useQuery<Profile>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
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
    mutationFn: async (data: { id: string; username: string; name: string }) => {
      const { error, data: updatedProfile } = await supabase
        .from("profiles")
        .update({
          username: data.username,
          full_name: data.name, 
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

export const useUpdateProfilePicture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; profilePictureIndex: number }) => {
      const { error, data: updatedProfile } = await supabase
        .from("profiles")
        .update({
          profile_picture_index: data.profilePictureIndex,
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
      console.log('✅ Profile picture updated in Supabase');
    },
    
    onError: (error) => {
      console.error('❌ Error updating profile picture:', error);
    },
  });
};

export const getAllUsernames = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("username");
    
    if (error) {
      console.error('Error fetching usernames:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data)) {
      console.warn('No usernames data returned');
      return [];
    }
    
    const usernames = data
      .map((user) => user?.username)
      .filter(Boolean); // Remove null/undefined values
    
    return usernames;
  } catch (err) {
    console.error('Exception fetching usernames:', err);
    return [];
  }
};


export const getAllRegistrationNumbers = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("registration_number");
    
    if (error) {
      console.error('Error fetching registration numbers:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data)) {
      console.warn('No registration numbers data returned');
      return [];
    }
    
    const registrationNumbers = data
      .map((user) => user?.registration_number)
      .filter(Boolean); // Remove null/undefined values
    
    return registrationNumbers;
  } catch (err) {
    console.error('Exception fetching registration numbers:', err);
    return [];
  }
};
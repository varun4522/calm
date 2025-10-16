import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

export const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not log out',
        position: 'bottom',
        visibilityTime: 2000
      });
    } else {
      console.log("Logged out");
      router.replace("/");
      Toast.show({
        type: 'success',
        text1: 'Log out successful',
        position: 'bottom',
        visibilityTime: 1500
      });
    }
  };
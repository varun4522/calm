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

export const formatDateToLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


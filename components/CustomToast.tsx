import { BaseToast, ErrorToast, ToastConfigParams } from "react-native-toast-message";


const toastConfig = {
  success: (props: ToastConfigParams<any>) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "green" }}
      contentContainerStyle={{ paddingHorizontal: 15, justifyContent: "center" }}
      text1Style={{
        fontSize: 18,
        textAlign: "center",
        fontWeight: "bold",
      }}
      text2Style={{
        textAlign: "center",
      }}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
  error: (props: ToastConfigParams<any>) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: "red" }}
      contentContainerStyle={{ paddingHorizontal: 15, justifyContent: "center" }}
      text1Style={{
        fontSize: 18,
        textAlign: "center",
        fontWeight: "bold",
      }}
      text2Style={{
        textAlign: "center",
      }}
    />
  ),
};

export default toastConfig;
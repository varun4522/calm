import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import * as FileSystem from 'expo-file-system';
import { decode } from "base64-arraybuffer";

export const uploadFile = async (uri: string) => {
    const expertId = await AsyncStorage.getItem("currentExpertId");

    if (!uri.startsWith("file://")) return;

    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const fileName = uri.split('/').pop();
    const filePath = `${expertId}/${fileName}`;
    const ext = fileName?.split(".").pop()?.toLowerCase();

    let contentType = "application/octet-stream";
    
    // PDF files
    if (ext === "pdf") {
        contentType = "application/pdf";
    } 
    // Image files
    else if (ext === "png") {
        contentType = "image/png";
    } else if (ext === "jpg" || ext === "jpeg") {
        contentType = "image/jpeg";
    } else if (ext === "gif") {
        contentType = "image/gif";
    } else if (ext === "webp") {
        contentType = "image/webp";
    } else if (ext === "heic" || ext === "heif") {
        contentType = "image/heic";
    }
    // Video files
    else if (ext === "mp4") {
        contentType = "video/mp4";
    } else if (ext === "mov") {
        contentType = "video/quicktime";
    } else if (ext === "avi") {
        contentType = "video/x-msvideo";
    } else if (ext === "webm") {
        contentType = "video/webm";
    } else if (ext === "mkv") {
        contentType = "video/x-matroska";
    }

    try {
        const { data, error } = await supabase.storage
            .from("library_pdfs")
            .upload(filePath, decode(base64), { contentType });

        if (error) console.log("Upload error:", error);
        else console.log("Upload data:", data);

        return data?.path;
    } catch (e) {
        console.log("Upload exception:", e);
        return null;
    }
};

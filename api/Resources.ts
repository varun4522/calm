import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LearningResource } from "@/types/LearningResource";
import { Alert, Linking } from "react-native";


interface PreviewHandlers {
  setSelectedResource: React.Dispatch<React.SetStateAction<LearningResource | null>>;
  setShowPreviewModal: React.Dispatch<React.SetStateAction<boolean>>;
}


export const useLibraryResources = () => {
  return useQuery<LearningResource[]>({
    queryKey: ["libraryResources"],
    queryFn: async () => {
      const { data: libraryData, error } = await supabase
        .from("library")
        .select("*");

      if (error) {
        if (error.code === "42P01") {
          console.log("Library table not found:", error);
          return []; // Return empty array if table doesn't exist
        }
        throw new Error(`Failed to load library resources: ${error.message}`);
      }

      // Map library data to LearningResource format
      const mappedResources: LearningResource[] = (libraryData || []).map(item => ({
        id: item.id || String(Math.random()),
        resource_title: item.resource_title || item.title || item.name || "Untitled Resource",
        description: item.description || "No description available",
        file_url: item.file_url || item.url || "",
        file_type: item.file_type || item.type || "unknown",
        category: item.category || "REMEMBER BETTER",
      }));

      console.log(`Loaded ${mappedResources.length} resources from library table`);
      return mappedResources;
    },
    // Optionally, you can set staleTime or cacheTime to reduce refetching
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const downloadResource = async (
  resource: LearningResource
) => {
  try {
    Alert.alert(
      "Open Resource",
      `Open "${resource.resource_title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open",
          onPress: async () => {
            try {
              // Get the file URL from Supabase storage
              let fileUrl = resource.file_url;

              // If it's a storage path, get the public URL
              if (!fileUrl.startsWith("http")) {
                const { data } = supabase.storage
                  .from("library_pdfs")
                  .getPublicUrl(fileUrl);

                fileUrl = data.publicUrl;
              }

              // Open the file URL in browser/viewer
              const supported = await Linking.canOpenURL(fileUrl);
              if (supported) {
                await Linking.openURL(fileUrl);
              } else {
                Alert.alert("Error", "Unable to open this file type.");
              }
            } catch (err) {
              console.error("Open error:", err);
              Alert.alert("Error", "Failed to open the file. Please try again.");
            }
          },
        },
      ]
    );
  } catch (error) {
    console.error("Download error:", error);
    Alert.alert("Error", "Failed to open resource");
  }
};



export const previewResource = async (
  resource: LearningResource,
  { setSelectedResource, setShowPreviewModal }: PreviewHandlers
) => {
  try {
    let fileUrl = resource.file_url;

    // If it's a storage path, get the public URL
    if (!fileUrl.startsWith("http")) {
      const { data } = supabase.storage
        .from("library_pdfs")
        .getPublicUrl(fileUrl);

      fileUrl = data.publicUrl;
    }

    // PDFs → open externally
    if (resource.file_type === "application/pdf") {
      await Linking.openURL(fileUrl);
    }
    // Images → show in modal
    else if (resource.file_type.startsWith("image/")) {
      setSelectedResource({ ...resource, file_url: fileUrl });
      setShowPreviewModal(true);
    }
    // Videos → open externally
    else if (resource.file_type.startsWith("video/")) {
      await Linking.openURL(fileUrl);
    }
    // Other types → attempt to open
    else {
      await Linking.openURL(fileUrl);
    }
  } catch (error) {
    console.error("Preview error:", error);
    Alert.alert(
      "Preview Error",
      "Unable to preview this file. You can try downloading it instead."
    );
  }
};

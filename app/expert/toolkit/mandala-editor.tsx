import { useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, Button } from "react-native";
import * as MediaLibrary from "expo-media-library";
import Svg, { Path } from "react-native-svg";
import { mandalaTemplates } from "@/constants/data/mandala-data";
import { MandalaTemplate } from "@/types/MandalaTemplateType";
import ColorPickerModal from "@/components/ColorPicker";
import { captureRef } from "react-native-view-shot";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view";

const SampleMandala = () => {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<MandalaTemplate | null>(null);
  const [pathColors, setPathColors] = useState<Record<number, string>>({});
  const [zoomLevel, setZoomLevel] = useState(1);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("#FF0000");

  const predefinedColors = [
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FFA500",
    "#800080",
    "#FFC0CB",
    "#A52A2A",
    "#808080",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
  ];

  const handlePress = (id: number) => {
    if (!selectedTemplate) return;
    setPathColors((prev) => ({ ...prev, [id]: selectedColor }));
  };

  // inside your component
  const svgRef = useRef<View | null>(null);

  const saveSvgToGallery = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to save images."
        );
        return;
      }
      console.log("pressed");
      if (svgRef.current) {
        // Capture the SVG as an image
        const uri = await captureRef(svgRef.current, {
          format: "png",
          quality: 1,
        });
        console.log(uri);

        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync("Calm App Doodles", asset, false);
        console.log("done saving");
        Alert.alert("Success", "Your mandala has been saved to your gallery!");
      }
    } catch (error) {
      console.error("Error saving SVG:", error);
      Alert.alert("Error", "Failed to save your mandala.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Template selection */}
      <View style={{ padding: 10, }}>
        <Text style={styles.heading}>Choose Mandala Template</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {mandalaTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.templateItem,
                selectedTemplate?.id === template.id && styles.selectedTemplate,
              ]}
              onPress={() => {
                setSelectedTemplate(template);
                setPathColors({});
              }}
            >
              <View style={styles.templatePreview}>
                <Image
                  source={template.image_url}
                  style={styles.previewCanvas}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.templateName}>{template.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Color picker */}
      <View style={styles.colorPicker}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {predefinedColors.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setSelectedColor(color)}
              style={[
                styles.colorCircle,
                { backgroundColor: color },
                selectedColor === color && styles.selectedColorCircle,
              ]}
            />
          ))}
          <TouchableOpacity
            onPress={() => setShowColorPicker(true)}
            style={[styles.colorCircle, styles.addColorCircle]}
          >
            <Text style={{ fontSize: 20, color: "#666" }}>+</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.svgContainer}>
        {selectedTemplate ? (
          <View
            style={{
              width: 400,
              height: 400,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#e2e0e0ff",
            }}
          >
            <ReactNativeZoomableView
              maxZoom={5}
              minZoom={1}
              zoomStep={0.5}
              initialZoom={1}
              bindToBorders={true}
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
              onZoomAfter={(event, gestureState, zoomableViewEventObject) => {
                setZoomLevel(zoomableViewEventObject.zoomLevel);
              }}
            >
              <View
                ref={svgRef}
                collapsable={false} // <-- very important for captureRef to work
                style={{
                  width: 400,
                  height: 400,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="5 5 500 500"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {selectedTemplate.path.map((p) => (
                    <Path
                      key={p.id}
                      d={p.d}
                      onPressIn={() => handlePress(p.id)}
                      fill={pathColors[p.id] || p.defaultFill}
                      stroke="black"
                      strokeWidth={selectedTemplate.strokeWidth}
                    />
                  ))}
                </Svg>
              </View>
            </ReactNativeZoomableView>
          </View>
        ) : (
          <Text style={{ textAlign: "center", color: "#666" }}>
            Select a template to start coloring
          </Text>
        )}
      </View>

      <View
        style={{
          margin: 10,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-evenly",
          columnGap: 10,
        }}
      >
        <Button
          title="Save as image"
          disabled={selectedTemplate ? false : true}
          onPress={() => {
            saveSvgToGallery();
          }}
        />
        <Button
          title="Clear template"
          onPress={() => {
            setSelectedTemplate(null);
          }}
          disabled={selectedTemplate !== null ? false : true}
        />
      </View>
      {/* Custom color modal */}
      <ColorPickerModal
        visible={showColorPicker}
        initialColor={selectedColor}
        onApply={(color) => setSelectedColor(color)}
        onClose={() => setShowColorPicker(false)}
      />
    </View>
  );
};

export default SampleMandala;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffffff",
    paddingTop: 20,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "#8B5CF6",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  templateItem: {
    marginRight: 15,
    alignItems: "center",
    padding: 10,
    borderRadius: 15,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "transparent",
    minWidth: 90,
  },
  selectedTemplate: {
    borderColor: "#4ECDC4",
    backgroundColor: "#e8f9f8",
  },
  templatePreview: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 8,
    overflow: "hidden",
    elevation: 2,
  },
  previewCanvas: {
    width: "100%",
    height: "100%",
  },
  templateName: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
    maxWidth: 80,
  },
  colorPicker: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 15,
  },
  colorCircle: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedColorCircle: {
    borderWidth: 3,
    borderColor: "#000",
  },
  addColorCircle: {
    backgroundColor: "#f0f0f0",
  },
  svgContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    width: "100%",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  colorPickerModal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginVertical: 10,
  },
  colorOption: {
    width: 35,
    height: 35,
    borderRadius: 20,
    margin: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  colorPickerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 15,
  },
  colorPickerButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: "#ccc",
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: "#4ECDC4",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

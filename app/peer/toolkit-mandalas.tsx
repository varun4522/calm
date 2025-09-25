import { Ionicons } from '@expo/vector-icons';
import { Canvas, Path } from '@shopify/react-native-skia';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { captureRef } from 'react-native-view-shot';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MandalaTemplate {
  id: number;
  name: string;
  path: string;
  strokeWidth: number;
}

const mandalaTemplates: MandalaTemplate[] = [
  {
    id: 1,
    name: 'Lotus Mandala',
    path: 'M100,50 Q150,25 200,50 Q175,75 150,100 Q125,75 100,50 Z M50,100 Q25,50 50,0 Q75,25 100,50 Q75,75 50,100 Z M200,50 Q225,100 200,150 Q175,125 150,100 Q175,75 200,50 Z M150,100 Q175,125 200,150 Q150,175 100,150 Q125,125 150,100 Z M100,150 Q75,175 50,150 Q25,125 50,100 Q75,125 100,150 Z',
    strokeWidth: 2,
  },
  {
    id: 2,
    name: 'Geometric Star',
    path: 'M100,20 L110,80 L170,80 L125,115 L140,175 L100,140 L60,175 L75,115 L30,80 L90,80 Z M100,50 L120,60 L130,80 L120,100 L100,110 L80,100 L70,80 L80,60 Z',
    strokeWidth: 2,
  },
  {
    id: 3,
    name: 'Floral Circle',
    path: 'M100,100 m-60,0 a60,60 0 1,0 120,0 a60,60 0 1,0 -120,0 M100,40 Q120,60 140,80 Q120,100 100,120 Q80,100 60,80 Q80,60 100,40 M70,70 Q85,55 100,70 Q115,55 130,70 Q115,85 100,100 Q85,85 70,70',
    strokeWidth: 1.5,
  },
  {
    id: 4,
    name: 'Celtic Knot',
    path: 'M50,50 Q75,25 100,50 Q125,25 150,50 Q125,75 100,50 Q75,75 50,50 M150,50 Q175,75 150,100 Q175,125 150,150 Q125,125 150,100 Q125,75 150,50 M150,150 Q125,175 100,150 Q75,175 50,150 Q75,125 100,150 Q125,125 150,150 M50,150 Q25,125 50,100 Q25,75 50,50 Q75,75 50,100 Q75,125 50,150',
    strokeWidth: 2,
  },
  {
    id: 5,
    name: 'Sun Mandala',
    path: 'M100,100 m-50,0 a50,50 0 1,0 100,0 a50,50 0 1,0 -100,0 M100,50 L105,45 L110,50 L105,55 Z M141,79 L146,74 L151,79 L146,84 Z M141,121 L146,116 L151,121 L146,126 Z M100,150 L105,145 L110,150 L105,155 Z M59,121 L54,116 L49,121 L54,126 Z M59,79 L54,74 L49,79 L54,84 Z',
    strokeWidth: 1.8,
  },
  {
    id: 6,
    name: 'Butterfly Wings',
    path: 'M100,100 Q80,80 60,100 Q80,120 100,100 Q120,80 140,100 Q120,120 100,100 M60,100 Q40,80 20,100 Q40,120 60,100 M140,100 Q160,80 180,100 Q160,120 140,100 M100,70 Q110,60 120,70 Q110,80 100,70 M100,130 Q110,120 120,130 Q110,140 100,130',
    strokeWidth: 1.5,
  },
  {
    id: 7,
    name: 'Rose Window',
    path: 'M100,100 m-80,0 a80,80 0 1,0 160,0 a80,80 0 1,0 -160,0 M100,100 m-60,0 a60,60 0 1,0 120,0 a60,60 0 1,0 -120,0 M100,100 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0 M100,20 L100,100 M180,100 L100,100 M100,180 L100,100 M20,100 L100,100',
    strokeWidth: 1.5,
  },
  {
    id: 8,
    name: 'Sacred Geometry',
    path: 'M100,30 L130,60 L170,60 L130,100 L170,140 L130,140 L100,170 L70,140 L30,140 L70,100 L30,60 L70,60 Z M100,60 L120,80 L140,100 L120,120 L100,140 L80,120 L60,100 L80,80 Z',
    strokeWidth: 2,
  },
];

interface PathData {
  path: string;
  color: string;
  strokeWidth: number;
}

export default function MandalaToolkit() {
  // Core state
  const [selectedTemplate, setSelectedTemplate] = useState<MandalaTemplate | null>(null);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [eraserSize, setEraserSize] = useState(10);

  // UI state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  // Canvas reference
  const canvasRef = useRef<View>(null);

  // Predefined colors
  const predefinedColors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
    '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
  ];

  // Pan responder for drawing
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;

      // Start new path for both drawing and erasing
      setIsDrawing(true);
      const canvasX = (locationX - translateX) / scale;
      const canvasY = (locationY - translateY) / scale;
      setCurrentPath(`M${canvasX},${canvasY}`);
    },

    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;

      if (isDrawing) {
        // Continue path for both drawing and erasing
        const canvasX = (locationX - translateX) / scale;
        const canvasY = (locationY - translateY) / scale;
        setCurrentPath(prev => `${prev} L${canvasX},${canvasY}`);
      }
    },

    onPanResponderRelease: () => {
      if (isDrawing && currentPath) {
        // Save the completed path with appropriate color and size
        setPaths(prev => [...prev, {
          path: currentPath,
          color: isEraser ? '#FFFFFF' : strokeColor,
          strokeWidth: isEraser ? eraserSize : strokeWidth
        }]);
      }
      setIsDrawing(false);
      setCurrentPath('');
    },
  });

  // Template selection
  const selectTemplate = (template: MandalaTemplate) => {
    setSelectedTemplate(template);
    setIsEraser(false);
  };

  // Clear all drawings
  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath('');
    setIsEraser(false);
  };

  // Toggle eraser mode
  const toggleEraser = () => {
    setIsEraser(!isEraser);
  };

  // Save drawing
  const saveDrawing = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to save images.');
        return;
      }

      if (canvasRef.current) {
        const uri = await captureRef(canvasRef.current, {
          format: 'png',
          quality: 1.0,
        });

        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Success', 'Your mandala has been saved to your gallery!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save the image.');
    }
  };

  // Color picker functions
  const openColorPicker = () => setShowColorPicker(true);
  const closeColorPicker = () => setShowColorPicker(false);
  const selectColor = (color: string) => {
    setStrokeColor(color);
    setIsEraser(false); // Exit eraser mode when selecting a color
    closeColorPicker();
  };

  // Brush size adjustment
  const adjustBrushSize = (newSize: number) => {
    setStrokeWidth(Math.max(1, Math.min(10, newSize)));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Mandala Toolkit</Text>
        <TouchableOpacity style={styles.saveButton} onPress={saveDrawing}>
          <Ionicons name="download" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Canvas */}
      <View style={styles.canvasContainer}>
        <View
          ref={canvasRef}
          style={styles.canvas}
          {...panResponder.panHandlers}
        >
          <Canvas style={StyleSheet.absoluteFillObject}>
            {/* Template path */}
            {selectedTemplate && (
              <Path
                path={selectedTemplate.path}
                style="stroke"
                strokeWidth={selectedTemplate.strokeWidth}
                color="#666666"
              />
            )}

            {/* User drawn paths */}
            {paths.map((pathData, index) => (
              <Path
                key={index}
                path={pathData.path}
                style="stroke"
                strokeWidth={pathData.strokeWidth}
                color={pathData.color}
              />
            ))}

            {/* Current drawing path */}
            {currentPath && (
              <Path
                path={currentPath}
                style="stroke"
                strokeWidth={isEraser ? eraserSize : strokeWidth}
                color={isEraser ? '#FFFFFF' : strokeColor}
              />
            )}
          </Canvas>
        </View>
      </View>

      {/* Controls */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Template Selection with Eraser */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Choose a Template</Text>
            <TouchableOpacity
              style={[styles.eraserButton, isEraser && styles.activeEraserButton]}
              onPress={toggleEraser}
            >
              <Text style={{
                color: isEraser ? "#fff" : "#666",
                fontWeight: 'bold',
                fontSize: 12
              }}>
                E
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.templateScroll}
            contentContainerStyle={styles.templateContainer}
          >
            {mandalaTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateItem,
                  selectedTemplate?.id === template.id && styles.selectedTemplate
                ]}
                onPress={() => selectTemplate(template)}
              >
                <View style={styles.templatePreview}>
                  <Canvas style={styles.previewCanvas}>
                    <Path
                      path={template.path}
                      style="stroke"
                      strokeWidth={template.strokeWidth}
                      color={selectedTemplate?.id === template.id ? "#4ECDC4" : "#666"}
                    />
                  </Canvas>
                </View>
                <Text style={styles.templateName}>{template.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Drawing Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Drawing Tools</Text>

          {/* Color Selection */}
          <View style={styles.toolRow}>
            <Text style={styles.toolLabel}>Color:</Text>
            <TouchableOpacity
              style={[styles.colorButton, isEraser && styles.disabledButton]}
              onPress={openColorPicker}
              disabled={isEraser}
            >
              <View style={[styles.colorPreview, { backgroundColor: strokeColor }]} />
              <Text style={[styles.colorButtonText, isEraser && styles.disabledText]}>
                {isEraser ? 'Exit Eraser to Change Color' : 'Choose Color'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Brush/Eraser Size */}
          <View style={styles.toolRow}>
            <Text style={styles.toolLabel}>
              {isEraser ? 'Eraser' : 'Brush'} Size: {isEraser ? eraserSize : strokeWidth}px
            </Text>
            <View style={styles.brushSizeControls}>
              <TouchableOpacity
                style={styles.sizeButton}
                onPress={() => {
                  if (isEraser) {
                    setEraserSize(Math.max(5, eraserSize - 2));
                  } else {
                    adjustBrushSize(strokeWidth - 1);
                  }
                }}
              >
                <Ionicons name="remove" size={20} color="#666" />
              </TouchableOpacity>
              <View style={styles.sizeDisplay}>
                <Text style={styles.sizeText}>{isEraser ? eraserSize : strokeWidth}</Text>
              </View>
              <TouchableOpacity
                style={styles.sizeButton}
                onPress={() => {
                  if (isEraser) {
                    setEraserSize(Math.min(30, eraserSize + 2));
                  } else {
                    adjustBrushSize(strokeWidth + 1);
                  }
                }}
              >
                <Ionicons name="add" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={clearCanvas}>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Clear All</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={saveDrawing}>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={closeColorPicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.colorPickerModal}>
            <Text style={styles.modalTitle}>Choose a Color</Text>
            <View style={styles.colorGrid}>
              {predefinedColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }]}
                  onPress={() => selectColor(color)}
                >
                  {strokeColor === color && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.colorPickerButtons}>
              <TouchableOpacity
                style={[styles.colorPickerButton, styles.cancelButton]}
                onPress={closeColorPicker}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.colorPickerButton, styles.confirmButton]}
                onPress={closeColorPicker}
              >
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#4ECDC4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  saveButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  canvasContainer: {
    flex: 1,
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    maxHeight: screenHeight * 0.45,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  eraserButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: 45,
    height: 45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeEraserButton: {
    backgroundColor: '#4ECDC4',
  },
  templateScroll: {
    flexDirection: 'row',
  },
  templateContainer: {
    paddingRight: 20,
  },
  templateItem: {
    marginRight: 15,
    alignItems: 'center',
    padding: 12,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 90,
  },
  selectedTemplate: {
    borderColor: '#4ECDC4',
    backgroundColor: '#e8f9f8',
  },
  templatePreview: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  previewCanvas: {
    width: '100%',
    height: '100%',
  },
  templateName: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 80,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 5,
  },
  toolLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  colorButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  brushSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    padding: 4,
  },
  sizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sizeDisplay: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  sizeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#4ECDC4',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    margin: 20,
    maxWidth: 350,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  colorOption: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  colorPickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  colorPickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#4ECDC4',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { Canvas, Group, Path } from '@shopify/react-native-skia';
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
import { PinchGestureHandler } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MandalaTemplate {
  id: number;
  name: string;
  path: string;
  strokeWidth: number;
  fillColor?: string;
}

const mandalaTemplates: MandalaTemplate[] = [
  {
    id: 1,
    name: 'Lotus Mandala',
    path: 'M100,50 Q150,25 200,50 Q175,75 150,100 Q125,75 100,50 Z ...',
    strokeWidth: 2,
    fillColor: '#FFD700',
  },
  {
    id: 2,
    name: 'Geometric Star',
    path: 'M100,20 L110,80 L170,80 L125,115 L140,175 ...',
    strokeWidth: 2,
    fillColor: '#FF69B4',
  },
  {
    id: 3,
    name: 'Floral Circle',
    path: 'M100,100 m-60,0 a60,60 0 1,0 120,0 ...',
    strokeWidth: 1.5,
    fillColor: '#87CEFA',
  },
];

interface PathData {
  path: string;
  color: string;
  strokeWidth: number;
}

export default function MandalaToolkit() {
  const [selectedTemplate, setSelectedTemplate] = useState<MandalaTemplate | null>(null);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [eraserSize, setEraserSize] = useState(10);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorMode, setColorMode] = useState<'stroke' | 'fill'>('stroke'); // 🔥 new
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const canvasRef = useRef<View>(null);

  const predefinedColors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
    '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
  ];

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setIsDrawing(true);
      const canvasX = (locationX - translateX) / scale;
      const canvasY = (locationY - translateY) / scale;
      setCurrentPath(`M${canvasX},${canvasY}`);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      if (isDrawing) {
        const canvasX = (locationX - translateX) / scale;
        const canvasY = (locationY - translateY) / scale;
        setCurrentPath(prev => `${prev} L${canvasX},${canvasY}`);
      }
    },
    onPanResponderRelease: () => {
      if (isDrawing && currentPath) {
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

  const selectTemplate = (template: MandalaTemplate) => {
    setSelectedTemplate({ ...template }); // copy so we can edit fillColor
    setIsEraser(false);
  };

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
        Alert.alert('Success', 'Your mandala has been saved!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save the image.');
    }
  };

  const openColorPicker = (mode: 'stroke' | 'fill') => {
    setColorMode(mode);
    setShowColorPicker(true);
  };
  const closeColorPicker = () => setShowColorPicker(false);

  const selectColor = (color: string) => {
    if (colorMode === 'stroke') {
      setStrokeColor(color);
      setIsEraser(false);
    } else if (colorMode === 'fill' && selectedTemplate) {
      setSelectedTemplate({ ...selectedTemplate, fillColor: color });
    }
    closeColorPicker();
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

      {/* Canvas with Zoom */}
      <PinchGestureHandler
        onGestureEvent={(e) => {
          const newScale = Math.max(0.5, Math.min(3, e.nativeEvent.scale));
          setScale(newScale);
        }}
      >
        <View style={styles.canvasContainer}>
          <View ref={canvasRef} style={styles.canvas} {...panResponder.panHandlers}>
            <Canvas style={StyleSheet.absoluteFillObject}>
              <Group transform={[{ scale }, { translateX }, { translateY }]}>
                {selectedTemplate && (
                  <Path
                    path={selectedTemplate.path}
                    style="stroke"
                    strokeWidth={selectedTemplate.strokeWidth}
                    color="#333"
                  />
                )}
                {paths.map((pathData, index) => (
                  <Path
                    key={index}
                    path={pathData.path}
                    style="stroke"
                    strokeWidth={pathData.strokeWidth}
                    color={pathData.color}
                  />
                ))}
                {currentPath && (
                  <Path
                    path={currentPath}
                    style="stroke"
                    strokeWidth={isEraser ? eraserSize : strokeWidth}
                    color={isEraser ? '#FFFFFF' : strokeColor}
                  />
                )}
              </Group>
            </Canvas>
          </View>
        </View>
      </PinchGestureHandler>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity onPress={() => setScale(Math.max(0.5, scale - 0.1))}>
          <Text style={styles.zoomText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.zoomText}>{scale.toFixed(1)}x</Text>
        <TouchableOpacity onPress={() => setScale(Math.min(3, scale + 0.1))}>
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Tools */}
      <View style={styles.tools}>
        <TouchableOpacity style={styles.toolBtn} onPress={() => openColorPicker('stroke')}>
          <Text>Stroke Color</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => openColorPicker('fill')}>
          <Text>Mandala Color</Text>
        </TouchableOpacity>
      </View>

      {/* Color Picker Modal */}
      <Modal visible={showColorPicker} transparent animationType="slide">
        <View style={styles.colorPickerOverlay}>
          <View style={styles.colorPicker}>
            <Text style={styles.colorTitle}>Pick a {colorMode} color</Text>
            <ScrollView contentContainerStyle={styles.colorGrid}>
              {predefinedColors.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.colorOption, { backgroundColor: color }]}
                  onPress={() => selectColor(color)}
                />
              ))}
            </ScrollView>
            <TouchableOpacity onPress={closeColorPicker} style={styles.closeButton}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15,
    backgroundColor: '#4ECDC4'
  },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  saveButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  canvasContainer: {
    flex: 1, margin: 20, backgroundColor: '#fff',
    borderRadius: 15, overflow: 'hidden'
  },
  canvas: { flex: 1, backgroundColor: '#fff' },
  zoomControls: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginVertical: 10
  },
  zoomText: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 15 },
  tools: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  toolBtn: {
    backgroundColor: '#e0e0e0', padding: 10, borderRadius: 10, marginHorizontal: 5
  },
  colorPickerOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  colorPicker: {
    width: '80%', backgroundColor: '#fff', borderRadius: 15,
    padding: 20, alignItems: 'center'
  },
  colorTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  colorOption: {
    width: 40, height: 40, borderRadius: 20, margin: 8,
    borderWidth: 1, borderColor: '#ccc'
  },
  closeButton: {
    marginTop: 20, backgroundColor: '#4ECDC4',
    paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10
  }
});

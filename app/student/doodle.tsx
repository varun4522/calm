import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import Slider from '@react-native-community/slider';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Dimensions, Modal, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

// Conditional import for Skia to handle Expo Go limitations
let Canvas: any = null;
let Path: any = null;

try {
  const Skia = require('@shopify/react-native-skia');
  Canvas = Skia.Canvas;
  Path = Skia.Path;
} catch (error) {
  console.warn('Skia not available in this environment:', error instanceof Error ? error.message : String(error));
}

const { width, height } = Dimensions.get('window');

export default function EnhancedDoodle() {
  const router = useRouter();

  // Show fallback UI if Skia is not available (e.g., in Expo Go)
  if (!Canvas || !Path) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
          🎨 Doodle Feature
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 30, textAlign: 'center', color: '#666' }}>
          The doodle feature requires a development build to work properly. It's not available in Expo Go.
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 30, textAlign: 'center', color: '#888' }}>
          To use this feature, please create a development build or use a physical device build.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 30,
            paddingVertical: 15,
            borderRadius: 25,
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [paths, setPaths] = useState<{ d: string; color: string; strokeWidth: number }[]>([]);
  const [redoStack, setRedoStack] = useState<{ d: string; color: string; strokeWidth: number }[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<string>('#222');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [eraserSize, setEraserSize] = useState<number>(10);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [drawing, setDrawing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#FF0000');
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const canvasRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];

  // Fixed canvas dimensions for consistent zooming - Increased size for better working space
  const CANVAS_WIDTH = width - 30;
  const CANVAS_HEIGHT = height * 0.55; // Increased from 0.5 to 0.85 for more drawing space

  const handleTouchStart = (e: any) => {
  // 👇 only start drawing if exactly one finger
  if (e.nativeEvent.touches.length === 1) {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath(`M${locationX},${locationY}`);
    setDrawing(true);
  } else {
    setDrawing(false); // disable drawing for multi-touch
  }
};

  const handleTouchMove = (e: any) => {
    if (!drawing) return;
    if (e.nativeEvent.touches.length !== 1) return; // ignore if multi-touch
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath((prev) => prev + ` L${locationX},${locationY}`);
  };

  const handleTouchEnd = (e: any) => {
    if (!drawing) return;

    // If it was a single finger drawing
    if (currentPath) {
      setPaths((prev) => [
        ...prev,
        {
          d: currentPath,
          color: isEraser ? "#fff" : currentColor,
          strokeWidth: isEraser ? eraserSize : brushSize,
        },
      ]);
      setCurrentPath("");
      setRedoStack([]);
    }
    setDrawing(false);
  };

  const handleUndo = () => {
    if (paths.length > 0) {
      const newPaths = [...paths];
      const popped = newPaths.pop(); // remove last stroke
      if (popped) {
        setRedoStack((prev) => [...prev, popped]);
      }
      setPaths(newPaths);
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const newRedoStack = [...redoStack];
      const restored = newRedoStack.pop();
      if (restored) {
        setPaths((prev) => [...prev, restored]);
      }
      setRedoStack(newRedoStack);
    }
  };


  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleColorSelect = (color: string) => {
    setCurrentColor(color);
    setIsEraser(false);
  };

  const toggleEraser = () => {
    setIsEraser(!isEraser);
  };

  // Color picker functions
  // Optimized HSL to Hex conversion with memoization
  const hslToHex = useCallback((h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }, []);

  const hexToHsl = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }, []);

  const openColorPicker = useCallback(() => {
    const [h, s, l] = hexToHsl(currentColor);
    setHue(h);
    setSaturation(s);
    setLightness(l);
    setCustomColor(currentColor);
    setShowColorPicker(true);
  }, [currentColor, hexToHsl]);

  const applyCustomColor = useCallback(() => {
    setCurrentColor(customColor);
    setIsEraser(false);
    setShowColorPicker(false);
  }, [customColor]);

  const saveToGallery = async () => {
    try {
      // Request permission to access media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your gallery.');
        return;
      }

      if (canvasRef.current) {
        // Capture the canvas as an image
        const uri = await captureRef(canvasRef.current, {
          format: 'png',
          quality: 1.0,
        });

        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('Calm App Doodles', asset, false);

        Alert.alert('Success!', 'Your doodle has been saved to your gallery!');
      }
    } catch (error) {
      console.error('Error saving doodle:', error);
      Alert.alert('Error', 'Failed to save your doodle. Please try again.');
    }
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#F5F5F5', // Light gray background
    }}>
      {/* Back Button - Top Left */}
      <View style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#4A90E2',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
            elevation: 4,
            shadowColor: '#AAAAAA',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' }}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 40, paddingHorizontal: 16, marginBottom: 10 }}>
        <View style={{ width: 80 }} />
        <Text style={{ color: '#333333', fontSize: 35, fontWeight: 'bold', marginTop: 8, flex: 1, textAlign: 'center' }}>
          Digital Doodle
        </Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Color Palette - Pastel Colors */}
      <View style={{ flexDirection: 'row', marginBottom: 10, marginHorizontal: 16, justifyContent: 'center' }}>
        {colors.map((color, idx) => (
          <TouchableOpacity
            key={color}
            onPress={() => handleColorSelect(color)}
            style={{
              width: 25,
              height: 25,
              borderRadius: 18,
              backgroundColor: color,
              marginHorizontal: 4,
              borderWidth: currentColor === color && !isEraser ? 3 : 1,
              borderColor: currentColor === color && !isEraser ? '#4A90E2' : '#CCCCCC',
              elevation: 2,
              shadowColor: '#AAAAAA',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
            }}
          />
        ))}
        {/* Eraser Button */}
        <TouchableOpacity
          onPress={toggleEraser}
          style={{
            width: 25,
            height: 25,
            borderRadius: 18,
            backgroundColor: '#fff',
            marginHorizontal: 4,
            borderWidth: isEraser ? 3 : 1,
            borderColor: isEraser ? '#4A90E2' : '#CCCCCC',
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 2,
            shadowColor: '#AAAAAA',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
          }}
        >
          <Text style={{ color: '#6B46C1', fontWeight: 'bold', fontSize: 12 }}>E</Text>
        </TouchableOpacity>

        {/* Custom Color Picker Button */}
        <TouchableOpacity
          onPress={openColorPicker}
          style={{
            width: 25,
            height: 25,
            borderRadius: 18,
            backgroundColor: '#fff',
            marginHorizontal: 4,
            borderWidth: 2,
            borderColor: '#4A90E2',
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 2,
            shadowColor: '#AAAAAA',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
          }}
        >
          <Text style={{ color: '#8B5CF6', fontWeight: 'bold', fontSize: 14 }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Brush/Eraser Size Controls */}
      <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: '#6B46C1', fontSize: 14, width: 80, fontWeight: '600' }}>
            {isEraser ? 'Eraser' : 'Brush'} Size:
          </Text>
          <Text style={{ color: '#8B5CF6', fontSize: 14, fontWeight: 'bold', width: 30 }}>
            {isEraser ? eraserSize : brushSize}
          </Text>
          <Slider
            style={{ flex: 1, marginLeft: 10 }}
            minimumValue={1}
            maximumValue={isEraser ? 30 : 20}
            value={isEraser ? eraserSize : brushSize}
            onValueChange={(value) => {
              if (isEraser) {
                setEraserSize(Math.round(value));
              } else {
                setBrushSize(Math.round(value));
              }
            }}
            minimumTrackTintColor="#CCCCCC"
            maximumTrackTintColor="#EEEEEE"
            thumbTintColor="#4A90E2"
          />
        </View>

        {/* Zoom Controls */}
<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
  <Text style={{ color: '#6B46C1', fontSize: 14, width: 80, fontWeight: '600' }}>
    Zoom:
  </Text>
  <Text style={{ color: '#8B5CF6', fontSize: 14, fontWeight: 'bold', width: 40 }}>
    {zoomLevel.toFixed(1)}x
  </Text>
</View>

      </View>

      {/* Enhanced Canvas Area with Two-Finger Zoom */}
      <View style={{ flex: 1, paddingHorizontal: 10, paddingBottom: 80 }}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100%',
          }}
          minimumZoomScale={1}
          maximumZoomScale={3}
          bouncesZoom={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          pinchGestureEnabled={true}
          scrollEnabled={false}
          centerContent={true}

        >
          <View
            ref={canvasRef}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              overflow: 'hidden',
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              elevation: 4,
              shadowColor: '#AAAAAA',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              borderWidth: 2,
              borderColor: '#CCCCCC',
            }}
          >
            <TouchableWithoutFeedback>
              <View style={{ width: '100%', height: '100%', }}>
                <ReactNativeZoomableView
                  maxZoom={5.5}
                  minZoom={1}
                  zoomStep={0.5}
                  initialZoom={1}
                  bindToBorders={true}
                  panEnabled={false}
                  style={{flex: 1, display: 'flex',  width: "100%"}}
                  onZoomAfter={(event, gestureState, zoomableViewEventObject) => {
                    setZoomLevel(zoomableViewEventObject.zoomLevel);
                  }}
                >
                <Canvas
                  style={{ width: '100%', height: '100%', }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {paths.map((p, i) => (
                    <Path
                      key={i}
                      path={p.d}
                      color={p.color}
                      style="stroke"
                      strokeWidth={p.strokeWidth}
                      strokeCap="round"
                      strokeJoin="round"
                    />
                  ))}
                  {currentPath ? (
                    <Path
                      path={currentPath}
                      color={isEraser ? '#fff' : currentColor}
                      style="stroke"
                      strokeWidth={isEraser ? eraserSize : brushSize}
                      strokeCap="round"
                      strokeJoin="round"
                    />
                  ) : null}
                </Canvas>
                </ReactNativeZoomableView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </ScrollView>
      </View>

      {/* Bottom Controls */}
      <View style={{
        flexDirection: 'row',
        marginBottom: 40,
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#EEEEEE',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 2,
        borderTopColor: '#CCCCCC',
      }}>
        <TouchableOpacity
          onPress={handleClear}
          style={{
            backgroundColor: '#FCA5A5',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            elevation: 2,
            shadowColor: '#F87171',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
          }}
        >
          <Text style={{ color: '#DC2626', fontSize: 16, fontWeight: 'bold' }}>Clear All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={saveToGallery}
          style={{
            backgroundColor: '#A7F3D0',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            elevation: 2,
            shadowColor: '#6EE7B7',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
          }}
        >
          <Text style={{ color: '#059669', fontSize: 16, fontWeight: 'bold' }}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleUndo}
          disabled={paths.length === 0}
          style={{
            backgroundColor: paths.length === 0 ? "#E5E7EB" : "#FDE68A",
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#B45309", fontSize: 16, fontWeight: "bold" }}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRedo}
          disabled={redoStack.length === 0}
          style={{
            backgroundColor: redoStack.length === 0 ? "#E5E7EB" : "#BFDBFE",
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#1D4ED8", fontSize: 16, fontWeight: "bold" }}>Redo</Text>
        </TouchableOpacity>

      </View>

      {/* VS Code Style Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 350,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#333',
              textAlign: 'center',
              marginBottom: 20,
            }}>
              🎨 Custom Color Picker
            </Text>

            {/* Color Preview */}
            <View style={{
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: customColor,
                borderWidth: 3,
                borderColor: '#CCCCCC',
                elevation: 4,
                shadowColor: '#AAAAAA',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
              }} />
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: '#333333',
                marginTop: 8,
              }}>
                {customColor.toUpperCase()}
              </Text>
            </View>

            {/* Hue Slider */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 8 }}>
                Hue: {hue}°
              </Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={360}
                value={hue}
                onSlidingComplete={(value) => {
                  const newHue = Math.round(value);
                  setHue(newHue);
                  setCustomColor(hslToHex(newHue, saturation, lightness));
                }}
                minimumTrackTintColor="#FF0000"
                maximumTrackTintColor="#CCCCCC"
                thumbTintColor="#4A90E2"
                step={1}
              />
            </View>

            {/* Saturation Slider */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 8 }}>
                Saturation: {saturation}%
              </Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={100}
                value={saturation}
                onSlidingComplete={(value) => {
                  const newSaturation = Math.round(value);
                  setSaturation(newSaturation);
                  setCustomColor(hslToHex(hue, newSaturation, lightness));
                }}
                minimumTrackTintColor="#CCCCCC"
                maximumTrackTintColor="#4A90E2"
                thumbTintColor="#4A90E2"
                step={1}
              />
            </View>

            {/* Lightness Slider */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B46C1', marginBottom: 8 }}>
                Lightness: {lightness}%
              </Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={100}
                value={lightness}
                onSlidingComplete={(value) => {
                  const newLightness = Math.round(value);
                  setLightness(newLightness);
                  setCustomColor(hslToHex(hue, saturation, newLightness));
                }}
                minimumTrackTintColor="#000"
                maximumTrackTintColor="#fff"
                thumbTintColor="#4A90E2"
                step={1}
              />
            </View>

            {/* Hex Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 8 }}>
                Hex Code:
              </Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: '#CCCCCC',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: '#333',
                  backgroundColor: '#FFFFFF',
                }}
                value={customColor}
                onChangeText={(text) => {
                  const upperText = text.toUpperCase();
                  if (/^#[0-9A-F]{0,6}$/i.test(upperText)) {
                    setCustomColor(upperText);
                    if (upperText.length === 7) {
                      const [h, s, l] = hexToHsl(upperText);
                      setHue(h);
                      setSaturation(s);
                      setLightness(l);
                    }
                  }
                }}
                placeholder="#FF0000"
                maxLength={7}
                autoCapitalize="characters"
              />
            </View>

            {/* Action Buttons */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={() => setShowColorPicker(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#FCA5A5',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#DC2626', fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={applyCustomColor}
                style={{
                  flex: 1,
                  backgroundColor: '#A7F3D0',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#059669', fontSize: 16, fontWeight: 'bold' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

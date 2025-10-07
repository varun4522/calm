import { useState, FC } from "react";
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";

// Type definitions for props
interface ColorPickerProps {
    visible: boolean;
    initialColor?: string; // default starting color
    onApply: (color: string) => void; // callback when apply is pressed
    onClose: () => void; // callback when modal is closed
}

const ColorPickerModal: FC<ColorPickerProps> = ({
    visible,
    initialColor = "#FF0000",
    onApply,
    onClose,
}) => {
    // Internal state
    const [customColor, setCustomColor] = useState(initialColor);
    const [hue, setHue] = useState(0);
    const [saturation, setSaturation] = useState(100);
    const [lightness, setLightness] = useState(50);

    const applyCustomColor = () => {
        onApply(customColor);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.title}>🎨 Custom Color Picker</Text>

                    {/* Color Preview */}
                    <View style={styles.previewContainer}>
                        <View style={[styles.colorPreview, { backgroundColor: customColor }]} />
                        <Text style={styles.colorText}>{customColor.toUpperCase()}</Text>
                    </View>

                    {/* Hue Slider */}
                    <View style={styles.sliderContainer}>
                        <Text style={styles.sliderLabel}>Hue: {hue}°</Text>
                        <Slider
                            style={styles.slider}
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
                    <View style={styles.sliderContainer}>
                        <Text style={styles.sliderLabel}>Saturation: {saturation}%</Text>
                        <Slider
                            style={styles.slider}
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
                    <View style={styles.sliderContainer}>
                        <Text style={[styles.sliderLabel, { color: "#6B46C1" }]}>Lightness: {lightness}%</Text>
                        <Slider
                            style={styles.slider}
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
                        <Text style={styles.sliderLabel}>Hex Code:</Text>
                        <TextInput
                            style={styles.hexInput}
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
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity onPress={onClose} style={[styles.button, { backgroundColor: "#FCA5A5" }]}>
                            <Text style={{ color: "#DC2626", fontSize: 16, fontWeight: "bold" }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={applyCustomColor} style={[styles.button, { backgroundColor: "#A7F3D0" }]}>
                            <Text style={{ color: "#059669", fontSize: 16, fontWeight: "bold" }}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Styles
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 350,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center",
        marginBottom: 20,
    },
    previewContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    colorPreview: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: "#CCCCCC",
        elevation: 4,
        shadowColor: "#AAAAAA",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    colorText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333333",
        marginTop: 8,
    },
    sliderContainer: {
        marginBottom: 16,
    },
    sliderLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333333",
        marginBottom: 8,
    },
    slider: {
        width: "100%",
        height: 40,
    },
    hexInput: {
        borderWidth: 2,
        borderColor: "#CCCCCC",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: "#333",
        backgroundColor: "#FFFFFF",
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
});

export default ColorPickerModal;

// Convert HSL to HEX
export function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
        Math.round((l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))) * 255)
            .toString(16)
            .padStart(2, "0");

    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// Convert HEX to HSL
export function hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
        s = 0,
        l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h *= 60;
    }

    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

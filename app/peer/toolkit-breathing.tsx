import { useAudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Box Breathing Visual Guide component (imported from home page)
function BoxBreathingGuide({ duration = 4000 }) {
  const size = React.useRef(new Animated.Value(100)).current;
  const [phase, setPhase] = useState('Inhale');
  const [count, setCount] = useState(0);
  const animationRef = React.useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    let phases = ['Inhale', 'Hold', 'Exhale', 'Hold'];
    let i = 0;
    let phaseTimeout: ReturnType<typeof setTimeout>;

    function animatePhase() {
      if (!isMounted) return;

      setPhase(phases[i % 4]);

      // Stop any existing animation
      if (animationRef.current) {
        animationRef.current.stop();
      }

      if (phases[i % 4] === 'Inhale') {
        animationRef.current = Animated.timing(size, {
          toValue: 180,
          duration: duration,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease)
        });

        animationRef.current.start(({ finished }) => {
          if (finished && isMounted) {
            i++;
            setCount(i);
            animatePhase();
          }
        });
      } else if (phases[i % 4] === 'Exhale') {
        animationRef.current = Animated.timing(size, {
          toValue: 100,
          duration: duration,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease)
        });

        animationRef.current.start(({ finished }) => {
          if (finished && isMounted) {
            i++;
            setCount(i);
            animatePhase();
          }
        });
      } else {
        // Clear any existing timeout
        if (phaseTimeout) {
          clearTimeout(phaseTimeout);
        }

        phaseTimeout = setTimeout(() => {
          if (isMounted) {
            i++;
            setCount(i);
            animatePhase();
          }
        }, duration);
      }
    }

    animatePhase();

    return () => {
      isMounted = false;

      // Stop any running animation on cleanup
      if (animationRef.current) {
        animationRef.current.stop();
      }

      // Clear any existing timeout
      if (phaseTimeout) {
        clearTimeout(phaseTimeout);
      }
    };
  }, [duration, size]);

  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <Animated.View style={{ width: size, height: size, borderRadius: 20, borderWidth: 4, borderColor: '#3498db', backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#2c3e50', fontSize: 22, fontWeight: 'bold' }}>{phase}</Text>
      </Animated.View>
      <Text style={{ color: '#2c3e50', marginTop: 10, fontSize: 16 }}>Box Breathing: 4-4-4-4</Text>
    </View>
  );
}

// Breath Pacers with Audio (imported from home page)
const pacerInstructions = [
  { label: 'Inhale', duration: 4000 },
  { label: 'Hold', duration: 4000 },
  { label: 'Exhale', duration: 4000 },
  { label: 'Hold', duration: 4000 },
];
function BreathPacerWithAudio() {
  const [phase, setPhase] = useState('Inhale');
  const [audioFiles, setAudioFiles] = useState<{ uri: string, name: string }[]>([]);
  const [currentTrack, setCurrentTrack] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showList, setShowList] = useState(false);
  const player = useAudioPlayer();
  const audioLoadingRef = React.useRef(false);

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAudioFiles(prev => [...prev, {
          uri: result.assets[0].uri,
          name: result.assets[0].name || `Track ${audioFiles.length + 1}`
        }]);
      }
    } catch (error) {
      console.warn('Error picking audio:', error);
    }
  };

  const startAudio = async (idx: number) => {
    try {
      // Prevent multiple simultaneous loading attempts
      if (audioLoadingRef.current) return;
      audioLoadingRef.current = true;

      if (currentTrack !== null && isPlaying) {
        await player.pause();
      }

      await player.replace(audioFiles[idx].uri);
      await player.play();

      setCurrentTrack(idx);
      setIsPlaying(true);
    } catch (e) {
      console.warn('Error playing audio:', e);
      setIsPlaying(false);
      setCurrentTrack(null);
    } finally {
      audioLoadingRef.current = false;
    }
  };

  const stopAudio = async () => {
    try {
      await player.pause();
      setIsPlaying(false);
      setCurrentTrack(null);
    } catch (e) {
      console.warn('Error stopping audio:', e);
    }
  };

  React.useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.isLoaded) {
        return;
      }

      if (status.didJustFinish) {
        setIsPlaying(false);
        setCurrentTrack(null);
      }
    });

    return () => {
      // Clean up resources
      subscription?.remove();
      if (isPlaying) {
        try {
          player.pause();
        } catch (e) {
          console.warn('Error pausing on unmount:', e);
        }
      }
    };
  }, [player, isPlaying]);

  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <Text style={{ color: '#7f8c8d', fontSize: 16, marginTop: 8 }}>Upload and play your own soundtracks</Text>
      <View style={{ flexDirection: 'row', marginTop: 16 }}>
        <TouchableOpacity onPress={pickAudio} style={{ marginHorizontal: 10, backgroundColor: '#3498db', borderRadius: 20, padding: 10 }}>
          <Text style={{ color: '#ffffff', fontSize: 18 }}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowList(!showList)} style={{ marginHorizontal: 10, backgroundColor: '#e8f4fd', borderRadius: 20, padding: 10 }}>
          <Text style={{ color: '#2c3e50', fontSize: 18 }}>▼</Text>
        </TouchableOpacity>
      </View>
      {showList && (
        <View style={{ marginTop: 10, width: 260, backgroundColor: '#ffffff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#3498db' }}>
          {audioFiles.length === 0 ? (
            <Text style={{ color: '#7f8c8d', textAlign: 'center' }}>No sounds added</Text>
          ) : (
            audioFiles.map((file, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#2c3e50', flex: 1 }}>{file.name}</Text>
                {isPlaying && currentTrack === idx ? (
                  <TouchableOpacity onPress={stopAudio} style={{ backgroundColor: '#e74c3c', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 }}>
                    <Text style={{ color: '#fff' }}>Stop</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => startAudio(idx)} style={{ backgroundColor: '#2ecc71', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 }}>
                    <Text style={{ color: '#fff' }}>Play</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}// Customizable Breath Timer (imported from home page)
function CustomBreathTimer() {
  const [inhale, setInhale] = useState(4);
  const [hold, setHold] = useState(4);
  const [exhale, setExhale] = useState(4);
  const [phase, setPhase] = useState('Inhale');
  const [running, setRunning] = useState(true); // Always running
  const [timer, setTimer] = useState(0);

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (running) {
      let phases = [
        { label: 'Inhale', duration: inhale },
        { label: 'Hold', duration: hold },
        { label: 'Exhale', duration: exhale },
        { label: 'Hold', duration: hold },
      ];
      let currentPhaseIndex = 0;

      const cyclePhases = () => {
        const currentPhase = phases[currentPhaseIndex];
        setPhase(currentPhase.label);
        setTimer(currentPhase.duration);

        timeout = setTimeout(() => {
          currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
          cyclePhases();
        }, currentPhase.duration * 1000);
      };

      cyclePhases();
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [running, inhale, hold, exhale]);

  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <Text style={{ color: '#2c3e50', fontSize: 22, fontWeight: 'bold' }}>{phase}</Text>
      <Text style={{ color: '#2c3e50', fontSize: 18, marginVertical: 8 }}>Time: {timer}s</Text>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        <Text style={{ color: '#2c3e50', marginRight: 8 }}>Inhale</Text>
        <TouchableOpacity onPress={() => setInhale(Math.max(1, inhale - 1))}><Text style={{ color: '#3498db', fontSize: 20 }}>-</Text></TouchableOpacity>
        <Text style={{ color: '#2c3e50', marginHorizontal: 6 }}>{inhale}</Text>
        <TouchableOpacity onPress={() => setInhale(inhale + 1)}><Text style={{ color: '#3498db', fontSize: 20 }}>+</Text></TouchableOpacity>
        <Text style={{ color: '#2c3e50', marginLeft: 16, marginRight: 8 }}>Hold</Text>
        <TouchableOpacity onPress={() => setHold(Math.max(1, hold - 1))}><Text style={{ color: '#3498db', fontSize: 20 }}>-</Text></TouchableOpacity>
        <Text style={{ color: '#2c3e50', marginHorizontal: 6 }}>{hold}</Text>
        <TouchableOpacity onPress={() => setHold(hold + 1)}><Text style={{ color: '#3498db', fontSize: 20 }}>+</Text></TouchableOpacity>
        <Text style={{ color: '#2c3e50', marginLeft: 16, marginRight: 8 }}>Exhale</Text>
        <TouchableOpacity onPress={() => setExhale(Math.max(1, exhale - 1))}><Text style={{ color: '#3498db', fontSize: 20 }}>-</Text></TouchableOpacity>
        <Text style={{ color: '#2c3e50', marginHorizontal: 6 }}>{exhale}</Text>
        <TouchableOpacity onPress={() => setExhale(exhale + 1)}><Text style={{ color: '#3498db', fontSize: 20 }}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

export default function ToolkitBreathing() {
  const router = useRouter();
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [phase, setPhase] = useState('Inhale');
  const [isRunning, setIsRunning] = useState(false);
  const size = useRef(new Animated.Value(100)).current;
  const ballX = useRef(new Animated.Value(0)).current;
  const ballY = useRef(new Animated.Value(0)).current;

  const breathingExercises = [
    {
      id: 'box',
      title: '📦 Box Breathing',
      description: 'Inhale for 4, hold for 4, exhale for 4, hold for 4 (perfect for focus)',
      pattern: [
        { label: 'Inhale', duration: 4000 },
        { label: 'Hold', duration: 4000 },
        { label: 'Exhale', duration: 4000 },
        { label: 'Hold', duration: 4000 },
      ]
    },
    {
      id: '478',
      title: '🌙 4-7-8 Breathing',
      description: 'Inhale for 4, hold for 7, exhale for 8 (great for sleep and relaxation)',
      pattern: [
        { label: 'Inhale', duration: 4000 },
        { label: 'Hold', duration: 7000 },
        { label: 'Exhale', duration: 8000 },
      ]
    },
    {
      id: 'equal',
      title: '⚖️ Palm Breathing',
      description: 'Inhale for 6, exhale for 6 (calming and balancing)',
      pattern: [
        { label: 'Inhale', duration: 6000 },
        { label: 'Exhale', duration: 6000 },
      ]
    }
  ];

  useEffect(() => {
    let isMounted = true;
    let currentPhaseIndex = 0;
    let animationTimeout: ReturnType<typeof setTimeout>;
    let currentAnimation: Animated.CompositeAnimation | null = null;

    if (isRunning && activeExercise) {
      const exercise = breathingExercises.find(ex => ex.id === activeExercise);
      if (!exercise) return;

      const animateBreathing = () => {
        if (!isMounted || !isRunning) return;

        const currentPhase = exercise.pattern[currentPhaseIndex];
        setPhase(currentPhase.label);

        // 4-7-8 breathing ball animation on perfect triangle
        if (activeExercise === '478') {
          let targetX = 0;
          let targetY = 0;

          // Set ball position based on phase for perfect triangle movement
          if (currentPhase.label === 'Inhale') {
            // Move from bottom left to top center (inhale up the left side)
            targetX = 0; // Top center of triangle
            targetY = -60; // Top of triangle
          } else if (currentPhase.label === 'Hold') {
            // Move from top to bottom right (hold down the right side)
            targetX = 60; // Bottom right corner
            targetY = 50; // Bottom level
          } else if (currentPhase.label === 'Exhale') {
            // Move from bottom right to bottom left (exhale across the bottom)
            targetX = -60; // Bottom left corner
            targetY = 50; // Bottom level
          }

          // Start ball at bottom left if this is the first animation
          if (currentPhaseIndex === 0 && currentPhase.label === 'Inhale') {
            ballX.setValue(-60);
            ballY.setValue(50);
          }

          // Stop any ongoing animation before starting a new one
          if (currentAnimation) {
            currentAnimation.stop();
          }

          // Animate both X and Y together for smooth triangle movement
          currentAnimation = Animated.parallel([
            Animated.timing(ballX, {
              toValue: targetX,
              duration: currentPhase.duration,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.ease)
            }),
            Animated.timing(ballY, {
              toValue: targetY,
              duration: currentPhase.duration,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.ease)
            })
          ]);

          currentAnimation.start(({ finished }) => {
            if (!isMounted || !isRunning) return;
            if (finished) {
              currentPhaseIndex = (currentPhaseIndex + 1) % exercise.pattern.length;
              // Clear any existing timeout
              if (animationTimeout) {
                clearTimeout(animationTimeout);
              }
              animationTimeout = setTimeout(animateBreathing, 200);
            }
          });

          return;
        }

        // Circle animations for equal breathing (box breathing uses its own components)
        if (activeExercise === 'equal') {
          // Stop any ongoing animation before starting a new one
          if (currentAnimation) {
            currentAnimation.stop();
          }

          if (currentPhase.label === 'Inhale') {
            currentAnimation = Animated.timing(size, {
              toValue: 180,
              duration: currentPhase.duration,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.ease)
            });

            currentAnimation.start(({ finished }) => {
              if (!isMounted || !isRunning) return;
              if (finished) {
                currentPhaseIndex = (currentPhaseIndex + 1) % exercise.pattern.length;
                // Clear any existing timeout
                if (animationTimeout) {
                  clearTimeout(animationTimeout);
                }
                animationTimeout = setTimeout(animateBreathing, 200);
              }
            });
          } else if (currentPhase.label === 'Exhale') {
            currentAnimation = Animated.timing(size, {
              toValue: 100,
              duration: currentPhase.duration,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.ease)
            });

            currentAnimation.start(({ finished }) => {
              if (!isMounted || !isRunning) return;
              if (finished) {
                currentPhaseIndex = (currentPhaseIndex + 1) % exercise.pattern.length;
                // Clear any existing timeout
                if (animationTimeout) {
                  clearTimeout(animationTimeout);
                }
                animationTimeout = setTimeout(animateBreathing, 200);
              }
            });
          }
        } else {
          // For box breathing, just cycle through phases without circle animation
          // Clear any existing timeout
          if (animationTimeout) {
            clearTimeout(animationTimeout);
          }
          animationTimeout = setTimeout(() => {
            if (!isMounted || !isRunning) return;
            currentPhaseIndex = (currentPhaseIndex + 1) % exercise.pattern.length;
            animateBreathing();
          }, currentPhase.duration);
        }
      };

      animateBreathing();
    }

    return () => {
      isMounted = false;
      // Stop any running animations on cleanup
      if (currentAnimation) {
        currentAnimation.stop();
      }
      // Clear any existing timeout
      if (animationTimeout) {
        clearTimeout(animationTimeout);
      }
    };
  }, [isRunning, activeExercise, size, ballX, ballY]);  const startExercise = (exerciseId: string) => {
    try {
      // Don't allow starting a new exercise if one is already running
      if (isRunning) {
        stopExercise(); // Stop the current exercise first
      }

      // Reset all animation values to initial state
      size.setValue(100);
      ballX.setValue(-60);
      ballY.setValue(40);

      // Delay starting to ensure animations are reset
      setTimeout(() => {
        setActiveExercise(exerciseId);
        setIsRunning(true);
      }, 50);
    } catch (error) {
      console.warn('Error starting breathing exercise:', error);
      setIsRunning(false);
      setActiveExercise(null);
    }
  };

  const stopExercise = () => {
    try {
      // First update state to prevent new animations from starting
      setIsRunning(false);
      setActiveExercise(null);

      // Then reset values
      setTimeout(() => {
        setPhase('Ready');
        size.setValue(100);
        ballX.setValue(-60);
        ballY.setValue(40);
      }, 50);
    } catch (error) {
      console.warn('Error stopping breathing exercise:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💨 Breathing Exercises</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>
          Deep breathing exercises help reduce stress, anxiety, and promote relaxation. Choose an exercise below to begin.
        </Text>

        {/* Breathing Animation */}
        {activeExercise && (
          <View style={styles.animationContainer}>
            {/* Enhanced Box Breathing Components when Box Breathing is active */}
            {activeExercise === 'box' && (
              <View style={styles.enhancedBoxBreathingContainer}>
                <Text style={styles.activeExerciseTitle}>Box Breathing</Text>

                {/* Box Breathing Guide */}
                <View style={styles.breathingComponentCard}>
                  <Text style={styles.componentTitle}>📦 Box Breathing Guide</Text>
                  <BoxBreathingGuide />
                </View>

                {/* Breath Pacer with Audio */}
                <View style={styles.breathingComponentCard}>
                  <Text style={styles.componentTitle}>🎵 Audio-Enhanced Breathing</Text>
                  <BreathPacerWithAudio />
                </View>
              </View>
            )}

            {/* Perfect Triangle visualization for 4-7-8 Breathing */}
            {activeExercise === '478' && (
              <View style={styles.triangleContainer}>
                <View style={styles.perfectTriangle}>
                  {/* Perfect triangle using border styles */}
                  <View style={styles.triangleShape} />

                  {/* Animated ball moving around the triangle */}
                  <Animated.View style={[
                    styles.animatedBall,
                    {
                      transform: [
                        { translateX: ballX },
                        { translateY: ballY }
                      ]
                    }
                  ]} />

                  {/* Phase labels at triangle vertices */}
                  <Text style={[styles.phaseLabel, styles.topLabel]}>Inhale (4s)</Text>
                  <Text style={[styles.phaseLabel, styles.rightLabel]}>Hold (7s)</Text>
                  <Text style={[styles.phaseLabel, styles.leftLabel]}>Exhale (8s)</Text>
                </View>

                {/* Current phase display */}
                <View style={styles.phaseDisplayContainer}>
                  <Text style={styles.currentPhaseText}>{phase}</Text>
                  <Text style={styles.triangleInstructions}>Follow the breathing pattern around the triangle</Text>
                </View>
              </View>
            )}

            {/* Regular circle for Equal Breathing */}
            {activeExercise === 'equal' && (
              <Animated.View style={[
                styles.breathingCircle,
                {
                  width: size,
                  height: size,
                  borderRadius: Animated.divide(size, 2)
                }
              ]}>
                <Text style={styles.phaseText}>{phase}</Text>
              </Animated.View>
            )}

            <TouchableOpacity onPress={stopExercise} style={styles.stopButton}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Exercise Cards */}
        {breathingExercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <Text style={styles.exerciseTitle}>{exercise.title}</Text>
            <Text style={styles.exerciseDescription}>{exercise.description}</Text>

            <TouchableOpacity
              onPress={() => startExercise(exercise.id)}
              style={[
                styles.startButton,
                activeExercise === exercise.id && styles.activeButton
              ]}
              disabled={isRunning}
            >
              <Text style={[
                styles.startButtonText,
                activeExercise === exercise.id && styles.activeButtonText
              ]}>
                {activeExercise === exercise.id ? 'Active' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Breathing Tips</Text>
          <Text style={styles.tipText}>• Find a comfortable, quiet place</Text>
          <Text style={styles.tipText}>• Breathe through your nose when possible</Text>
          <Text style={styles.tipText}>• Focus on your breath, not distractions</Text>
          <Text style={styles.tipText}>• Practice regularly for best results</Text>
          <Text style={styles.tipText}>• Stop if you feel dizzy or uncomfortable</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#3498db',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 15,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 80,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  description: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    fontStyle: 'italic',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  animationContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingVertical: 30,
  },
  breathingCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  phaseText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3498db',
  },
  stopButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  exerciseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 15,
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#27ae60',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeButtonText: {
    color: 'white',
  },
  tipsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
    lineHeight: 20,
  },
  lineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  animatedBall: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#FFA500',
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    zIndex: 10,
  },
  breathingLine: {
    width: 200,
    height: 160,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalLine: {
    position: 'absolute',
    width: 4,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 2,
  },
  phaseLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    textAlign: 'center',
  },
  topPhaseLabel: {
    top: -10,
    left: 20,
  },
  middlePhaseLabel: {
    top: 50,
    left: 20,
  },
  bottomPhaseLabel: {
    bottom: -10,
    left: 20,
  },
  phaseDisplayContainer: {
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  currentPhaseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  enhancedBreathingSection: {
    marginVertical: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  breathingComponentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  componentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  enhancedBoxBreathingContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  activeExerciseTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Perfect Triangle styles for 4-7-8 breathing
  triangleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  perfectTriangle: {
    width: 220,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triangleShape: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 80,
    borderRightWidth: 80,
    borderBottomWidth: 140,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.9)',
    borderStyle: 'solid',
    top: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  topLabel: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{ translateX: -50 }],
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  rightLabel: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  leftLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  triangleInstructions: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

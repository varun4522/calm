import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MoodPlaylists() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration: string }>();
  const studentRegNo = params.registration;

  const playlists = [
    {
      id: 'happy',
      title: 'Happy Music',
      description: 'Upbeat songs to boost your mood and energy',
      color: '#FFD700',
      icon: '😊',
      url: 'https://open.spotify.com/playlist/6JBDXA9ZwgtUkDqUxYXqLG?si=pKA8acIHSgmEqXMiCGkK_Q'
    },
    {
      id: 'calming',
      title: 'Calming Music',
      description: 'Peaceful melodies for relaxation and mindfulness',
      color: '#87CEEB',
      icon: '🧘',
      url: 'https://open.spotify.com/playlist/68FXxPnSiuIvoBPf7PWDPK?si=MH8qZ3fDT6CgDT-bPd390Q'
    },
    {
      id: 'morning',
      title: 'Morning Playlists',
      description: 'Fresh tunes to start your day with positivity',
      color: '#FFA500',
      icon: '🌅',
      url: 'https://open.spotify.com/playlist/2nMnQYNZcWdiWtRiij9hq4?si=nCyGyLmOTZios868K5oHJg'
    },
    {
      id: 'sleep',
      title: 'Sleep Music',
      description: 'Soothing sounds for better sleep and dreams',
      color: '#4B0082',
      icon: '😴',
      url: 'https://open.spotify.com/playlist/2K0YlYKMWw9i5114pkJ2B1?si=ylFex2TWSES4kbLCWg1AnA'
    },
    {
      id: 'angry',
      title: 'When I Feel Angry',
      description: 'Music to help process and release anger',
      color: '#DC143C',
      icon: '😤',
      url: 'https://open.spotify.com/playlist/6r2A8KNMlCF1BaRZsvDej5?si=wiGDGOu4QxykjW7vMOnlUQ'
    },
    {
      id: 'stress',
      title: 'Stress Relief Music',
      description: 'Therapeutic sounds to melt away stress',
      color: '#32CD32',
      icon: '💆',
      url: 'https://open.spotify.com/playlist/3EXiSSiEH5Zld8N6qH94ez?si=1JQyxsqpQ-q5Tv-KLeCBXQ'
    }
  ];

  const openPlaylist = async (playlist: typeof playlists[0]) => {
    try {
      console.log('Opening playlist:', playlist.title, 'URL:', playlist.url);

      // Check if the URL can be opened
      const canOpen = await Linking.canOpenURL(playlist.url);

      if (canOpen) {
        await Linking.openURL(playlist.url);
      } else {
        // If direct opening fails, show options
        Alert.alert(
          'Open Playlist',
          `Would you like to open "${playlist.title}" in Spotify?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open in Spotify',
              onPress: async () => {
                try {
                  await Linking.openURL(playlist.url);
                } catch (secondError) {
                  // If still fails, try to install Spotify
                  Alert.alert(
                    'Install Spotify',
                    'Spotify might not be installed. Would you like to install it?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Install Spotify',
                        onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.spotify.music')
                      }
                    ]
                  );
                }
              }
            },
            {
              text: 'Open in Browser',
              onPress: () => {
                // Convert Spotify app link to web link
                const webUrl = playlist.url.replace('spotify:', 'https://open.spotify.com/');
                Linking.openURL(webUrl);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error opening playlist:', error);
      Alert.alert('Error', 'Unable to open the playlist. Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
  <Text style={styles.headerTitle}>Mood Playlists</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>
          Choose a playlist that matches your current mood or what you need right now.
          Each playlist is carefully curated to help you feel better! 🎶
        </Text>

        {/* Playlist Grid */}
        <View style={styles.playlistGrid}>
          {playlists.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={[styles.playlistCard, { backgroundColor: playlist.color }]}
              onPress={() => openPlaylist(playlist)}
              activeOpacity={0.8}
            >
              <View style={styles.playlistIconContainer}>
                <Text style={styles.playlistIcon}>{playlist.icon}</Text>
              </View>

              <View style={styles.playlistContent}>
                <Text style={styles.playlistTitle}>{playlist.title}</Text>
                <Text style={styles.playlistDescription}>{playlist.description}</Text>
              </View>

              <View style={styles.spotifyIndicator}>
                <Text style={styles.spotifyText}>🎵 Spotify</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 How to Use</Text>
          <Text style={styles.infoText}>• Tap any playlist card to open it in Spotify</Text>
          <Text style={styles.infoText}>• Make sure you have Spotify installed on your device</Text>
          <Text style={styles.infoText}>• Create a free Spotify account if you don't have one</Text>
          <Text style={styles.infoText}>• Follow the playlists to access them anytime</Text>
          <Text style={styles.infoText}>• Use headphones for the best experience</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#8e44ad',
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 15,
    fontStyle: 'italic',
  },
  playlistGrid: {
    marginBottom: 30,
  },
  playlistCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 100,
  },
  playlistIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  playlistIcon: {
    fontSize: 28,
  },
  playlistContent: {
    flex: 1,
    paddingRight: 10,
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  playlistDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  spotifyIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  spotifyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  moodGuideCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  moodGuideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  moodMappingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodMappingItem: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 68, 173, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  moodLabel: {
    fontSize: 12,
    color: '#8e44ad',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

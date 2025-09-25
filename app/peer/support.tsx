import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SupportPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration: string }>();
  const studentRegNo = params.registration;

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={undefined}
        style={styles.backgroundImage}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Shelf</Text>
      </View>

      {/* Support Content */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>Choose your colorful support tool:</Text>

        {/* Support Tools Grid */}
        <View style={styles.supportGrid}>
          <TouchableOpacity
            style={[styles.supportButton, { backgroundColor: '#2ecc71' }]}
            onPress={() => Linking.openURL('https://sgtuniversity.knimbus.com/user#/')}
          >
            <Text style={styles.supportButtonIcon}>📚</Text>
            <Text style={styles.supportButtonText}>E-Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.supportButton, { backgroundColor: '#e74c3c' }]}
            onPress={() => router.push('./emergency')}
          >
            <Text style={styles.supportButtonIcon}>🆘</Text>
            <Text style={styles.supportButtonText}>Crisis Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.supportButton, { backgroundColor: '#f39c12' }]}
            onPress={() => router.push('./learning')}
          >
            <Text style={styles.supportButtonIcon}>📖</Text>
            <Text style={styles.supportButtonText}>Learning Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.supportButton, { backgroundColor: '#8e44ad' }]}
            onPress={() => router.push('./mood-playlists')}
          >
            <Text style={styles.supportButtonIcon}>🎵</Text>
            <Text style={styles.supportButtonText}>Mood Playlists</Text>
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 220,
    resizeMode: 'cover',
    opacity: 0.25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    margin: 10,
    marginTop: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 15,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'center',
    marginRight: 60,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    color: '#2c3e50',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    color: '#7f8c8d',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  supportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  supportButton: {
    width: '48%',
    height: 140,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  supportButtonIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  supportButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 22,
  },
});

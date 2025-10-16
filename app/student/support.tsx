import { useRouter } from 'expo-router';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/Colors';

export default function SupportPage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
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

        {/* Support Tools Grid - 2x2 Layout */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, paddingHorizontal: 10 }}>
          <TouchableOpacity style={styles.supportButton} onPress={() => Linking.openURL('https://sgtuniversity.knimbus.com/user#/')}>
            <Image source={require('@/assets/images/elibrary.png')} style={styles.supportButtonIcon} resizeMode="contain" />
            <Text style={styles.supportButtonText}>E Library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportButton} onPress={() => router.push('./emergency')}>
            <Image source={require('@/assets/images/sos.png')} style={styles.supportButtonIcon} resizeMode="contain" />
            <Text style={styles.supportButtonText}>SOS</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, paddingHorizontal: 10 }}>
          <TouchableOpacity style={styles.supportButton} onPress={() => router.push('./learning')}>
            <Image source={require('@/assets/images/learning support.png')} style={styles.supportButtonIcon} resizeMode="contain" />
            <Text style={styles.supportButtonText}>Learning Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportButton} onPress={() => router.push('./mood-playlists')}>
            <Image source={require('@/assets/images/mood playlist.png')} style={styles.supportButtonIcon} resizeMode="contain" />
            <Text style={styles.supportButtonText}>Mood Playlist</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    margin: 10,
    marginTop: 30,
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 15,
    marginRight: 15,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
    marginRight: 60,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  supportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  supportButton: {
    width: '35%',
    height: 120,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    marginHorizontal: 10,
    marginVertical: 8,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: 10,
  },
  supportButtonIcon: {
    width: '60%',
    height: '60%',
    maxWidth: 100,
    maxHeight: 100,
    marginBottom: 8,
  },
  supportButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
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

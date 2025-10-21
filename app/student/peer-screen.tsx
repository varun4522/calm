import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/Colors";
import { useAuth } from "@/providers/AuthProvider";
import { useProfile } from "@/api/Profile";

const PeerScreen = () => {
    const router = useRouter();
    const {session } = useAuth();
    const {data: profile} = useProfile(session?.user.id);
    
    const handleSchedule = () => {
        router.push(`./peer-schedule?registration=${profile?.registration_number}`);
    };

    const handleMyClients = () => {
        router.push(`./peer-clients`);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Welcome, {profile?.name}! 👋</Text>
                <Text style={styles.subText}>Peer Listener Dashboard</Text>
            </View>

            {/* Buttons Container */}
            <View style={styles.buttonContainer}>
                {/* Schedule Button */}
                <TouchableOpacity 
                    style={styles.button}
                    onPress={handleSchedule}
                    activeOpacity={0.8}
                >
                    <View style={styles.iconContainer}>
                        <Image 
                            source={require('@/assets/images/mood calender.png')} 
                            style={styles.icon} 
                        />
                    </View>
                    <Text style={styles.buttonTitle}>Schedule</Text>
                    <Text style={styles.buttonDescription}>
                        Manage your availability and appointments
                    </Text>
                </TouchableOpacity>

                {/* My Clients Button */}
                <TouchableOpacity 
                    style={styles.button}
                    onPress={handleMyClients}
                    activeOpacity={0.8}
                >
                    <View style={styles.iconContainer}>
                        <Image 
                            source={require('../../assets/images/community.png')} 
                            style={styles.icon} 
                        />
                    </View>
                    <Text style={styles.buttonTitle}>My Clients</Text>
                    <Text style={styles.buttonDescription}>
                        View and manage your client sessions
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
                <Text style={styles.infoText}>
                    As a peer listener, you can help fellow students by providing support and guidance.
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 5,
    },
    subText: {
        fontSize: 16,
        color: Colors.textSecondary,
    },
    buttonContainer: {
        flex: 1,
        justifyContent: 'center',
        gap: 20,
    },
    button: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    icon: {
        width: 50,
        height: 50,
        resizeMode: 'contain',
    },
    buttonTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 8,
    },
    buttonDescription: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    infoSection: {
        backgroundColor: Colors.accentLight,
        borderRadius: 15,
        padding: 15,
        marginBottom: 20,
    },
    infoText: {
        fontSize: 13,
        color: Colors.text,
        textAlign: 'center',
        lineHeight: 18,
    },
});

export default PeerScreen;
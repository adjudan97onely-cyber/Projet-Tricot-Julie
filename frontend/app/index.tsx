import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/messages/count`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.log('Error fetching unread count');
    }
  };

  const features = [
    {
      icon: 'chatbubbles-outline' as const,
      title: 'Assistant IA',
      description: 'Conseils et analyse de projets',
      route: '/chat',
      color: '#D4AF37',
    },
    {
      icon: 'folder-outline' as const,
      title: 'Mes Projets',
      description: 'Projets en cours',
      route: '/projects',
      color: '#C9A961',
    },
    {
      icon: 'images-outline' as const,
      title: 'Ma Galerie',
      description: 'Portfolio public',
      route: '/gallery',
      color: '#E5C76B',
    },
    {
      icon: 'mail-outline' as const,
      title: 'Messages',
      description: 'Demandes clients',
      route: '/messages',
      color: '#B8963E',
      badge: unreadCount,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="flower-outline" size={40} color="#D4AF37" />
            </View>
          </View>
          <Text style={styles.brandName}>Julie</Text>
          <Text style={styles.brandTagline}>Créations</Text>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Ionicons name="diamond-outline" size={16} color="#D4AF37" />
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.subtitle}>Tricot • Crochet • Laine</Text>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Bienvenue, Julie !</Text>
          <Text style={styles.welcomeText}>
            Gérez vos projets, partagez vos créations et communiquez avec vos clients.
          </Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={styles.featureCard}
              onPress={() => router.push(feature.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIconContainer, { borderColor: feature.color }]}>
                <Ionicons name={feature.icon} size={28} color={feature.color} />
                {feature.badge && feature.badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{feature.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
              <View style={styles.featureArrow}>
                <Ionicons name="arrow-forward" size={18} color="#D4AF37" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Astuce du jour</Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={24} color="#D4AF37" />
            <Text style={styles.tipText}>
              Ajoutez vos créations terminées à la Galerie pour que vos clients puissent les voir et commander !
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  brandName: {
    fontSize: 42,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  brandTagline: {
    fontSize: 18,
    fontWeight: '300',
    color: '#D4AF37',
    letterSpacing: 12,
    marginTop: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  dividerLine: {
    width: 60,
    height: 1,
    backgroundColor: '#D4AF37',
    marginHorizontal: 12,
  },
  subtitle: {
    fontSize: 12,
    color: '#888888',
    letterSpacing: 4,
  },
  welcomeCard: {
    marginHorizontal: 20,
    padding: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 22,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
  },
  featureCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    marginBottom: 12,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 11,
    color: '#888888',
    lineHeight: 16,
  },
  featureArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  tipsSection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderLeftWidth: 3,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 20,
    marginLeft: 12,
  },
});

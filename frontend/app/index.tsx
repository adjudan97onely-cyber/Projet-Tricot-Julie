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
    const interval = setInterval(fetchUnreadCount, 30000);
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

  const mainFeatures = [
    {
      icon: 'book-outline' as const,
      title: 'Patrons',
      description: 'Recettes complètes',
      route: '/patterns',
      color: '#E5C76B',
    },
    {
      icon: 'school-outline' as const,
      title: 'Tutoriels',
      description: 'Bases & techniques',
      route: '/tutorials',
      color: '#D4AF37',
    },
    {
      icon: 'library-outline' as const,
      title: 'Lexique',
      description: 'Termes & définitions',
      route: '/lexique',
      color: '#C9A961',
    },
    {
      icon: 'resize-outline' as const,
      title: 'Tailles',
      description: 'Guide des tailles',
      route: '/size-guide',
      color: '#B8963E',
    },
  ];

  const toolFeatures = [
    {
      icon: 'chatbubbles-outline' as const,
      title: 'Assistant IA',
      route: '/chat',
      color: '#D4AF37',
    },
    {
      icon: 'folder-outline' as const,
      title: 'Mes Projets',
      route: '/projects',
      color: '#C9A961',
    },
    {
      icon: 'images-outline' as const,
      title: 'Ma Galerie',
      route: '/gallery',
      color: '#B8963E',
    },
    {
      icon: 'mail-outline' as const,
      title: 'Messages',
      route: '/messages',
      color: '#A8862E',
      badge: unreadCount,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="flower-outline" size={36} color="#D4AF37" />
          </View>
          <Text style={styles.brandName}>Julie</Text>
          <Text style={styles.brandTagline}>Créations</Text>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Ionicons name="diamond-outline" size={14} color="#D4AF37" />
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.subtitle}>Tricot • Crochet • Laine</Text>
        </View>

        {/* Section Apprendre */}
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles" size={18} color="#D4AF37" />
          <Text style={styles.sectionTitle}>Apprendre & Créer</Text>
        </View>

        <View style={styles.gridContainer}>
          {mainFeatures.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={styles.featureCard}
              onPress={() => router.push(feature.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIcon, { borderColor: feature.color }]}>
                <Ionicons name={feature.icon} size={26} color={feature.color} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section Outils */}
        <View style={styles.sectionHeader}>
          <Ionicons name="construct-outline" size={18} color="#D4AF37" />
          <Text style={styles.sectionTitle}>Mes Outils</Text>
        </View>

        <View style={styles.toolsRow}>
          {toolFeatures.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={styles.toolCard}
              onPress={() => router.push(feature.route as any)}
              activeOpacity={0.8}
            >
              <View style={styles.toolIconContainer}>
                <Ionicons name={feature.icon} size={24} color={feature.color} />
                {feature.badge && feature.badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{feature.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.toolTitle}>{feature.title}</Text>
            </TouchableOpacity>
          ))}
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
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 6,
  },
  brandTagline: {
    fontSize: 16,
    fontWeight: '300',
    color: '#D4AF37',
    letterSpacing: 10,
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  dividerLine: {
    width: 50,
    height: 1,
    backgroundColor: '#D4AF37',
    marginHorizontal: 10,
  },
  subtitle: {
    fontSize: 11,
    color: '#888888',
    letterSpacing: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  featureCard: {
    width: (width - 44) / 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: '#888888',
  },
  toolsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  toolCard: {
    width: (width - 56) / 4,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  toolIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  toolTitle: {
    fontSize: 10,
    color: '#CCCCCC',
    textAlign: 'center',
  },
});

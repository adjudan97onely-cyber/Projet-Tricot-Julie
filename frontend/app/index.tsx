import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomTab from './components/BottomTab';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Animation for sparkle effect
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Sparkle animation loop
    const animateSparkle = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };
    animateSparkle();
    
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
      title: 'Julie IA',
      route: '/chat',
      color: '#D4AF37',
    },
    {
      icon: 'construct-outline' as const,
      title: 'Outils',
      route: '/tools',
      color: '#C9A961',
    },
    {
      icon: 'folder-outline' as const,
      title: 'Projets',
      route: '/projects',
      color: '#B8963E',
    },
    {
      icon: 'images-outline' as const,
      title: 'Galerie',
      route: '/gallery',
      color: '#A8862E',
    },
    {
      icon: 'mail-outline' as const,
      title: 'Messages',
      route: '/messages',
      color: '#987235',
      badge: unreadCount,
    },
  ];

  // Animated background color
  const animatedBgColor = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['rgba(255, 215, 0, 0.05)', 'rgba(255, 223, 0, 0.15)', 'rgba(255, 215, 0, 0.05)'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.sparkleBackground, { backgroundColor: animatedBgColor }]} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          {/* Porcelain flower */}
          <View style={styles.logoCircle}>
            <Text style={styles.flowerEmoji}>🌸</Text>
          </View>
          {/* Brand name with dove */}
          <View style={styles.brandNameRow}>
            <Text style={styles.brandName}>BUI-THI DAM</Text>
            <Text style={styles.doveEmoji}>🕊️</Text>
          </View>
          <Text style={styles.brandTagline}>Créations</Text>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.sparkleEmoji}>✨</Text>
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
      <BottomTab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  sparkleBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFB6C1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 182, 193, 0.15)',
    marginBottom: 12,
  },
  flowerEmoji: {
    fontSize: 42,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  doveEmoji: {
    fontSize: 24,
  },
  sparkleEmoji: {
    fontSize: 14,
    marginHorizontal: 8,
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
    width: (width - 68) / 5,
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

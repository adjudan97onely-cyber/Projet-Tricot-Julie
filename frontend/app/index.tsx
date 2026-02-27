import React from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();

  const features = [
    {
      icon: 'chatbubbles-outline' as const,
      title: 'Assistant IA',
      description: 'Conseils personnalisés et analyse de projets',
      route: '/chat',
      color: '#D4AF37',
    },
    {
      icon: 'folder-outline' as const,
      title: 'Mes Projets',
      description: 'Suivez vos créations en cours',
      route: '/projects',
      color: '#C9A961',
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
            Votre assistant personnel pour tous vos projets de tricot et crochet.
            Photographiez votre travail pour des conseils personnalisés.
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
                <Ionicons name={feature.icon} size={32} color={feature.color} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
              <View style={styles.featureArrow}>
                <Ionicons name="arrow-forward" size={20} color="#D4AF37" />
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
              Prenez une photo de votre projet en cours et demandez à l'assistant
              d'analyser votre travail pour des conseils d'amélioration !
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
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 18,
  },
  featureArrow: {
    position: 'absolute',
    top: 20,
    right: 20,
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

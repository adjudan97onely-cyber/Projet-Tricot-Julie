import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Tutorial {
  id: string;
  title: string;
  category: string;
  technique: string;
  difficulty: string;
  description: string;
  steps: string[];
  tips: string[];
  video_url: string;
}

export default function TutorialDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) fetchTutorial();
  }, [id]);

  const fetchTutorial = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tutorials/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTutorial(data);
      }
    } catch (error) {
      console.error('Error fetching tutorial:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !tutorial) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{tutorial.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Title & Description */}
        <View style={styles.titleSection}>
          <View style={styles.badgesRow}>
            <View style={styles.techniqueBadge}>
              <Ionicons
                name={tutorial.technique === 'crochet' ? 'git-branch-outline' : 'color-wand-outline'}
                size={14}
                color="#D4AF37"
              />
              <Text style={styles.techniqueText}>
                {tutorial.technique === 'crochet' ? 'Crochet' : 'Tricot'}
              </Text>
            </View>
            <View style={[
              styles.difficultyBadge,
              { backgroundColor: tutorial.difficulty === 'débutant' ? '#4CAF50' : '#FF9800' }
            ]}>
              <Text style={styles.difficultyText}>{tutorial.difficulty}</Text>
            </View>
          </View>
          <Text style={styles.title}>{tutorial.title}</Text>
          <Text style={styles.description}>{tutorial.description}</Text>
        </View>

        {/* Video Button */}
        <TouchableOpacity
          style={styles.videoButton}
          onPress={() => Linking.openURL(tutorial.video_url)}
        >
          <Ionicons name="logo-youtube" size={24} color="#FF0000" />
          <Text style={styles.videoButtonText}>Voir les tutoriels vidéo sur YouTube</Text>
          <Ionicons name="open-outline" size={18} color="#888" />
        </TouchableOpacity>

        {/* Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Étapes</Text>
          {tutorial.steps.map((step, index) => (
            <View key={index} style={styles.stepCard}>
              {step ? (
                <>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </>
              ) : null}
            </View>
          )).filter((_, i) => tutorial.steps[i])}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Astuces</Text>
          {tutorial.tips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <Ionicons name="bulb" size={18} color="#D4AF37" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Ask AI */}
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => router.push({
            pathname: '/chat',
            params: { question: `J'ai besoin d'aide pour comprendre "${tutorial.title}". Peux-tu m'expliquer ?` }
          })}
        >
          <Ionicons name="sparkles" size={22} color="#0A0A0A" />
          <Text style={styles.aiButtonText}>Demander à l'assistant IA</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', marginHorizontal: 12 },
  headerRight: { width: 40 },
  content: { flex: 1 },
  titleSection: { padding: 20 },
  badgesRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  techniqueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  techniqueText: { fontSize: 13, color: '#D4AF37' },
  difficultyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  difficultyText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  description: { fontSize: 15, color: '#AAAAAA', lineHeight: 24 },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 12,
  },
  videoButtonText: { flex: 1, fontSize: 14, color: '#FFFFFF' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#D4AF37', marginBottom: 14 },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: { fontSize: 14, fontWeight: '700', color: '#0A0A0A' },
  stepText: { flex: 1, fontSize: 14, color: '#CCCCCC', lineHeight: 22 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D4AF37',
    gap: 12,
  },
  tipText: { flex: 1, fontSize: 14, color: '#CCCCCC', lineHeight: 22 },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  aiButtonText: { fontSize: 16, fontWeight: '600', color: '#0A0A0A' },
});

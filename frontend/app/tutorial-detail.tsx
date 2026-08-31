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
import { colors, spacing, radii } from './theme';
import Header from './components/Header';
import Badge from './components/Badge';
import Card from './components/Card';
import BottomTab from './components/BottomTab';

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
        <Header title="Tutoriel" back />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blushDeep} />
        </View>
      </SafeAreaView>
    );
  }

  const getDifficultyTone = (difficulty: string): 'sage' | 'gold' => {
    return difficulty === 'débutant' ? 'sage' : 'gold';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={tutorial.title}
        back
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Title & Badges */}
        <View style={styles.titleSection}>
          <View style={styles.badgesRow}>
            <Badge
              label={tutorial.technique === 'crochet' ? 'Crochet' : 'Tricot'}
              tone="rose"
            />
            <Badge
              label={tutorial.difficulty}
              tone={getDifficultyTone(tutorial.difficulty)}
            />
          </View>
          <Text style={styles.title}>{tutorial.title}</Text>
          <Text style={styles.description}>{tutorial.description}</Text>
        </View>

        {/* Video Button */}
        <TouchableOpacity
          style={styles.videoButton}
          onPress={() => Linking.openURL(tutorial.video_url)}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-youtube" size={24} color="#FF0000" />
          <Text style={styles.videoButtonText}>Voir les tutoriels vidéo sur YouTube</Text>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Étapes</Text>
          {tutorial.steps
            .filter((step) => step && step.trim().length > 0)
            .map((step, index) => (
              <Card key={index} style={styles.stepCard}>
                <View style={styles.stepInner}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              </Card>
            ))}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Astuces</Text>
          {tutorial.tips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <Ionicons name="bulb" size={18} color={colors.gold} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Ask AI */}
        <TouchableOpacity
          style={styles.aiButton}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: '/chat',
              params: {
                question: `J'ai besoin d'aide pour comprendre "${tutorial.title}". Peux-tu m'expliquer ?`,
              },
            })
          }
        >
          <Ionicons name="sparkles" size={22} color={colors.white} />
          <Text style={styles.aiButtonText}>Demander à l'assistant IA</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  titleSection: {
    padding: spacing.xl,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 24,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
  },
  videoButtonText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.blushDeep,
    marginBottom: spacing.md,
  },
  stepCard: {
    marginBottom: spacing.sm,
  },
  stepInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radii.round,
    backgroundColor: colors.blushDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.goldSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    gap: spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blushDeep,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    gap: 10,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});

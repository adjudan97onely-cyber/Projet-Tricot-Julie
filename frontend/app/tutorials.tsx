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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadows } from './theme';
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

const CATEGORIES = [
  { value: 'all', label: 'Tout', icon: 'grid-outline' as const },
  { value: 'base', label: 'Bases', icon: 'book-outline' as const },
  { value: 'technique', label: 'Techniques', icon: 'construct-outline' as const },
];

const TECHNIQUES = [
  { value: 'all', label: 'Tout' },
  { value: 'aiguilles', label: 'Aiguilles' },
  { value: 'crochet', label: 'Crochet' },
];

export default function TutorialsScreen() {
  const router = useRouter();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTechnique, setSelectedTechnique] = useState('all');

  const fetchTutorials = async () => {
    try {
      let url = `${BACKEND_URL}/api/tutorials`;
      const params: string[] = [];
      if (selectedCategory !== 'all') params.push(`category=${selectedCategory}`);
      if (selectedTechnique !== 'all') params.push(`technique=${selectedTechnique}`);
      if (params.length > 0) url += '?' + params.join('&');

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTutorials(data);
      }
    } catch (error) {
      console.error('Error fetching tutorials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchTutorials();
  }, [selectedCategory, selectedTechnique]);

  const openVideo = (url: string) => {
    Linking.openURL(url);
  };

  const getDifficultyTone = (difficulty: string): 'sage' | 'gold' => {
    return difficulty === 'débutant' ? 'sage' : 'gold';
  };

  const renderTutorial = (tutorial: Tutorial) => (
    <TouchableOpacity
      key={tutorial.id}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/tutorial-detail', params: { id: tutorial.id } })}
      style={styles.cardWrapper}
    >
      <Card>
        <View style={styles.tutorialHeader}>
          <View style={styles.tutorialBadges}>
            <Badge
              label={tutorial.technique === 'crochet' ? 'Crochet' : 'Tricot'}
              tone="rose"
            />
            <Badge
              label={tutorial.difficulty}
              tone={getDifficultyTone(tutorial.difficulty)}
            />
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
        <Text style={styles.tutorialDesc} numberOfLines={2}>
          {tutorial.description}
        </Text>

        <View style={styles.tutorialFooter}>
          <TouchableOpacity
            style={styles.videoButton}
            onPress={() => openVideo(tutorial.video_url)}
          >
            <Ionicons name="logo-youtube" size={18} color="#FF0000" />
            <Text style={styles.videoButtonText}>Voir vidéo</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Tutoriels"
        subtitle="Bases & Techniques"
        back
      />

      {/* Technique Filter */}
      <View style={styles.techniqueFilterRow}>
        {TECHNIQUES.map((tech) => (
          <TouchableOpacity
            key={tech.value}
            style={[
              styles.techniqueFilterButton,
              selectedTechnique === tech.value && styles.techniqueFilterActive,
            ]}
            onPress={() => setSelectedTechnique(tech.value)}
          >
            <Text
              style={[
                styles.techniqueFilterText,
                selectedTechnique === tech.value && styles.techniqueFilterTextActive,
              ]}
            >
              {tech.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        <View style={styles.categoryContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryButton,
                selectedCategory === cat.value && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Ionicons
                name={cat.icon}
                size={16}
                color={selectedCategory === cat.value ? colors.white : colors.blushDeep}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat.value && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Tutorials List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.blushDeep} />
          </View>
        ) : tutorials.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={48} color={colors.line} />
            <Text style={styles.emptyText}>Aucun tutoriel trouvé</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {tutorials.length} tutoriel{tutorials.length > 1 ? 's' : ''}
            </Text>
            {tutorials.map(renderTutorial)}
          </>
        )}
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
  techniqueFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  techniqueFilterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  techniqueFilterActive: {
    backgroundColor: colors.blushDeep,
    borderColor: colors.blushDeep,
  },
  techniqueFilterText: {
    fontSize: 14,
    color: colors.blushDeep,
    fontWeight: '600',
  },
  techniqueFilterTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  categoryScroll: {
    maxHeight: 52,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: colors.blushDeep,
    borderColor: colors.blushDeep,
  },
  categoryText: {
    fontSize: 13,
    color: colors.blushDeep,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  resultsCount: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  cardWrapper: {
    marginBottom: spacing.md,
  },
  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  tutorialBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  tutorialTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  tutorialDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  tutorialFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoButtonText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
});

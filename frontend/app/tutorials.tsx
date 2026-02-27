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
  { value: 'all', label: 'Tout', icon: 'grid-outline' },
  { value: 'base', label: 'Bases', icon: 'book-outline' },
  { value: 'technique', label: 'Techniques', icon: 'construct-outline' },
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
      const params = [];
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

  const renderTutorial = (tutorial: Tutorial) => (
    <TouchableOpacity
      key={tutorial.id}
      style={styles.tutorialCard}
      onPress={() => router.push({ pathname: '/tutorial-detail', params: { id: tutorial.id } })}
      activeOpacity={0.8}
    >
      <View style={styles.tutorialHeader}>
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
      
      <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
      <Text style={styles.tutorialDesc} numberOfLines={2}>{tutorial.description}</Text>
      
      <View style={styles.tutorialFooter}>
        <TouchableOpacity
          style={styles.videoButton}
          onPress={() => openVideo(tutorial.video_url)}
        >
          <Ionicons name="logo-youtube" size={18} color="#FF0000" />
          <Text style={styles.videoButtonText}>Voir vidéo</Text>
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color="#D4AF37" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tutoriels</Text>
          <Text style={styles.headerSubtitle}>Bases & Techniques</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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
                name={cat.icon as any}
                size={16}
                color={selectedCategory === cat.value ? '#0A0A0A' : '#D4AF37'}
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
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        ) : tutorials.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={48} color="#333" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
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
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 11, color: '#D4AF37', marginTop: 2 },
  headerRight: { width: 40 },
  techniqueFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  techniqueFilterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  techniqueFilterActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  techniqueFilterText: { fontSize: 14, color: '#D4AF37', fontWeight: '500' },
  techniqueFilterTextActive: { color: '#0A0A0A', fontWeight: '600' },
  categoryScroll: { maxHeight: 50 },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  categoryText: { fontSize: 13, color: '#D4AF37' },
  categoryTextActive: { color: '#0A0A0A', fontWeight: '600' },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#888', marginTop: 12 },
  resultsCount: { fontSize: 13, color: '#888', marginBottom: 12 },
  tutorialCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  techniqueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  techniqueText: { fontSize: 12, color: '#D4AF37' },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  tutorialTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  tutorialDesc: { fontSize: 13, color: '#AAAAAA', lineHeight: 20 },
  tutorialFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoButtonText: { fontSize: 13, color: '#FFFFFF' },
});

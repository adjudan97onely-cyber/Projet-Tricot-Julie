import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface Pattern {
  id: string;
  name: string;
  category: string;
  technique?: string;
  difficulty: string;
  estimated_time: string;
  description: string;
  image_url: string;
}

const TECHNIQUES = [
  { value: 'all', label: 'Tout' },
  { value: 'aiguilles', label: 'Aiguilles', icon: 'color-wand-outline' },
  { value: 'crochet', label: 'Crochet', icon: 'git-branch-outline' },
];

const CATEGORIES = [
  { value: 'all', label: 'Tous', icon: 'grid-outline' },
  { value: 'bonnet', label: 'Bonnets', icon: 'happy-outline' },
  { value: 'echarpe', label: 'Écharpes', icon: 'resize-outline' },
  { value: 'pull', label: 'Vêtements', icon: 'shirt-outline' },
  { value: 'robe', label: 'Robes', icon: 'woman-outline' },
  { value: 'top', label: 'Tops', icon: 'sunny-outline' },
  { value: 'maillot', label: 'Maillots', icon: 'water-outline' },
  { value: 'couverture', label: 'Couvertures', icon: 'bed-outline' },
  { value: 'chaussettes', label: 'Chaussettes', icon: 'footsteps-outline' },
  { value: 'bebe', label: 'Bébé', icon: 'heart-outline' },
  { value: 'accessoire', label: 'Accessoires', icon: 'diamond-outline' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  'débutant': '#4CAF50',
  'intermédiaire': '#FF9800',
  'avancé': '#F44336',
};

const CATEGORY_ICONS: Record<string, string> = {
  'bonnet': 'happy-outline',
  'echarpe': 'resize-outline',
  'pull': 'shirt-outline',
  'couverture': 'bed-outline',
  'chaussettes': 'footsteps-outline',
  'accessoire': 'diamond-outline',
};

export default function PatternsScreen() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTechnique, setSelectedTechnique] = useState('all');

  const fetchPatterns = async () => {
    try {
      let url = `${BACKEND_URL}/api/patterns`;
      const params = [];
      if (selectedCategory !== 'all') params.push(`category=${selectedCategory}`);
      if (selectedTechnique !== 'all') params.push(`technique=${selectedTechnique}`);
      if (params.length > 0) url += '?' + params.join('&');
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPatterns(data);
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchPatterns();
  }, [selectedCategory, selectedTechnique]);

  const renderPatternCard = (pattern: Pattern) => {
    const iconName = CATEGORY_ICONS[pattern.category] || 'cube-outline';
    const difficultyColor = DIFFICULTY_COLORS[pattern.difficulty] || '#888888';

    return (
      <TouchableOpacity
        key={pattern.id}
        style={styles.patternCard}
        onPress={() => router.push({ pathname: '/pattern-detail', params: { id: pattern.id } })}
        activeOpacity={0.8}
      >
        <View style={styles.patternIconContainer}>
          <Ionicons name={iconName as any} size={40} color="#D4AF37" />
        </View>
        <View style={styles.patternInfo}>
          <Text style={styles.patternName}>{pattern.name}</Text>
          <Text style={styles.patternDescription} numberOfLines={2}>
            {pattern.description}
          </Text>
          <View style={styles.patternMeta}>
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
              <Text style={styles.difficultyText}>{pattern.difficulty}</Text>
            </View>
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={14} color="#888888" />
              <Text style={styles.timeText}>{pattern.estimated_time}</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#D4AF37" style={styles.arrowIcon} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Patrons & Recettes</Text>
          <Text style={styles.headerSubtitle}>Tout ce qu'il faut pour chaque projet</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Technique Filter (Aiguilles / Crochet) */}
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
            {tech.icon && (
              <Ionicons
                name={tech.icon as any}
                size={16}
                color={selectedTechnique === tech.value ? '#0A0A0A' : '#D4AF37'}
              />
            )}
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

      {/* Patterns List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.loadingText}>Chargement des patrons...</Text>
          </View>
        ) : patterns.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color="#333333" />
            <Text style={styles.emptyTitle}>Aucun patron</Text>
            <Text style={styles.emptyText}>Aucun patron dans cette catégorie.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {patterns.length} patron{patterns.length > 1 ? 's' : ''} disponible{patterns.length > 1 ? 's' : ''}
            </Text>
            {patterns.map(renderPatternCard)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#D4AF37',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  categoryScroll: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  categoryText: {
    fontSize: 13,
    color: '#D4AF37',
  },
  categoryTextActive: {
    color: '#0A0A0A',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  resultsCount: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  patternIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  patternInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  patternName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  patternDescription: {
    fontSize: 12,
    color: '#AAAAAA',
    lineHeight: 18,
    marginBottom: 8,
  },
  patternMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#888888',
  },
  arrowIcon: {
    marginLeft: 'auto',
  },
});

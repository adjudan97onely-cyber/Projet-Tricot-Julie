import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomTab from './components/BottomTab';
import Header from './components/Header';
import Badge from './components/Badge';
import { colors, fonts, radii, shadows, spacing, layout } from './theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

interface FilterOption {
  value: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const TECHNIQUES: FilterOption[] = [
  { value: 'all', label: 'Tout' },
  { value: 'aiguilles', label: 'Aiguilles', icon: 'color-wand-outline' },
  { value: 'crochet', label: 'Crochet', icon: 'git-branch-outline' },
];

const CATEGORIES: FilterOption[] = [
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

type DifficultyTone = 'sage' | 'gold' | 'rose';

const DIFFICULTY_TONE: Record<string, DifficultyTone> = {
  'débutant': 'sage',
  'intermédiaire': 'gold',
  'avancé': 'rose',
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'bonnet': 'happy-outline',
  'echarpe': 'resize-outline',
  'pull': 'shirt-outline',
  'robe': 'woman-outline',
  'top': 'sunny-outline',
  'maillot': 'water-outline',
  'couverture': 'bed-outline',
  'chaussettes': 'footsteps-outline',
  'bebe': 'heart-outline',
  'accessoire': 'diamond-outline',
};

export default function PatternsScreen() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTechnique, setSelectedTechnique] = useState('all');

  useEffect(() => {
    setIsLoading(true);
    fetchPatterns();
  }, [selectedCategory, selectedTechnique]);

  async function fetchPatterns() {
    try {
      let url = `${BACKEND_URL}/api/patterns`;
      const params: string[] = [];
      if (selectedCategory !== 'all') params.push(`category=${selectedCategory}`);
      if (selectedTechnique !== 'all') params.push(`technique=${selectedTechnique}`);
      if (params.length > 0) url += '?' + params.join('&');

      const response = await fetch(url);
      if (response.ok) {
        setPatterns(await response.json());
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function renderPatternCard(pattern: Pattern) {
    const iconName = CATEGORY_ICONS[pattern.category] || 'cube-outline';
    const difficultyTone = DIFFICULTY_TONE[pattern.difficulty] || 'neutral';
    const hasImage = pattern.image_url && pattern.image_url.startsWith('http');

    return (
      <TouchableOpacity
        key={pattern.id}
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/pattern-detail', params: { id: pattern.id } })}
      >
        {/* Icône / Image */}
        <View style={styles.cardImage}>
          {hasImage ? (
            <Image source={{ uri: pattern.image_url }} style={styles.cardPhoto} resizeMode="cover" />
          ) : (
            <View style={styles.cardIconFallback}>
              <Ionicons name={iconName} size={32} color={colors.blushDeep} />
            </View>
          )}
        </View>

        {/* Infos */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{pattern.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {pattern.description}
          </Text>
          <View style={styles.cardMeta}>
            <Badge label={pattern.difficulty} tone={difficultyTone} />
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={styles.timeText}>{pattern.estimated_time}</Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <Header title="Patrons & Recettes" subtitle="Tout ce qu'il faut pour chaque projet" back />

      {/* Filtre technique (Aiguilles / Crochet) */}
      <View style={styles.techniqueRow}>
        {TECHNIQUES.map((tech) => (
          <TouchableOpacity
            key={tech.value}
            style={[
              styles.techniqueBtn,
              selectedTechnique === tech.value && styles.techniqueBtnActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedTechnique === tech.value }}
            onPress={() => setSelectedTechnique(tech.value)}
          >
            {tech.icon && (
              <Ionicons
                name={tech.icon}
                size={15}
                color={selectedTechnique === tech.value ? colors.white : colors.blushDeep}
              />
            )}
            <Text
              style={[
                styles.techniqueText,
                selectedTechnique === tech.value && styles.techniqueTextActive,
              ]}
            >
              {tech.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtre catégorie */}
      <View style={styles.categoryWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryBtn,
                selectedCategory === cat.value && styles.categoryBtnActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedCategory === cat.value }}
              onPress={() => setSelectedCategory(cat.value)}
            >
              {cat.icon && (
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={selectedCategory === cat.value ? colors.white : colors.blushDeep}
                />
              )}
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
        </ScrollView>
      </View>

      {/* Liste des patrons */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.blushDeep} />
            <Text style={styles.centerText}>Chargement des patrons...</Text>
          </View>
        ) : patterns.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyEmoji}>🧶</Text>
            </View>
            <Text style={styles.emptyTitle}>Aucun patron</Text>
            <Text style={styles.centerText}>Aucun patron dans cette catégorie.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.count}>
              {patterns.length} patron{patterns.length > 1 ? 's' : ''} disponible
              {patterns.length > 1 ? 's' : ''}
            </Text>
            {patterns.map(renderPatternCard)}
          </>
        )}
      </ScrollView>

      <BottomTab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  /* Technique filter */
  techniqueRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  techniqueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  techniqueBtnActive: {
    backgroundColor: colors.blushDeep,
    borderColor: colors.blushDeep,
  },
  techniqueText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blushDeep,
  },
  techniqueTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  /* Category filter */
  categoryWrap: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  categoryRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 5,
  },
  categoryBtnActive: {
    backgroundColor: colors.blushDeep,
    borderColor: colors.blushDeep,
  },
  categoryText: {
    fontSize: 13,
    color: colors.blushDeep,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  /* List */
  list: {
    flex: 1,
  },
  listContent: {
    padding: layout.pagePadding,
    paddingBottom: layout.bottomTabSpace,
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  count: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },

  /* Pattern card */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  cardImage: {
    width: 76,
    height: 76,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.blushSoft,
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
  },
  cardIconFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  cardName: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },

  /* Empty / Loading */
  center: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  centerText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.blushSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
  },
});

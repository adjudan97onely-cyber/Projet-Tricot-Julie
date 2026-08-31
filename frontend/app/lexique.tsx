import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from './theme';
import Header from './components/Header';
import Badge from './components/Badge';
import Card from './components/Card';
import BottomTab from './components/BottomTab';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LexiqueTerm {
  id: string;
  term: string;
  category: string;
  definition: string;
  abbreviation?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'Tout', icon: 'grid-outline' as const },
  { value: 'tricot', label: 'Tricot', icon: 'color-wand-outline' as const },
  { value: 'crochet', label: 'Crochet', icon: 'git-branch-outline' as const },
  { value: 'fil', label: 'Fils', icon: 'color-palette-outline' as const },
  { value: 'épaisseur', label: 'Épaisseurs', icon: 'layers-outline' as const },
];

const getCategoryTone = (category: string): 'rose' | 'sage' | 'gold' | 'neutral' => {
  switch (category) {
    case 'tricot':
      return 'sage';
    case 'crochet':
      return 'gold';
    case 'fil':
      return 'rose';
    case 'épaisseur':
      return 'neutral';
    default:
      return 'neutral';
  }
};

export default function LexiqueScreen() {
  const router = useRouter();
  const [terms, setTerms] = useState<LexiqueTerm[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<LexiqueTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  useEffect(() => {
    fetchTerms();
  }, []);

  useEffect(() => {
    filterTerms();
  }, [terms, selectedCategory, searchQuery]);

  const fetchTerms = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/lexique`);
      if (response.ok) {
        const data = await response.json();
        setTerms(data);
      }
    } catch (error) {
      console.error('Error fetching lexique:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTerms = () => {
    let filtered = terms;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.term.toLowerCase().includes(query) ||
          t.definition.toLowerCase().includes(query)
      );
    }

    setFilteredTerms(filtered);
  };

  const renderTerm = (term: LexiqueTerm) => {
    const isExpanded = expandedTerm === term.id;

    return (
      <TouchableOpacity
        key={term.id}
        activeOpacity={0.85}
        onPress={() => setExpandedTerm(isExpanded ? null : term.id)}
        style={styles.termWrapper}
      >
        <Card style={isExpanded ? styles.termCardExpanded : undefined}>
          <View style={styles.termHeader}>
            <View style={styles.termTitleRow}>
              <Text style={styles.termName}>{term.term}</Text>
              {term.abbreviation ? (
                <View style={styles.abbreviationBadge}>
                  <Text style={styles.abbreviationText}>{term.abbreviation}</Text>
                </View>
              ) : null}
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </View>

          {isExpanded ? (
            <View style={styles.termContent}>
              <Text style={styles.termDefinition}>{term.definition}</Text>
              <View style={styles.categoryBadgeRow}>
                <Badge
                  label={term.category}
                  tone={getCategoryTone(term.category)}
                />
              </View>
            </View>
          ) : null}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Lexique"
        subtitle="Termes & Définitions"
        back
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher un terme..."
          placeholderTextColor={colors.textMuted}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
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

      {/* Terms List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.blushDeep} />
          </View>
        ) : filteredTerms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.line} />
            <Text style={styles.emptyText}>Aucun terme trouvé</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {filteredTerms.length} terme{filteredTerms.length > 1 ? 's' : ''}
            </Text>
            {filteredTerms.map(renderTerm)}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
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
  termWrapper: {
    marginBottom: spacing.sm,
  },
  termCardExpanded: {
    borderWidth: 1.5,
    borderColor: colors.blushDeep,
  },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  termName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  abbreviationBadge: {
    backgroundColor: colors.blushSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  abbreviationText: {
    fontSize: 11,
    color: colors.blushDeep,
    fontWeight: '700',
  },
  termContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  termDefinition: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
  },
  categoryBadgeRow: {
    marginTop: spacing.md,
  },
});

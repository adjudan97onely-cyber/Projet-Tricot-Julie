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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LexiqueTerm {
  id: string;
  term: string;
  category: string;
  definition: string;
  abbreviation?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'Tout', icon: 'grid-outline' },
  { value: 'tricot', label: 'Tricot', icon: 'color-wand-outline' },
  { value: 'crochet', label: 'Crochet', icon: 'git-branch-outline' },
  { value: 'fil', label: 'Fils', icon: 'color-palette-outline' },
  { value: 'épaisseur', label: 'Épaisseurs', icon: 'layers-outline' },
];

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
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.term.toLowerCase().includes(query) ||
        t.definition.toLowerCase().includes(query)
      );
    }
    
    setFilteredTerms(filtered);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tricot': return '#4CAF50';
      case 'crochet': return '#FF9800';
      case 'fil': return '#E91E63';
      case 'épaisseur': return '#2196F3';
      default: return '#D4AF37';
    }
  };

  const renderTerm = (term: LexiqueTerm) => {
    const isExpanded = expandedTerm === term.id;
    const categoryColor = getCategoryColor(term.category);

    return (
      <TouchableOpacity
        key={term.id}
        style={[styles.termCard, isExpanded && styles.termCardExpanded]}
        onPress={() => setExpandedTerm(isExpanded ? null : term.id)}
        activeOpacity={0.8}
      >
        <View style={styles.termHeader}>
          <View style={styles.termTitleRow}>
            <Text style={styles.termName}>{term.term}</Text>
            {term.abbreviation && (
              <View style={styles.abbreviationBadge}>
                <Text style={styles.abbreviationText}>{term.abbreviation}</Text>
              </View>
            )}
          </View>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
        </View>
        
        {isExpanded && (
          <View style={styles.termContent}>
            <Text style={styles.termDefinition}>{term.definition}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
              <Text style={styles.categoryBadgeText}>{term.category}</Text>
            </View>
          </View>
        )}
        
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#888"
          style={styles.chevron}
        />
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
          <Text style={styles.headerTitle}>Lexique</Text>
          <Text style={styles.headerSubtitle}>Termes & Définitions</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher un terme..."
          placeholderTextColor="#666"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
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

      {/* Terms List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        ) : filteredTerms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#333" />
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
  backButton: { padding: 8 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 11, color: '#D4AF37', marginTop: 2 },
  headerRight: { width: 40 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 10,
  },
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
  termCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  termCardExpanded: { borderColor: '#D4AF37' },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  termName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  abbreviationBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
  },
  abbreviationText: { fontSize: 11, color: '#D4AF37', fontWeight: '600' },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 10 },
  termContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  termDefinition: { fontSize: 14, color: '#CCCCCC', lineHeight: 22 },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 12,
  },
  categoryBadgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  chevron: { position: 'absolute', right: 16, top: 18 },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SizeGuide {
  [key: string]: {
    title: string;
    measurements?: Array<Record<string, string>>;
    women?: Array<Record<string, string>>;
    men?: Array<Record<string, string>>;
    children?: Array<Record<string, string>>;
  };
}

const CATEGORIES = [
  { value: 'bonnets', label: 'Bonnets', icon: 'happy-outline' },
  { value: 'chaussettes', label: 'Chaussettes', icon: 'footsteps-outline' },
  { value: 'pulls', label: 'Pulls', icon: 'shirt-outline' },
  { value: 'couvertures', label: 'Couvertures', icon: 'bed-outline' },
  { value: 'echarpes', label: 'Écharpes', icon: 'resize-outline' },
];

export default function SizeGuideScreen() {
  const router = useRouter();
  const [sizeGuide, setSizeGuide] = useState<SizeGuide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('bonnets');

  useEffect(() => {
    fetchSizeGuide();
  }, []);

  const fetchSizeGuide = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/size-guide`);
      if (response.ok) {
        const data = await response.json();
        setSizeGuide(data);
      }
    } catch (error) {
      console.error('Error fetching size guide:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTable = (data: Array<Record<string, string>>, title?: string) => {
    if (!data || data.length === 0) return null;
    const headers = Object.keys(data[0]);

    return (
      <View style={styles.tableContainer}>
        {title && <Text style={styles.tableTitle}>{title}</Text>}
        <View style={styles.tableHeader}>
          {headers.map((header, index) => (
            <View key={index} style={[styles.tableCell, styles.headerCell, { flex: index === 0 ? 1.5 : 1 }]}>
              <Text style={styles.headerText}>
                {header.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
              </Text>
            </View>
          ))}
        </View>
        {data.map((row, rowIndex) => (
          <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 0 && styles.tableRowEven]}>
            {headers.map((header, cellIndex) => (
              <View key={cellIndex} style={[styles.tableCell, { flex: cellIndex === 0 ? 1.5 : 1 }]}>
                <Text style={styles.cellText}>{row[header]}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const currentGuide = sizeGuide?.[selectedCategory];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Guide des Tailles</Text>
          <Text style={styles.headerSubtitle}>Par âge et catégorie</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Category Tabs */}
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
                size={18}
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

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        ) : currentGuide ? (
          <>
            <Text style={styles.guideTitle}>{currentGuide.title}</Text>
            
            {currentGuide.measurements && renderTable(currentGuide.measurements)}
            {currentGuide.women && renderTable(currentGuide.women, 'Femmes')}
            {currentGuide.men && renderTable(currentGuide.men, 'Hommes')}
            {currentGuide.children && renderTable(currentGuide.children, 'Enfants')}

            <View style={styles.tipCard}>
              <Ionicons name="information-circle-outline" size={20} color="#D4AF37" />
              <Text style={styles.tipText}>
                Ces mesures sont indicatives. Mesurez toujours la personne pour un résultat optimal !
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>Guide non disponible</Text>
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
  categoryScroll: { maxHeight: 60, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
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
    paddingVertical: 10,
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
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center' },
  guideTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 16,
  },
  tableContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    padding: 12,
    backgroundColor: '#252525',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#D4AF37',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowEven: {
    backgroundColor: '#151515',
  },
  tableCell: {
    padding: 10,
    justifyContent: 'center',
  },
  headerCell: {},
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A0A0A',
    textTransform: 'capitalize',
  },
  cellText: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D4AF37',
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 20,
  },
});

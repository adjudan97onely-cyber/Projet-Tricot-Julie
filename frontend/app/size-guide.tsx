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
import { colors, spacing, radii } from './theme';
import Header from './components/Header';
import Card from './components/Card';
import BottomTab from './components/BottomTab';

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
  { value: 'bonnets', label: 'Bonnets', icon: 'happy-outline' as const },
  { value: 'chaussettes', label: 'Chaussettes', icon: 'footsteps-outline' as const },
  { value: 'pulls', label: 'Pulls', icon: 'shirt-outline' as const },
  { value: 'couvertures', label: 'Couvertures', icon: 'bed-outline' as const },
  { value: 'echarpes', label: 'Écharpes', icon: 'resize-outline' as const },
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
      <Card padded={false} style={styles.tableCard}>
        {title ? (
          <View style={styles.tableSubHeader}>
            <Text style={styles.tableSubHeaderText}>{title}</Text>
          </View>
        ) : null}
        <View style={styles.tableHeader}>
          {headers.map((header, index) => (
            <View
              key={index}
              style={[styles.tableCell, styles.headerCell, { flex: index === 0 ? 1.5 : 1 }]}
            >
              <Text style={styles.headerText}>
                {header.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
              </Text>
            </View>
          ))}
        </View>
        {data.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={[styles.tableRow, rowIndex % 2 === 0 ? styles.tableRowEven : undefined]}
          >
            {headers.map((header, cellIndex) => (
              <View
                key={cellIndex}
                style={[styles.tableCell, { flex: cellIndex === 0 ? 1.5 : 1 }]}
              >
                <Text style={styles.cellText}>{row[header]}</Text>
              </View>
            ))}
          </View>
        ))}
      </Card>
    );
  };

  const currentGuide = sizeGuide?.[selectedCategory];

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Guide des Tailles"
        subtitle="Par âge et catégorie"
        back
      />

      {/* Category Tabs */}
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
                size={18}
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

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.blushDeep} />
          </View>
        ) : currentGuide ? (
          <>
            <Text style={styles.guideTitle}>{currentGuide.title}</Text>

            {currentGuide.measurements
              ? renderTable(currentGuide.measurements)
              : null}
            {currentGuide.women ? renderTable(currentGuide.women, 'Femmes') : null}
            {currentGuide.men ? renderTable(currentGuide.men, 'Hommes') : null}
            {currentGuide.children ? renderTable(currentGuide.children, 'Enfants') : null}

            <View style={styles.tipCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.gold} />
              <Text style={styles.tipText}>
                Ces mesures sont indicatives. Mesurez toujours la personne pour un résultat
                optimal !
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>Guide non disponible</Text>
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
  categoryScroll: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
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
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.blushDeep,
    marginBottom: spacing.lg,
  },
  tableCard: {
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  tableSubHeader: {
    backgroundColor: colors.goldSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tableSubHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.blushDeep,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowEven: {
    backgroundColor: colors.blushSoft,
  },
  tableCell: {
    padding: 10,
    justifyContent: 'center',
  },
  headerCell: {},
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'capitalize',
  },
  cellText: {
    fontSize: 12,
    color: colors.text,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.goldSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
});

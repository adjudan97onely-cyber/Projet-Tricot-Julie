import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from './theme';
import Header from './components/Header';
import Badge from './components/Badge';
import Card from './components/Card';
import BottomTab from './components/BottomTab';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  image_base64?: string;
  price?: string;
  available: boolean;
  featured: boolean;
  created_at: string;
}

const CATEGORIES: Record<string, string> = {
  bonnet: 'Bonnet',
  echarpe: 'Écharpe',
  pull: 'Pull',
  couverture: 'Couverture',
  accessoire: 'Accessoire',
  autre: 'Autre',
};

export default function GalleryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<GalleryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchItem();
    }
  }, [id]);

  const fetchItem = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/gallery/${id}`);
      if (response.ok) {
        const data = await response.json();
        setItem(data);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Création" back />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blushDeep} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={item.title} back />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Image */}
        {item.image_base64 ? (
          <Image
            source={{ uri: item.image_base64 }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={80} color={colors.line} />
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgesRow}>
          <Badge label={CATEGORIES[item.category] || item.category} tone="rose" />
          {item.featured ? (
            <Badge label="Mis en avant" tone="gold" />
          ) : null}
          <Badge
            label={item.available ? 'Disponible' : 'Vendu'}
            tone={item.available ? 'sage' : 'neutral'}
          />
        </View>

        {/* Title & Price */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{item.title}</Text>
          {item.price ? (
            <Text style={styles.price}>{item.price}</Text>
          ) : null}
        </View>

        {/* Description */}
        {item.description ? (
          <Card style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{item.description}</Text>
          </Card>
        ) : null}

        {/* Contact Button */}
        {item.available ? (
          <TouchableOpacity
            style={styles.contactButton}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/contact',
                params: { itemId: item.id, itemTitle: item.title },
              })
            }
          >
            <Ionicons name="mail-outline" size={22} color={colors.white} />
            <Text style={styles.contactButtonText}>Commander / Poser une question</Text>
          </TouchableOpacity>
        ) : null}
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
  itemImage: {
    width: width,
    height: width * 0.75,
  },
  imagePlaceholder: {
    width: width,
    height: width * 0.75,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.blushDeep,
  },
  descriptionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.blushDeep,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 24,
  },
  contactButton: {
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
  contactButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});

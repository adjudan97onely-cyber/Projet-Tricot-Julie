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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Image */}
        {item.image_base64 ? (
          <Image source={{ uri: item.image_base64 }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={80} color="#D4AF37" />
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgesRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{CATEGORIES[item.category] || item.category}</Text>
          </View>
          {item.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={14} color="#0A0A0A" />
              <Text style={styles.featuredText}>Mis en avant</Text>
            </View>
          )}
          <View style={[styles.availabilityBadge, !item.available && styles.unavailableBadge]}>
            <Text style={[styles.availabilityText, !item.available && styles.unavailableText]}>
              {item.available ? 'Disponible' : 'Vendu'}
            </Text>
          </View>
        </View>

        {/* Title & Price */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{item.title}</Text>
          {item.price && <Text style={styles.price}>{item.price}</Text>}
        </View>

        {/* Description */}
        {item.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}

        {/* Contact Button */}
        {item.available && (
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => router.push({
              pathname: '/contact',
              params: { itemId: item.id, itemTitle: item.title }
            })}
          >
            <Ionicons name="mail-outline" size={22} color="#0A0A0A" />
            <Text style={styles.contactButtonText}>Commander / Poser une question</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888888',
    fontSize: 16,
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  itemImage: {
    width: width,
    height: width * 0.75,
  },
  imagePlaceholder: {
    width: width,
    height: width * 0.75,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  categoryText: {
    fontSize: 13,
    color: '#D4AF37',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  featuredText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  availabilityBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  unavailableBadge: {
    backgroundColor: 'rgba(136, 136, 136, 0.2)',
  },
  availabilityText: {
    fontSize: 13,
    color: '#4CAF50',
  },
  unavailableText: {
    color: '#888888',
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D4AF37',
  },
  descriptionSection: {
    padding: 16,
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 24,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
    marginLeft: 10,
  },
});

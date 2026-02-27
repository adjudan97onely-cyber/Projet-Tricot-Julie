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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Pattern {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  estimated_time: string;
  description: string;
  materials: {
    yarn: {
      type: string;
      weight: string;
      quantity: string;
      recommended: string;
    };
    needles: {
      type: string;
      size: string;
      cable_length: string;
    };
    accessories: string[];
  };
  gauge: string;
  sizes: Record<string, string>;
  steps: Array<{
    step: number;
    title: string;
    instruction: string;
  }>;
  tips: string[];
  image_url: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  'débutant': '#4CAF50',
  'intermédiaire': '#FF9800',
  'avancé': '#F44336',
};

const CATEGORY_LABELS: Record<string, string> = {
  'bonnet': 'Bonnet',
  'echarpe': 'Écharpe',
  'pull': 'Vêtement',
  'couverture': 'Couverture',
  'chaussettes': 'Chaussettes',
  'accessoire': 'Accessoire',
};

export default function PatternDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'steps' | 'tips'>('materials');

  useEffect(() => {
    if (id) {
      fetchPattern();
    }
  }, [id]);

  const fetchPattern = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/patterns/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPattern(data);
      }
    } catch (error) {
      console.error('Error fetching pattern:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!pattern) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Patron non trouvé</Text>
        </View>
      </SafeAreaView>
    );
  }

  const difficultyColor = DIFFICULTY_COLORS[pattern.difficulty] || '#888888';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{pattern.name}</Text>
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => router.push({
            pathname: '/chat',
            params: { question: `J'aimerais des conseils pour réaliser le patron "${pattern.name}". Peux-tu m'aider ?` }
          })}
        >
          <Ionicons name="sparkles" size={22} color="#D4AF37" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Pattern Image */}
        {pattern.image_url && pattern.image_url.startsWith('http') && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: pattern.image_url }} 
              style={styles.patternImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Pattern Header */}
        <View style={styles.patternHeader}>
          <Text style={styles.patternName}>{pattern.name}</Text>
          <Text style={styles.patternDescription}>{pattern.description}</Text>
          
          <View style={styles.badgesRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {CATEGORY_LABELS[pattern.category] || pattern.category}
              </Text>
            </View>
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
              <Text style={styles.difficultyText}>{pattern.difficulty}</Text>
            </View>
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={14} color="#D4AF37" />
              <Text style={styles.timeText}>{pattern.estimated_time}</Text>
            </View>
          </View>
        </View>

        {/* Sizes */}
        <View style={styles.sizesCard}>
          <Text style={styles.sectionTitle}>Tailles disponibles</Text>
          <View style={styles.sizesList}>
            {Object.entries(pattern.sizes).map(([size, desc]) => (
              <View key={size} style={styles.sizeItem}>
                <Text style={styles.sizeLabel}>{size}</Text>
                <Text style={styles.sizeDesc}>{desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Gauge */}
        <View style={styles.gaugeCard}>
          <Ionicons name="grid-outline" size={20} color="#D4AF37" />
          <View style={styles.gaugeInfo}>
            <Text style={styles.gaugeLabel}>Échantillon</Text>
            <Text style={styles.gaugeValue}>{pattern.gauge}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'materials' && styles.tabActive]}
            onPress={() => setActiveTab('materials')}
          >
            <Ionicons
              name="cube-outline"
              size={18}
              color={activeTab === 'materials' ? '#0A0A0A' : '#D4AF37'}
            />
            <Text style={[styles.tabText, activeTab === 'materials' && styles.tabTextActive]}>
              Matériel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'steps' && styles.tabActive]}
            onPress={() => setActiveTab('steps')}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={activeTab === 'steps' ? '#0A0A0A' : '#D4AF37'}
            />
            <Text style={[styles.tabText, activeTab === 'steps' && styles.tabTextActive]}>
              Étapes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tips' && styles.tabActive]}
            onPress={() => setActiveTab('tips')}
          >
            <Ionicons
              name="bulb-outline"
              size={18}
              color={activeTab === 'tips' ? '#0A0A0A' : '#D4AF37'}
            />
            <Text style={[styles.tabText, activeTab === 'tips' && styles.tabTextActive]}>
              Astuces
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'materials' && (
            <>
              {/* Yarn */}
              <View style={styles.materialCard}>
                <View style={styles.materialHeader}>
                  <Ionicons name="color-palette-outline" size={24} color="#D4AF37" />
                  <Text style={styles.materialTitle}>Laine</Text>
                </View>
                <View style={styles.materialDetail}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{pattern.materials.yarn.type}</Text>
                </View>
                <View style={styles.materialDetail}>
                  <Text style={styles.detailLabel}>Poids</Text>
                  <Text style={styles.detailValue}>{pattern.materials.yarn.weight}</Text>
                </View>
                <View style={styles.materialDetail}>
                  <Text style={styles.detailLabel}>Quantité</Text>
                  <Text style={styles.detailValue}>{pattern.materials.yarn.quantity}</Text>
                </View>
                <View style={styles.recommendedBox}>
                  <Text style={styles.recommendedLabel}>Recommandé</Text>
                  <Text style={styles.recommendedValue}>{pattern.materials.yarn.recommended}</Text>
                </View>
              </View>

              {/* Needles */}
              <View style={styles.materialCard}>
                <View style={styles.materialHeader}>
                  <Ionicons name="construct-outline" size={24} color="#D4AF37" />
                  <Text style={styles.materialTitle}>Aiguilles / Crochet</Text>
                </View>
                <View style={styles.materialDetail}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{pattern.materials.needles.type}</Text>
                </View>
                <View style={styles.materialDetail}>
                  <Text style={styles.detailLabel}>Taille</Text>
                  <Text style={styles.detailValue}>{pattern.materials.needles.size}</Text>
                </View>
                {pattern.materials.needles.cable_length !== 'N/A' && (
                  <View style={styles.materialDetail}>
                    <Text style={styles.detailLabel}>Câble</Text>
                    <Text style={styles.detailValue}>{pattern.materials.needles.cable_length}</Text>
                  </View>
                )}
              </View>

              {/* Accessories */}
              <View style={styles.materialCard}>
                <View style={styles.materialHeader}>
                  <Ionicons name="bag-outline" size={24} color="#D4AF37" />
                  <Text style={styles.materialTitle}>Accessoires</Text>
                </View>
                {pattern.materials.accessories.map((acc, index) => (
                  <View key={index} style={styles.accessoryItem}>
                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                    <Text style={styles.accessoryText}>{acc}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {activeTab === 'steps' && (
            <>
              {pattern.steps.map((step, index) => (
                <View key={index} style={styles.stepCard}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.step}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepInstruction}>{step.instruction}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {activeTab === 'tips' && (
            <>
              {pattern.tips.map((tip, index) => (
                <View key={index} style={styles.tipCard}>
                  <Ionicons name="bulb" size={20} color="#D4AF37" />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Ask AI Button */}
        <TouchableOpacity
          style={styles.askAiButton}
          onPress={() => router.push({
            pathname: '/chat',
            params: { question: `Je veux faire le patron "${pattern.name}". Peux-tu m'aider avec des conseils personnalisés ?` }
          })}
        >
          <Ionicons name="sparkles" size={22} color="#0A0A0A" />
          <Text style={styles.askAiText}>Demander conseil à Julie</Text>
        </TouchableOpacity>
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
    fontSize: 14,
    color: '#888888',
    marginTop: 12,
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
  aiButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#1A1A1A',
  },
  patternImage: {
    width: '100%',
    height: '100%',
  },
  patternHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  patternName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  patternDescription: {
    fontSize: 15,
    color: '#AAAAAA',
    lineHeight: 22,
    marginBottom: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  difficultyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    color: '#D4AF37',
  },
  sizesCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 12,
  },
  sizesList: {
    gap: 8,
  },
  sizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    width: 60,
  },
  sizeDesc: {
    fontSize: 14,
    color: '#AAAAAA',
    flex: 1,
  },
  gaugeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  gaugeInfo: {
    marginLeft: 12,
  },
  gaugeLabel: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
  },
  gaugeValue: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#D4AF37',
  },
  tabText: {
    fontSize: 13,
    color: '#D4AF37',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0A0A0A',
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
  },
  materialCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  materialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  materialDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#888888',
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  recommendedBox: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  recommendedLabel: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendedValue: {
    fontSize: 13,
    color: '#CCCCCC',
  },
  accessoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  accessoryText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A0A0A',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  stepInstruction: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 22,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4AF37',
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  askAiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  askAiText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
  },
});

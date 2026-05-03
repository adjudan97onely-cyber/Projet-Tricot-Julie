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
  Linking,
  Share,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PremiumGate from './components/PremiumGate';
import { hasGuestAccess } from './services/guestAccess';
import { submitFeedback, getFeedbackCounts, getComments } from './services/supabaseService';

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

// Function to open Amazon search for yarn
const openAmazonSearch = (searchTerm: string) => {
  // Clean and format the search term for Amazon France
  const cleanedTerm = searchTerm
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const encodedSearch = encodeURIComponent(`laine tricot ${cleanedTerm}`);
  const amazonUrl = `https://www.amazon.fr/s?k=${encodedSearch}`;
  Linking.openURL(amazonUrl);
};

// Function to open Amazon search for needles
const openAmazonNeedleSearch = (needleType: string, needleSize: string) => {
  const searchTerm = `${needleType} ${needleSize} tricot`;
  const encodedSearch = encodeURIComponent(searchTerm);
  const amazonUrl = `https://www.amazon.fr/s?k=${encodedSearch}`;
  Linking.openURL(amazonUrl);
};

// Function to open Hobbii search
const openHobbiiSearch = (searchTerm: string) => {
  const cleanedTerm = searchTerm.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const encodedSearch = encodeURIComponent(cleanedTerm);
  const hobbiiUrl = `https://hobbii.fr/catalogsearch/result/?q=${encodedSearch}`;
  Linking.openURL(hobbiiUrl);
};

// Function to open Lou Passion
const openLouPassionSearch = (searchTerm: string) => {
  const cleanedTerm = searchTerm.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const encodedSearch = encodeURIComponent(cleanedTerm);
  const louPassionUrl = `https://loupassion.com/?s=${encodedSearch}&post_type=product`;
  Linking.openURL(louPassionUrl);
};

export default function PatternDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'steps' | 'tips'>('materials');
  const [premiumAccess, setPremiumAccess] = useState(() => hasGuestAccess());
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState<{ comment: string; created_at: string }[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPattern();
      loadFeedback();
    }
  }, [id]);

  const loadFeedback = async () => {
    if (!id) return;
    const [counts, cmts] = await Promise.all([getFeedbackCounts(id), getComments(id)]);
    setLikes(counts.likes);
    setComments(cmts);
  };

  const handleLike = async () => {
    if (hasLiked || !id) return;
    setHasLiked(true);
    setLikes(l => l + 1);
    await submitFeedback({ patternId: id, type: 'like' });
  };

  const handleComment = async () => {
    if (!newComment.trim() || !id) return;
    setCommentLoading(true);
    await submitFeedback({ patternId: id, comment: newComment.trim() });
    setNewComment('');
    const cmts = await getComments(id);
    setComments(cmts);
    setCommentLoading(false);
  };

  const handleShare = async () => {
    if (!pattern) return;
    try {
      await Share.share({
        title: pattern.name,
        message: `Découvre ce patron de tricot : ${pattern.name} — ${pattern.description}\n\nhttps://projet-tricot-julie.vercel.app`,
        url: 'https://projet-tricot-julie.vercel.app',
      });
    } catch {}
  };

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
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/patterns')} style={styles.backButton}>
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

        {/* Action bar : likes, commentaires, partage, instagram */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={[styles.actionBtn, hasLiked && styles.actionBtnActive]} onPress={handleLike}>
            <Ionicons name={hasLiked ? "heart" : "heart-outline"} size={20} color={hasLiked ? "#E74C3C" : "#AAAAAA"} />
            <Text style={[styles.actionText, hasLiked && { color: '#E74C3C' }]}>{likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(v => !v)}>
            <Ionicons name="chatbubble-outline" size={20} color="#AAAAAA" />
            <Text style={styles.actionText}>{comments.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#AAAAAA" />
            <Text style={styles.actionText}>Partager</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL('https://www.instagram.com/djeminie972/')}>
            <Ionicons name="logo-instagram" size={20} color="#C13584" />
            <Text style={[styles.actionText, { color: '#C13584' }]}>Julie</Text>
          </TouchableOpacity>
        </View>

        {/* Section commentaires */}
        {showComments && (
          <View style={styles.commentsSection}>
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Laisser un commentaire..."
                placeholderTextColor="#555"
                multiline
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, !newComment.trim() && { opacity: 0.4 }]}
                onPress={handleComment}
                disabled={commentLoading || !newComment.trim()}
              >
                <Ionicons name="send" size={18} color="#0A0A0A" />
              </TouchableOpacity>
            </View>
            {comments.length === 0 ? (
              <Text style={styles.noCommentText}>Soyez le premier à commenter !</Text>
            ) : (
              comments.map((c, i) => (
                <View key={i} style={styles.commentItem}>
                  <Ionicons name="person-circle-outline" size={22} color="#D4AF37" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.commentText}>{c.comment}</Text>
                    <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Premium Gate pour les instructions complètes */}
        {!premiumAccess && (
          <PremiumGate feature="patron" onAccess={() => setPremiumAccess(true)} />
        )}

        {/* Tabs + contenu + bouton IA — visibles seulement en premium */}
        {premiumAccess && (<>
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
                {/* Amazon Buy Button for Yarn */}
                <TouchableOpacity
                  style={styles.amazonButton}
                  onPress={() => openAmazonSearch(pattern.materials.yarn.recommended || pattern.materials.yarn.type)}
                >
                  <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.amazonButtonText}>Amazon</Text>
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                {/* Additional store buttons */}
                <View style={styles.storeButtonsRow}>
                  <TouchableOpacity
                    style={styles.hobbiiButton}
                    onPress={() => openHobbiiSearch(pattern.materials.yarn.type)}
                  >
                    <Text style={styles.storeButtonText}>Hobbii</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.louPassionButton}
                    onPress={() => openLouPassionSearch(pattern.materials.yarn.type)}
                  >
                    <Text style={styles.storeButtonText}>Lou Passion</Text>
                  </TouchableOpacity>
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
                {/* Amazon Buy Button for Needles */}
                <TouchableOpacity
                  style={styles.amazonButton}
                  onPress={() => openAmazonNeedleSearch(pattern.materials.needles.type, pattern.materials.needles.size)}
                >
                  <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.amazonButtonText}>Acheter sur Amazon</Text>
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
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
        </>)}
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
  amazonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9900',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  amazonButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  storeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  hobbiiButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  louPassionButton: {
    flex: 1,
    backgroundColor: '#9B59B6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  storeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  actionBtnActive: {},
  actionText: {
    fontSize: 11,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  commentsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 14,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 80,
  },
  commentSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCommentText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    paddingVertical: 8,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  commentDate: {
    fontSize: 11,
    color: '#555',
    marginTop: 3,
  },
});

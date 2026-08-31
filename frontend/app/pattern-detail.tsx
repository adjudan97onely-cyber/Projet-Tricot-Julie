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
import { submitFeedback, getFeedbackCounts, getComments } from './services/supabaseService';
import Header from './components/Header';
import Badge from './components/Badge';
import Card from './components/Card';
import { colors, fonts, radii, shadows, spacing, layout } from './theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Pattern {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  estimated_time: string;
  description: string;
  materials: {
    yarn: { type: string; weight: string; quantity: string; recommended: string };
    needles: { type: string; size: string; cable_length: string };
    accessories: string[];
  };
  gauge: string;
  sizes: Record<string, string>;
  steps: Array<{ step: number; title: string; instruction: string }>;
  tips: string[];
  image_url: string;
}

type DifficultyTone = 'sage' | 'gold' | 'rose';
const DIFFICULTY_TONE: Record<string, DifficultyTone> = {
  'débutant': 'sage',
  'intermédiaire': 'gold',
  'avancé': 'rose',
};

const CATEGORY_LABELS: Record<string, string> = {
  bonnet: 'Bonnet', echarpe: 'Écharpe', pull: 'Vêtement',
  couverture: 'Couverture', chaussettes: 'Chaussettes', accessoire: 'Accessoire',
  robe: 'Robe', top: 'Top', maillot: 'Maillot', bebe: 'Bébé',
};

/* ─── External store links ─── */

function openAmazonSearch(term: string) {
  const q = encodeURIComponent(`laine tricot ${term.replace(/,/g, ' ').trim()}`);
  Linking.openURL(`https://www.amazon.fr/s?k=${q}`);
}

function openAmazonNeedleSearch(type: string, size: string) {
  const q = encodeURIComponent(`${type} ${size} tricot`);
  Linking.openURL(`https://www.amazon.fr/s?k=${q}`);
}

function openHobbiiSearch(term: string) {
  const q = encodeURIComponent(term.replace(/,/g, ' ').trim());
  Linking.openURL(`https://hobbii.fr/catalogsearch/result/?q=${q}`);
}

function openLouPassionSearch(term: string) {
  const q = encodeURIComponent(term.replace(/,/g, ' ').trim());
  Linking.openURL(`https://loupassion.com/?s=${q}&post_type=product`);
}

/* ─── Main screen ─── */

export default function PatternDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'steps' | 'tips'>('materials');
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

  async function loadFeedback() {
    if (!id) return;
    const [counts, cmts] = await Promise.all([getFeedbackCounts(id), getComments(id)]);
    setLikes(counts.likes);
    setComments(cmts);
  }

  async function handleLike() {
    if (hasLiked || !id) return;
    setHasLiked(true);
    setLikes((l) => l + 1);
    await submitFeedback({ patternId: id, type: 'like' });
  }

  async function handleComment() {
    if (!newComment.trim() || !id) return;
    setCommentLoading(true);
    await submitFeedback({ patternId: id, comment: newComment.trim() });
    setNewComment('');
    const cmts = await getComments(id);
    setComments(cmts);
    setCommentLoading(false);
  }

  async function handleShare() {
    if (!pattern) return;
    try {
      await Share.share({
        title: pattern.name,
        message: `Découvre ce patron de tricot : ${pattern.name} — ${pattern.description}`,
      });
    } catch {}
  }

  async function fetchPattern() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/patterns/${id}`);
      if (response.ok) {
        setPattern(await response.json());
      }
    } catch (error) {
      console.error('Error fetching pattern:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function askJulie() {
    if (!pattern) return;
    router.push({
      pathname: '/chat',
      params: { question: `J'aimerais des conseils pour réaliser le patron "${pattern.name}". Peux-tu m'aider ?` },
    });
  }

  /* ─── Loading / Error states ─── */

  if (isLoading) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.blushDeep} />
          <Text style={styles.centerText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!pattern) {
    return (
      <SafeAreaView style={styles.page}>
        <Header title="Patron" back />
        <View style={styles.center}>
          <Text style={styles.centerText}>Patron non trouvé</Text>
        </View>
      </SafeAreaView>
    );
  }

  const difficultyTone = DIFFICULTY_TONE[pattern.difficulty] || 'neutral';

  /* ─── UI ─── */

  return (
    <SafeAreaView style={styles.page}>
      <Header
        title={pattern.name}
        back
        right={
          <TouchableOpacity onPress={askJulie} accessibilityLabel="Demander conseil à Julie">
            <Ionicons name="sparkles" size={22} color={colors.blushDeep} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Image */}
        {pattern.image_url && pattern.image_url.startsWith('http') && (
          <View style={styles.imageWrap}>
            <Image source={{ uri: pattern.image_url }} style={styles.image} resizeMode="cover" />
          </View>
        )}

        {/* Header info */}
        <View style={styles.info}>
          <Text style={styles.patternName}>{pattern.name}</Text>
          <Text style={styles.patternDesc}>{pattern.description}</Text>

          <View style={styles.badges}>
            <Badge label={CATEGORY_LABELS[pattern.category] || pattern.category} tone="gold" />
            <Badge label={pattern.difficulty} tone={difficultyTone} />
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={styles.timeText}>{pattern.estimated_time}</Text>
            </View>
          </View>
        </View>

        {/* Sizes */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Tailles disponibles</Text>
          {Object.entries(pattern.sizes).map(([size, desc]) => (
            <View key={size} style={styles.sizeRow}>
              <Text style={styles.sizeLabel}>{size}</Text>
              <Text style={styles.sizeDesc}>{desc}</Text>
            </View>
          ))}
        </Card>

        {/* Gauge */}
        <Card style={styles.gaugeCard}>
          <Ionicons name="grid-outline" size={20} color={colors.blushDeep} />
          <View style={styles.gaugeInfo}>
            <Text style={styles.gaugeLabel}>Échantillon</Text>
            <Text style={styles.gaugeValue}>{pattern.gauge}</Text>
          </View>
        </Card>

        {/* Action bar: likes, comments, share, instagram */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Ionicons
              name={hasLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={hasLiked ? colors.danger : colors.textMuted}
            />
            <Text style={[styles.actionText, hasLiked && { color: colors.danger }]}>{likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments((v) => !v)}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
            <Text style={styles.actionText}>{comments.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={colors.textMuted} />
            <Text style={styles.actionText}>Partager</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL('https://www.instagram.com/djeminie972/')}
          >
            <Ionicons name="logo-instagram" size={20} color="#C13584" />
            <Text style={[styles.actionText, { color: '#C13584' }]}>Julie</Text>
          </TouchableOpacity>
        </View>

        {/* Comments section */}
        {showComments && (
          <Card style={styles.section}>
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Laisser un commentaire..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, !newComment.trim() && { opacity: 0.4 }]}
                onPress={handleComment}
                disabled={commentLoading || !newComment.trim()}
              >
                <Ionicons name="send" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
            {comments.length === 0 ? (
              <Text style={styles.noComment}>Soyez le premier à commenter !</Text>
            ) : (
              comments.map((c, i) => (
                <View key={i} style={styles.commentItem}>
                  <Ionicons name="person-circle-outline" size={22} color={colors.blushDeep} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.commentText}>{c.comment}</Text>
                    <Text style={styles.commentDate}>
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card>
        )}

        {/* Tabs: Matériel / Étapes / Astuces */}
        <View style={styles.tabsRow}>
          {(['materials', 'steps', 'tips'] as const).map((tab) => {
            const icons = { materials: 'cube-outline', steps: 'list-outline', tips: 'bulb-outline' } as const;
            const labels = { materials: 'Matériel', steps: 'Étapes', tips: 'Astuces' };
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={icons[tab] as any}
                  size={16}
                  color={active ? colors.white : colors.blushDeep}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 'materials' && (
            <>
              {/* Yarn */}
              <Card style={styles.materialCard}>
                <View style={styles.materialHeader}>
                  <Ionicons name="color-palette-outline" size={22} color={colors.blushDeep} />
                  <Text style={styles.materialTitle}>Laine</Text>
                </View>
                <DetailRow label="Type" value={pattern.materials.yarn.type} />
                <DetailRow label="Poids" value={pattern.materials.yarn.weight} />
                <DetailRow label="Quantité" value={pattern.materials.yarn.quantity} />
                <View style={styles.recommendedBox}>
                  <Text style={styles.recommendedLabel}>Recommandé</Text>
                  <Text style={styles.recommendedValue}>{pattern.materials.yarn.recommended}</Text>
                </View>
                <TouchableOpacity
                  style={styles.amazonBtn}
                  onPress={() => openAmazonSearch(pattern.materials.yarn.recommended || pattern.materials.yarn.type)}
                >
                  <Ionicons name="cart-outline" size={16} color={colors.white} />
                  <Text style={styles.storeBtnText}>Amazon</Text>
                  <Ionicons name="open-outline" size={14} color={colors.white} />
                </TouchableOpacity>
                <View style={styles.storeRow}>
                  <TouchableOpacity
                    style={[styles.storeBtn, { backgroundColor: '#E74C3C' }]}
                    onPress={() => openHobbiiSearch(pattern.materials.yarn.type)}
                  >
                    <Text style={styles.storeBtnText}>Hobbii</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.storeBtn, { backgroundColor: '#9B59B6' }]}
                    onPress={() => openLouPassionSearch(pattern.materials.yarn.type)}
                  >
                    <Text style={styles.storeBtnText}>Lou Passion</Text>
                  </TouchableOpacity>
                </View>
              </Card>

              {/* Needles */}
              <Card style={styles.materialCard}>
                <View style={styles.materialHeader}>
                  <Ionicons name="construct-outline" size={22} color={colors.blushDeep} />
                  <Text style={styles.materialTitle}>Aiguilles / Crochet</Text>
                </View>
                <DetailRow label="Type" value={pattern.materials.needles.type} />
                <DetailRow label="Taille" value={pattern.materials.needles.size} />
                {pattern.materials.needles.cable_length !== 'N/A' && (
                  <DetailRow label="Câble" value={pattern.materials.needles.cable_length} />
                )}
                <TouchableOpacity
                  style={styles.amazonBtn}
                  onPress={() => openAmazonNeedleSearch(pattern.materials.needles.type, pattern.materials.needles.size)}
                >
                  <Ionicons name="cart-outline" size={16} color={colors.white} />
                  <Text style={styles.storeBtnText}>Acheter sur Amazon</Text>
                  <Ionicons name="open-outline" size={14} color={colors.white} />
                </TouchableOpacity>
              </Card>

              {/* Accessories */}
              <Card style={styles.materialCard}>
                <View style={styles.materialHeader}>
                  <Ionicons name="bag-outline" size={22} color={colors.blushDeep} />
                  <Text style={styles.materialTitle}>Accessoires</Text>
                </View>
                {pattern.materials.accessories.map((acc, i) => (
                  <View key={i} style={styles.accessoryRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.sage} />
                    <Text style={styles.accessoryText}>{acc}</Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {activeTab === 'steps' &&
            pattern.steps.map((step) => (
              <View key={step.step} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.step}</Text>
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepInstruction}>{step.instruction}</Text>
                </View>
              </View>
            ))}

          {activeTab === 'tips' &&
            pattern.tips.map((tip, i) => (
              <View key={i} style={styles.tipCard}>
                <Ionicons name="bulb" size={18} color={colors.gold} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
        </View>

        {/* Ask Julie CTA */}
        <TouchableOpacity style={styles.askJulie} onPress={askJulie} accessibilityRole="button">
          <Ionicons name="sparkles" size={20} color={colors.white} />
          <Text style={styles.askJulieText}>Demander conseil à Julie</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Small sub-component ─── */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xxxl,
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 14, color: colors.textMuted, marginTop: spacing.md },

  /* Image */
  imageWrap: { width: '100%', height: 220, backgroundColor: colors.blushSoft },
  image: { width: '100%', height: '100%' },

  /* Info header */
  info: { padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.line },
  patternName: {
    fontFamily: fonts.display, fontSize: 26, fontWeight: '700',
    color: colors.text, marginBottom: spacing.sm,
  },
  patternDesc: { fontSize: 15, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 13, color: colors.textMuted },

  /* Section cards */
  section: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: {
    fontFamily: fonts.display, fontSize: 16, fontWeight: '700',
    color: colors.blushDeep, marginBottom: spacing.md,
  },
  sizeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  sizeLabel: { fontSize: 14, fontWeight: '700', color: colors.text, width: 60 },
  sizeDesc: { fontSize: 14, color: colors.textMuted, flex: 1 },

  /* Gauge */
  gaugeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: colors.goldSoft, borderWidth: 0,
  },
  gaugeInfo: { flex: 1 },
  gaugeLabel: { fontSize: 12, color: colors.gold, fontWeight: '700' },
  gaugeValue: { fontSize: 14, color: colors.text, marginTop: 2 },

  /* Action bar */
  actionBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radii.md,
    paddingVertical: spacing.md, ...shadows.soft,
  },
  actionBtn: { alignItems: 'center', gap: 3, paddingHorizontal: spacing.md },
  actionText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },

  /* Comments */
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  commentInput: {
    flex: 1, backgroundColor: colors.cream, borderRadius: radii.sm,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: colors.text, maxHeight: 80,
  },
  commentSendBtn: {
    width: 38, height: 38, borderRadius: radii.sm,
    backgroundColor: colors.blushDeep, alignItems: 'center', justifyContent: 'center',
  },
  noComment: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm },
  commentItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  commentText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  commentDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  /* Tabs */
  tabsRow: {
    flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radii.md, padding: 4, ...shadows.soft,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, borderRadius: radii.sm, gap: 5,
  },
  tabActive: { backgroundColor: colors.blushDeep },
  tabText: { fontSize: 13, color: colors.blushDeep, fontWeight: '600' },
  tabTextActive: { color: colors.white, fontWeight: '700' },
  tabContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  /* Materials */
  materialCard: { marginBottom: spacing.md },
  materialHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  materialTitle: { fontFamily: fonts.display, fontSize: 16, fontWeight: '700', color: colors.text },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  detailLabel: { fontSize: 14, color: colors.textMuted },
  detailValue: { fontSize: 14, color: colors.text, flex: 1, textAlign: 'right', marginLeft: spacing.md },
  recommendedBox: {
    backgroundColor: colors.goldSoft, borderRadius: radii.sm, padding: spacing.md, marginTop: spacing.sm,
  },
  recommendedLabel: { fontSize: 12, color: colors.gold, fontWeight: '700', marginBottom: 3 },
  recommendedValue: { fontSize: 13, color: colors.text },
  amazonBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF9900', borderRadius: radii.sm,
    paddingVertical: spacing.md, marginTop: spacing.md, gap: spacing.sm,
  },
  storeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  storeBtn: { flex: 1, borderRadius: radii.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  storeBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },

  /* Accessories */
  accessoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  accessoryText: { fontSize: 14, color: colors.text },

  /* Steps */
  stepCard: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md, ...shadows.soft,
  },
  stepNumber: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.blushDeep, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: { fontSize: 15, fontWeight: '800', color: colors.white },
  stepBody: { flex: 1 },
  stepTitle: {
    fontFamily: fonts.display, fontSize: 15, fontWeight: '700',
    color: colors.text, marginBottom: 4,
  },
  stepInstruction: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },

  /* Tips */
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.goldSoft, borderRadius: radii.md,
    padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md,
  },
  tipText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },

  /* Ask Julie CTA */
  askJulie: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.blushDeep, marginHorizontal: spacing.lg,
    marginTop: spacing.lg, marginBottom: spacing.xl,
    paddingVertical: spacing.lg, borderRadius: radii.md, gap: spacing.sm,
  },
  askJulieText: { fontSize: 16, fontWeight: '700', color: colors.white },
});

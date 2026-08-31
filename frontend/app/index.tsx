import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import BottomTab from './components/BottomTab';
import Card from './components/Card';
import Badge from './components/Badge';
import { adminFetch, isAdmin, lockAdmin, unlockAdmin } from './services/adminAccess';
import { colors, fonts, layout, radii, shadows, spacing } from './theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Creation {
  id: string;
  title: string;
  image_base64?: string;
  available: boolean;
  price?: string;
}

interface Shortcut {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route: string;
  tint: string;
}

const shortcuts: Shortcut[] = [
  { icon: 'images-outline', title: 'Galerie', description: 'Mes créations', route: '/gallery', tint: colors.blushDeep },
  { icon: 'book-outline', title: 'Patrons', description: '44 idées guidées', route: '/patterns', tint: colors.sage },
  { icon: 'chatbubble-ellipses-outline', title: 'Chat Julie', description: 'Un conseil tricot', route: '/chat', tint: colors.gold },
  { icon: 'folder-open-outline', title: 'Mes projets', description: 'Suivre mes ouvrages', route: '/projects', tint: '#A989A1' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const [creations, setCreations] = useState<Creation[]>([]);
  const [unread, setUnread] = useState(0);
  const [secretTaps, setSecretTaps] = useState(0);
  const [loginVisible, setLoginVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [admin, setAdmin] = useState(() => isAdmin());

  useEffect(() => {
    fetchCreations();
    if (admin) fetchUnreadCount();
  }, [admin]);

  async function fetchCreations() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gallery`);
      if (res.ok) {
        const data = await res.json();
        setCreations(data.slice(0, 6));
      }
    } catch {
      // API indisponible — la galerie restera vide
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await adminFetch(`${BACKEND_URL}/api/messages/count`);
      if (res.ok) {
        const data = await res.json();
        setUnread(data.unread_count);
      }
    } catch {
      // Silencieux — pas critique
    }
  }

  function handleSecretTap() {
    const next = secretTaps + 1;
    if (next >= 5) {
      setLoginVisible(true);
      setSecretTaps(0);
    } else {
      setSecretTaps(next);
    }
  }

  async function handleLogin() {
    if (await unlockAdmin(password)) {
      setAdmin(true);
      setLoginVisible(false);
      setPassword('');
      setLoginError(false);
    } else {
      setPassword('');
      setLoginError(true);
    }
  }

  function handleLogout() {
    lockAdmin();
    setAdmin(false);
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
          {/* Hero */}
          <View style={styles.hero}>
            <LinearGradient
              colors={['#1A1A1A', '#2A2A1A', '#1A2A1A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              {/* Illustration laine = zone secret tap admin */}
              <TouchableOpacity
                onPress={handleSecretTap}
                activeOpacity={0.9}
                style={styles.heroYarn}
                accessibilityLabel="Illustration laine"
              >
                <Text style={styles.heroYarnText}>🧶</Text>
              </TouchableOpacity>

              <Badge label="Fait main avec amour" tone="rose" />
              <Text style={styles.eyebrow}>JULIE CRÉATIONS</Text>
              <Text style={styles.heroTitle}>
                Des mailles, des couleurs, une histoire.
              </Text>
              <Text style={styles.heroText}>
                Bienvenue dans mon univers de tricot et crochet, imaginé avec patience en Martinique.
              </Text>

              {/* Bouton qui navigue réellement vers la galerie */}
              <TouchableOpacity
                style={styles.heroButton}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Découvrir la galerie"
                onPress={() => router.push('/gallery' as any)}
              >
                <Text style={styles.heroButtonText}>Découvrir la galerie</Text>
                <Ionicons name="arrow-forward" size={17} color={colors.white} />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Barre admin (visible uniquement si connecté) */}
          {admin && (
            <View style={styles.adminRow}>
              <TouchableOpacity
                style={styles.adminButton}
                accessibilityRole="button"
                onPress={() => router.push('/admin' as any)}
              >
                <Ionicons name="sparkles" size={16} color={colors.blushDeep} />
                <Text style={styles.adminText}>Espace Julie</Text>
                {unread > 0 && (
                  <Badge
                    label={`${unread} nouveau${unread > 1 ? 'x' : ''}`}
                    tone="rose"
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.lock}
                accessibilityRole="button"
                accessibilityLabel="Se déconnecter"
                onPress={handleLogout}
              >
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Raccourcis */}
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.kicker}>POUR CRÉER</Text>
              <Text style={styles.sectionTitle}>Que souhaitez-vous faire ?</Text>
            </View>
          </View>

          <View style={styles.quickGrid}>
            {shortcuts.map((s) => (
              <TouchableOpacity
                key={s.route}
                style={[styles.quickCard, { width: wide ? '23.5%' : '48%' }]}
                accessibilityRole="button"
                onPress={() => router.push(s.route as any)}
              >
                <View style={[styles.quickIcon, { backgroundColor: `${s.tint}22` }]}>
                  <Ionicons name={s.icon} size={25} color={s.tint} />
                </View>
                <Text style={styles.quickTitle}>{s.title}</Text>
                <Text style={styles.quickText}>{s.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dernières créations */}
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.kicker}>DERNIÈRES PIÈCES</Text>
              <Text style={styles.sectionTitle}>Fraîchement tombées des aiguilles</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/gallery' as any)}>
              <Text style={styles.seeAll}>Tout voir</Text>
            </TouchableOpacity>
          </View>

          {creations.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              {creations.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.creation}
                  activeOpacity={0.88}
                  onPress={() => router.push({ pathname: '/gallery-detail', params: { id: c.id } })}
                >
                  {c.image_base64 ? (
                    <Image source={{ uri: c.image_base64 }} style={styles.creationImage} />
                  ) : (
                    <View style={styles.creationPlaceholder}>
                      <Text style={styles.placeholderEmoji}>🧶</Text>
                    </View>
                  )}
                  <View style={styles.creationCopy}>
                    <Text style={styles.creationTitle} numberOfLines={1}>
                      {c.title}
                    </Text>
                    <Badge
                      label={c.available ? 'Disponible' : 'Vendu'}
                      tone={c.available ? 'sage' : 'neutral'}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Card style={styles.empty}>
              <Text style={styles.emptyEmoji}>🧵</Text>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>La galerie se prépare</Text>
                <Text style={styles.emptyText}>
                  Les vraies créations de Julie trouveront bientôt leur place ici.
                </Text>
              </View>
              {admin && (
                <TouchableOpacity onPress={() => router.push('/gallery' as any)}>
                  <Text style={styles.seeAll}>Ajouter une photo</Text>
                </TouchableOpacity>
              )}
            </Card>
          )}

          {/* Mon histoire */}
          <Card style={styles.story}>
            <View style={styles.storyAvatar}>
              <Text style={styles.storyEmoji}>🌸</Text>
            </View>
            <View style={styles.storyCopy}>
              <Text style={styles.kicker}>MON HISTOIRE</Text>
              <Text style={styles.storyTitle}>Moi, c'est Julie</Text>
              <Text style={styles.storyText}>
                Je transforme fils et couleurs en pièces uniques, pensées pour faire plaisir et durer.
              </Text>
              <TouchableOpacity onPress={() => router.push('/contact' as any)}>
                <Text style={styles.storyLink}>Faire connaissance →</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </ScrollView>

      <BottomTab />

      {/* Modal login admin */}
      <Modal visible={loginVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setLoginVisible(false)}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Espace privé de Julie</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(t) => { setPassword(t); setLoginError(false); }}
              placeholder="Mot de passe"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoFocus
              onSubmitEditing={handleLogin}
            />
            {loginError && (
              <Text style={styles.error}>Mot de passe incorrect</Text>
            )}
            <TouchableOpacity
              style={styles.signIn}
              accessibilityRole="button"
              onPress={handleLogin}
            >
              <Text style={styles.signInText}>Entrer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: layout.bottomTabSpace },
  content: { width: '100%', alignSelf: 'center', padding: layout.pagePadding },

  hero: { borderRadius: radii.xl, overflow: 'hidden', ...shadows.soft },
  heroGradient: { minHeight: 360, padding: spacing.xl, justifyContent: 'flex-end' },
  heroYarn: {
    position: 'absolute', right: 18, top: 16,
    width: 116, height: 116, borderRadius: 58,
    backgroundColor: 'rgba(255,255,255,.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroYarnText: { fontSize: 62 },
  eyebrow: {
    marginTop: spacing.md, fontSize: 11,
    letterSpacing: 2.5, fontWeight: '800', color: colors.blushDeep,
  },
  heroTitle: {
    fontFamily: fonts.display, fontSize: 34, lineHeight: 39,
    color: colors.text, maxWidth: 540, marginTop: spacing.sm, fontWeight: '700',
  },
  heroText: {
    fontSize: 15, lineHeight: 22,
    color: colors.textMuted, maxWidth: 500, marginTop: spacing.md,
  },
  heroButton: {
    alignSelf: 'flex-start', marginTop: spacing.lg,
    backgroundColor: colors.blushDeep, borderRadius: radii.round,
    paddingHorizontal: spacing.lg, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  heroButtonText: { color: colors.white, fontWeight: '800' },

  adminRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  adminButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md,
  },
  adminText: { color: colors.text, fontWeight: '700', flex: 1 },
  lock: {
    width: 48, backgroundColor: colors.surface,
    borderRadius: radii.md, alignItems: 'center', justifyContent: 'center',
  },

  sectionHead: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginTop: spacing.xxl, marginBottom: spacing.md,
  },
  kicker: { fontSize: 10, letterSpacing: 2, color: colors.blushDeep, fontWeight: '900' },
  sectionTitle: {
    fontFamily: fonts.display, fontSize: 24,
    color: colors.text, fontWeight: '700', marginTop: 3,
  },
  seeAll: { color: colors.blushDeep, fontWeight: '800', fontSize: 13 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md },
  quickCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.lg, minHeight: 142, ...shadows.soft,
  },
  quickIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  quickTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.text, fontWeight: '700' },
  quickText: { fontSize: 12, color: colors.textMuted, marginTop: 4 },

  carousel: { gap: spacing.md, paddingBottom: spacing.md },
  creation: {
    width: 210, backgroundColor: colors.surface,
    borderRadius: radii.lg, overflow: 'hidden', ...shadows.soft,
  },
  creationImage: { width: '100%', height: 210 },
  creationPlaceholder: {
    height: 210, backgroundColor: colors.blushSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 52 },
  creationCopy: { padding: spacing.md, gap: spacing.sm },
  creationTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 17, fontWeight: '700' },

  empty: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyEmoji: { fontSize: 38 },
  emptyCopy: { flex: 1 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text, fontWeight: '700' },
  emptyText: { fontSize: 13, color: colors.textMuted, marginTop: 3 },

  story: { marginTop: spacing.xxl, flexDirection: 'row', gap: spacing.lg, backgroundColor: colors.sageSoft },
  storyAvatar: {
    width: 88, height: 110, borderRadius: radii.lg,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  storyEmoji: { fontSize: 42 },
  storyCopy: { flex: 1 },
  storyTitle: {
    fontFamily: fonts.display, fontSize: 24,
    color: colors.text, fontWeight: '700', marginTop: 3,
  },
  storyText: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: spacing.sm },
  storyLink: { color: '#587047', fontWeight: '800', marginTop: spacing.md },

  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  modal: {
    backgroundColor: colors.surface, borderRadius: radii.xl,
    padding: spacing.xl, maxWidth: 420, width: '100%', alignSelf: 'center',
  },
  modalTitle: {
    fontFamily: fonts.display, fontSize: 22,
    color: colors.text, fontWeight: '700', marginBottom: spacing.lg,
  },
  input: { backgroundColor: colors.cream, borderRadius: radii.md, padding: spacing.lg, color: colors.text },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  signIn: {
    backgroundColor: colors.blushDeep, borderRadius: radii.round,
    alignItems: 'center', padding: 13, marginTop: spacing.lg,
  },
  signInText: { color: colors.white, fontWeight: '800' },
});

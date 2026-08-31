import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import Badge from './components/Badge';
import BottomTab from './components/BottomTab';
import Header from './components/Header';
import { adminFetch, isAdmin } from './services/adminAccess';
import { colors, fonts, layout, radii, shadows, spacing } from './theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

interface CategoryFilter {
  value: string;
  label: string;
}

const categories: CategoryFilter[] = [
  { value: 'all', label: 'Tout' },
  { value: 'bonnet', label: 'Bonnets' },
  { value: 'echarpe', label: 'Écharpes' },
  { value: 'pull', label: 'Pulls' },
  { value: 'couverture', label: 'Couvertures' },
  { value: 'accessoire', label: 'Accessoires' },
  { value: 'autre', label: 'Autres' },
];

const blankForm = {
  title: '',
  description: '',
  category: 'bonnet',
  price: '',
  available: true,
  featured: false,
};

/* ─── Sub-components ─── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <View>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.sage }}
        thumbColor={colors.white}
      />
    </View>
  );
}

/* ─── Main screen ─── */

export default function GalleryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const admin = isAdmin();

  // Grid layout
  const columns = width >= 900 ? 3 : 2;
  const gap = 12;
  const contentWidth = Math.min(width, layout.maxContentWidth) - layout.pagePadding * 2;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;

  // State
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);

  const loadItems = useCallback(async () => {
    try {
      const url =
        category === 'all'
          ? `${BACKEND_URL}/api/gallery`
          : `${BACKEND_URL}/api/gallery?category=${category}`;
      const res = await fetch(url);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (e) {
      console.error('Gallery fetch failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.75,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  async function createItem() {
    if (!form.title.trim()) {
      Alert.alert('Titre manquant', 'Donnez un nom à cette création.');
      return;
    }
    try {
      const res = await adminFetch(`${BACKEND_URL}/api/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, image_base64: selectedImage }),
      });
      if (!res.ok) throw new Error();
      setModalVisible(false);
      setForm(blankForm);
      setSelectedImage(null);
      loadItems();
    } catch {
      Alert.alert('Oups', "La création n'a pas pu être ajoutée.");
    }
  }

  function removeItem(id: string) {
    if (!admin) return;
    Alert.alert('Supprimer cette création ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await adminFetch(`${BACKEND_URL}/api/gallery/${id}`, { method: 'DELETE' });
          loadItems();
        },
      },
    ]);
  }

  function handleRefresh() {
    setRefreshing(true);
    loadItems();
  }

  const placeholderEmojis = ['🧣', '🧶', '🪡', '🌸'];

  return (
    <SafeAreaView style={styles.page}>
      <Header
        title="La galerie"
        subtitle="Les créations de Julie"
        back
        right={
          admin ? (
            <TouchableOpacity
              accessibilityLabel="Ajouter une création"
              accessibilityRole="button"
              onPress={() => setModalVisible(true)}
              style={styles.add}
            >
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Intro */}
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Des pièces uniques, maille après maille.</Text>
        <Text style={styles.introText}>Découvrez les ouvrages réalisés à la main par Julie.</Text>
      </View>

      {/* Filtres catégorie */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {categories.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.filter, category === c.value && styles.filterActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: category === c.value }}
              onPress={() => setCategory(c.value)}
            >
              <Text style={[styles.filterText, category === c.value && styles.filterTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grille */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.grid, { maxWidth: layout.maxContentWidth }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.blushDeep}
          />
        }
      >
        {!loading && items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyEmoji}>🧶</Text>
            </View>
            <Text style={styles.emptyTitle}>Les étagères se préparent</Text>
            <Text style={styles.emptyText}>
              Julie ajoutera bientôt ici les photos de ses créations.
            </Text>
            {admin && (
              <TouchableOpacity
                style={styles.primary}
                accessibilityRole="button"
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="camera-outline" size={18} color={colors.white} />
                <Text style={styles.primaryText}>Ajouter la première création</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.cards}>
            {items.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { width: cardWidth }]}
                activeOpacity={0.88}
                onPress={() => router.push({ pathname: '/gallery-detail', params: { id: item.id } })}
                onLongPress={admin ? () => removeItem(item.id) : undefined}
              >
                {item.image_base64 ? (
                  <Image
                    source={{ uri: item.image_base64 }}
                    style={[styles.image, { height: index % 3 === 0 ? cardWidth * 1.28 : cardWidth }]}
                  />
                ) : (
                  <View
                    style={[styles.placeholder, { height: index % 3 === 0 ? cardWidth * 1.28 : cardWidth }]}
                  >
                    <Text style={styles.placeholderEmoji}>
                      {placeholderEmojis[index % placeholderEmojis.length]}
                    </Text>
                    <Text style={styles.placeholderText}>Photo à venir</Text>
                  </View>
                )}

                {item.featured && (
                  <View style={styles.featured}>
                    <Ionicons name="sparkles" size={13} color={colors.text} />
                    <Text style={styles.featuredText}>Coup de cœur</Text>
                  </View>
                )}

                <View style={styles.copy}>
                  <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                  {item.price ? <Text style={styles.price}>{item.price}</Text> : null}
                  <Badge
                    label={item.available ? 'Disponible' : 'Vendu'}
                    tone={item.available ? 'sage' : 'neutral'}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomTab />

      {/* Modal ajout création */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalPage}>
          <Header
            title="Nouvelle création"
            right={
              <TouchableOpacity accessibilityRole="button" onPress={createItem}>
                <Text style={styles.save}>Ajouter</Text>
              </TouchableOpacity>
            }
          />
          <ScrollView contentContainerStyle={styles.form}>
            {/* Photo picker */}
            <TouchableOpacity style={styles.picker} onPress={pickImage}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.picked} />
              ) : (
                <>
                  <View style={styles.camera}>
                    <Ionicons name="camera-outline" size={28} color={colors.blushDeep} />
                  </View>
                  <Text style={styles.pickerTitle}>Choisir une belle photo</Text>
                  <Text style={styles.hint}>Format vertical conseillé</Text>
                </>
              )}
            </TouchableOpacity>

            <Field label="Titre *">
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(title) => setForm({ ...form, title })}
                placeholder="Ex. Bonnet torsadé rose"
                placeholderTextColor={colors.textMuted}
              />
            </Field>

            <Field label="Description">
              <TextInput
                style={[styles.input, styles.area]}
                value={form.description}
                onChangeText={(description) => setForm({ ...form, description })}
                placeholder="L'histoire, la matière, les détails…"
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </Field>

            <Field label="Catégorie">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.options}
              >
                {categories.slice(1).map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.option, form.category === c.value && styles.optionActive]}
                    onPress={() => setForm({ ...form, category: c.value })}
                  >
                    <Text style={[styles.optionText, form.category === c.value && styles.optionTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Field>

            <Field label="Prix indicatif">
              <TextInput
                style={styles.input}
                value={form.price}
                onChangeText={(price) => setForm({ ...form, price })}
                placeholder="Ex. 35 €"
                placeholderTextColor={colors.textMuted}
              />
            </Field>

            <Toggle
              label="Disponible"
              hint="La création peut être commandée"
              value={form.available}
              onChange={(available) => setForm({ ...form, available })}
            />
            <Toggle
              label="Mettre en avant"
              hint="Afficher comme coup de cœur"
              value={form.featured}
              onChange={(featured) => setForm({ ...form, featured })}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },

  intro: {
    paddingHorizontal: layout.pagePadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  introTitle: {
    fontFamily: fonts.display, fontSize: 27, lineHeight: 32,
    fontWeight: '700', color: colors.text,
  },
  introText: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm },

  add: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.blushDeep, alignItems: 'center', justifyContent: 'center',
  },

  filterWrap: { height: 52 },
  filters: { paddingHorizontal: layout.pagePadding, gap: spacing.sm },
  filter: {
    height: 36, paddingHorizontal: spacing.lg, borderRadius: radii.round,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  filterActive: { backgroundColor: colors.blushDeep },
  filterText: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
  filterTextActive: { color: colors.white },

  scroll: { flex: 1 },
  grid: {
    padding: layout.pagePadding, paddingBottom: layout.bottomTabSpace,
    width: '100%', alignSelf: 'center',
  },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden', ...shadows.soft },
  image: { width: '100%' },
  placeholder: { backgroundColor: colors.blushSoft, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 43 },
  placeholderText: { fontSize: 11, color: colors.textMuted, marginTop: spacing.sm },
  featured: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    backgroundColor: 'rgba(255,248,240,.92)', borderRadius: radii.round,
    paddingHorizontal: spacing.sm, paddingVertical: 5, flexDirection: 'row', gap: 4, alignItems: 'center',
  },
  featuredText: { fontSize: 10, fontWeight: '800', color: colors.text },
  copy: { padding: spacing.md, gap: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, fontWeight: '700', color: colors.text },
  price: { fontSize: 15, fontWeight: '800', color: colors.blushDeep },

  empty: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.blushSoft, alignItems: 'center', justifyContent: 'center',
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontFamily: fonts.display, fontSize: 25, fontWeight: '700',
    color: colors.text, marginTop: spacing.lg,
  },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  primary: {
    marginTop: spacing.xl, backgroundColor: colors.blushDeep, borderRadius: radii.round,
    paddingHorizontal: spacing.lg, paddingVertical: 12, flexDirection: 'row', gap: spacing.sm, alignItems: 'center',
  },
  primaryText: { color: colors.white, fontWeight: '800' },

  modalPage: { flex: 1, backgroundColor: colors.cream },
  save: { color: colors.blushDeep, fontWeight: '800' },
  form: {
    padding: layout.pagePadding, paddingBottom: spacing.xxxl,
    maxWidth: 650, width: '100%', alignSelf: 'center',
  },
  picker: {
    height: 260, borderRadius: radii.xl, backgroundColor: colors.blushSoft,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: spacing.xl,
  },
  picked: { width: '100%', height: '100%' },
  camera: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  pickerTitle: {
    fontFamily: fonts.display, fontSize: 18, fontWeight: '700',
    color: colors.text, marginTop: spacing.md,
  },

  field: { marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface, borderRadius: radii.md,
    padding: spacing.lg, fontSize: 15, color: colors.text,
  },
  area: { height: 110, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  options: { gap: spacing.sm },
  option: {
    backgroundColor: colors.surface, borderRadius: radii.round,
    paddingHorizontal: spacing.lg, paddingVertical: 10,
  },
  optionActive: { backgroundColor: colors.blushDeep },
  optionText: { color: colors.textMuted, fontWeight: '700' },
  optionTextActive: { color: colors.white },
  toggle: {
    backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg,
    marginBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  toggleLabel: { fontWeight: '800', color: colors.text },
});

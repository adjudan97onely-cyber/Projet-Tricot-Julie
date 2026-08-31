import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomTab from './components/BottomTab';
import Header from './components/Header';
import { colors, fonts, layout, radii, shadows, spacing } from './theme';

interface MenuLink {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
}

const links: MenuLink[] = [
  { icon: 'construct-outline', title: 'Outils', subtitle: 'Compteur, calculateur, timer', route: '/tools' },
  { icon: 'folder-open-outline', title: 'Mes projets', subtitle: 'Suivre mes ouvrages en cours', route: '/projects' },
  { icon: 'library-outline', title: 'Lexique', subtitle: '39 termes tricot & crochet', route: '/lexique' },
  { icon: 'play-circle-outline', title: 'Tutoriels', subtitle: '11 tutos pas-à-pas avec vidéo', route: '/tutorials' },
  { icon: 'resize-outline', title: 'Guide des tailles', subtitle: 'Mesures par âge et catégorie', route: '/size-guide' },
  { icon: 'mail-outline', title: 'Contact', subtitle: 'Envoyer un message à Julie', route: '/contact' },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.page}>
      <Header title="Plus" subtitle="Tout le reste" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
          {links.map((link) => (
            <TouchableOpacity
              key={link.route}
              style={styles.row}
              accessibilityRole="button"
              onPress={() => router.push(link.route as any)}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={link.icon} size={22} color={colors.blushDeep} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{link.title}</Text>
                <Text style={styles.subtitle}>{link.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <BottomTab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: layout.bottomTabSpace },
  content: { width: '100%', alignSelf: 'center', padding: layout.pagePadding },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...shadows.soft,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.blushSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  copy: { flex: 1 },
  title: {
    fontFamily: fonts.display, fontSize: 17,
    fontWeight: '700', color: colors.text,
  },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});

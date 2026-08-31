import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../theme';

interface Tab {
  route: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: keyof typeof Ionicons.glyphMap;
}

const tabs: Tab[] = [
  { route: '/', label: 'Accueil', icon: 'home-outline', active: 'home' },
  { route: '/gallery', label: 'Galerie', icon: 'images-outline', active: 'images' },
  { route: '/chat', label: 'Chat', icon: 'chatbubble-ellipses-outline', active: 'chatbubble-ellipses' },
  { route: '/patterns', label: 'Patrons', icon: 'book-outline', active: 'book' },
  { route: '/more', label: 'Plus', icon: 'grid-outline', active: 'grid' },
];

export default function BottomTab() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const selected =
          pathname === tab.route ||
          (tab.route !== '/' && pathname.startsWith(tab.route));

        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => router.replace(tab.route as any)}
          >
            <View style={[styles.icon, selected && styles.iconSelected]}>
              <Ionicons
                name={selected ? tab.active : tab.icon}
                size={21}
                color={selected ? colors.white : colors.textMuted}
              />
            </View>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 24 : 9,
    paddingHorizontal: spacing.xs,
    ...shadows.soft,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  icon: {
    width: 42,
    height: 30,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: {
    backgroundColor: colors.blushDeep,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.blushDeep,
    fontWeight: '800',
  },
});

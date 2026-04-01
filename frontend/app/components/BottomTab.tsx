import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  {
    route: '/',
    label: 'Accueil',
    icon: 'home-outline' as const,
    activeIcon: 'home' as const,
  },
  {
    route: '/patterns',
    label: 'Patrons',
    icon: 'book-outline' as const,
    activeIcon: 'book' as const,
  },
  {
    route: '/tools',
    label: 'Outils',
    icon: 'construct-outline' as const,
    activeIcon: 'construct' as const,
  },
  {
    route: '/projects',
    label: 'Projets',
    icon: 'folder-outline' as const,
    activeIcon: 'folder' as const,
  },
  {
    route: '/chat',
    label: 'Julie IA',
    icon: 'chatbubble-ellipses-outline' as const,
    activeIcon: 'chatbubble-ellipses' as const,
  },
];

export default function BottomTab() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive =
          pathname === tab.route ||
          (tab.route !== '/' && pathname.startsWith(tab.route));
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => router.replace(tab.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
                color={isActive ? '#0A0A0A' : '#666666'}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
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
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 40,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: '#D4AF37',
  },
  label: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '500',
  },
  labelActive: {
    color: '#D4AF37',
    fontWeight: '700',
  },
});

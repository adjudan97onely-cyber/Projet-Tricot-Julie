import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, spacing } from '../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}

export default function Header({ title, subtitle, back = false, right }: HeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {back ? (
        <TouchableOpacity
          accessibilityLabel="Retour"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.action}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.action} />
      )}

      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.action}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cream,
  },
  action: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});

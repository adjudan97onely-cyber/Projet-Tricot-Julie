import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

type Tone = 'rose' | 'sage' | 'gold' | 'neutral';

const tones: Record<Tone, { bg: string; fg: string }> = {
  rose: { bg: colors.blushSoft, fg: colors.blushDeep },
  sage: { bg: colors.sageSoft, fg: '#587047' },
  gold: { bg: colors.goldSoft, fg: '#80652F' },
  neutral: { bg: colors.cream, fg: colors.textMuted },
};

interface BadgeProps {
  label: string;
  tone?: Tone;
}

export default function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const palette = tones[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});

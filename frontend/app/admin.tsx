import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator, Alert, Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from './components/Header';
import { isAdmin, lockAdmin } from './services/adminAccess';
import { createAccessCode, fetchActiveCodes, deleteAccessCode } from './services/guestAccess';
import { getAllFeedback, getBetaUserCount } from './services/supabaseService';
import { colors, fonts, radii, shadows, spacing, layout } from './theme';

const DURATIONS = [
  { label: '24h', hours: 24 },
  { label: '3 jours', hours: 72 },
  { label: '7 jours', hours: 168 },
  { label: '1 mois', hours: 720 },
];

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

export default function AdminScreen() {
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin()) router.replace('/');
  }, []);

  if (!isAdmin()) return null;

  const [feedback, setFeedback] = useState<any[]>([]);
  const [betaCount, setBetaCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [activeCodes, setActiveCodes] = useState<any[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [duration, setDuration] = useState(168);
  const [guestLabel, setGuestLabel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fb, count] = await Promise.all([getAllFeedback(), getBetaUserCount()]);
      setFeedback(fb);
      setBetaCount(count);
      setLastSync(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCodes = useCallback(async () => {
    setCodesLoading(true);
    setActiveCodes(await fetchActiveCodes());
    setCodesLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    loadCodes();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData, loadCodes]);

  async function handleGenerate() {
    setGenerating(true);
    setNewCode(null);
    try {
      const code = await createAccessCode(duration, guestLabel.trim());
      setNewCode(code);
      setGuestLabel('');
      await loadCodes();
    } catch {
      setNewCode('ERREUR');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(code: string) {
    await deleteAccessCode(code);
    await loadCodes();
    if (newCode === code) setNewCode(null);
  }

  function handleCopy(code: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(code);
      } else {
        Clipboard.setString(code);
      }
      Alert.alert('Copié !', `Code ${code} copié.`);
    } catch {}
  }

  const likes = feedback.filter((f) => f.type === 'like');
  const commentsList = feedback.filter((f) => f.comment && f.type === null);

  const byPattern: Record<string, { likes: number; comments: number }> = {};
  feedback.forEach((f) => {
    if (!byPattern[f.pattern_id]) byPattern[f.pattern_id] = { likes: 0, comments: 0 };
    if (f.type === 'like') byPattern[f.pattern_id].likes++;
    if (f.comment && f.type === null) byPattern[f.pattern_id].comments++;
  });
  const topPatterns = Object.entries(byPattern)
    .map(([id, c]) => ({ id, total: c.likes + c.comments, ...c }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const syncText = lastSync ? `Sync ${timeAgo(lastSync.toISOString())} · auto 30s` : undefined;

  return (
    <SafeAreaView style={styles.page}>
      <Header
        title="Dashboard"
        subtitle={syncText}
        back
        right={
          <TouchableOpacity onPress={loadData} disabled={loading}>
            <Ionicons name="refresh" size={18} color={loading ? colors.line : colors.blushDeep} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: "J'aimes", value: likes.length, tint: colors.danger },
            { label: 'Commentaires', value: commentsList.length, tint: colors.gold },
            { label: 'Interactions', value: feedback.length, tint: colors.sage },
            { label: 'Inscrits', value: betaCount, tint: colors.blushDeep },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.tint }]}>
                {loading ? '…' : s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Codes d'accès */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key-outline" size={16} color={colors.textMuted} />
            <Text style={styles.sectionTitle}>Accès invités</Text>
          </View>

          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d.hours}
                style={[styles.durationBtn, duration === d.hours && styles.durationBtnActive]}
                onPress={() => setDuration(d.hours)}
              >
                <Text style={[styles.durationText, duration === d.hours && styles.durationTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.labelInput}
            value={guestLabel}
            onChangeText={setGuestLabel}
            placeholder="Pour qui ? (ex: Maman, Claire…)"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity
            style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.generateBtnText}>Générer le code</Text>
            )}
          </TouchableOpacity>

          {newCode && newCode !== 'ERREUR' && (
            <TouchableOpacity style={styles.newCodeCard} onPress={() => handleCopy(newCode)} activeOpacity={0.8}>
              <Text style={styles.newCodeText}>{newCode}</Text>
              <View style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={16} color={colors.blushDeep} />
                <Text style={styles.copyText}>Copier</Text>
              </View>
            </TouchableOpacity>
          )}
          {newCode === 'ERREUR' && (
            <Text style={styles.errorText}>Erreur — vérifie ta connexion.</Text>
          )}

          {!codesLoading && activeCodes.length > 0 && (
            <View style={styles.codesList}>
              <Text style={styles.codesListTitle}>CODES ACTIFS</Text>
              {activeCodes.map((c) => (
                <View key={c.code} style={styles.codeRow}>
                  <View style={styles.codeRowInfo}>
                    <Text style={styles.codeRowCode}>{c.code}</Text>
                    <Text style={styles.codeRowMeta}>
                      {c.label ? `${c.label} · ` : ''}
                      expire le {new Date(c.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(c.code)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Top patrons */}
        {topPatterns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up-outline" size={16} color={colors.textMuted} />
              <Text style={styles.sectionTitle}>Patrons les plus actifs</Text>
            </View>
            {topPatterns.map((p, i) => (
              <View key={p.id} style={styles.patternRow}>
                <Text style={styles.patternRank}>{i + 1}</Text>
                <Text style={styles.patternName} numberOfLines={1}>{p.id.replace(/-/g, ' ')}</Text>
                <View style={styles.patternStats}>
                  {p.likes > 0 && <Text style={styles.patternLikes}>❤️ {p.likes}</Text>}
                  {p.comments > 0 && <Text style={styles.patternComments}>💬 {p.comments}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Derniers commentaires */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles-outline" size={16} color={colors.textMuted} />
            <Text style={styles.sectionTitle}>Derniers commentaires</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.blushDeep} size="small" />
          ) : commentsList.length === 0 ? (
            <Text style={styles.emptyText}>Aucun commentaire pour l'instant.</Text>
          ) : (
            commentsList.slice(0, 10).map((c: any) => (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentPattern}>{c.pattern_id?.replace(/-/g, ' ')}</Text>
                  <Text style={styles.commentTime}>{timeAgo(c.created_at)}</Text>
                </View>
                <Text style={styles.commentText}>"{c.comment}"</Text>
              </View>
            ))
          )}
        </View>

        {/* Déconnexion */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => { lockAdmin(); router.replace('/'); }}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter du mode admin</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  scrollContent: { padding: layout.pagePadding, paddingBottom: 60, maxWidth: layout.maxContentWidth, width: '100%', alignSelf: 'center' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: colors.surface,
    borderRadius: radii.md, padding: spacing.lg, ...shadows.soft,
  },
  statValue: { fontSize: 32, fontWeight: '900', marginBottom: 3 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },

  section: {
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg,
    marginBottom: spacing.lg, ...shadows.soft,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

  durationRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  durationBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radii.sm,
    backgroundColor: colors.cream, alignItems: 'center',
  },
  durationBtnActive: { backgroundColor: colors.blushDeep },
  durationText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  durationTextActive: { color: colors.white },

  labelInput: {
    backgroundColor: colors.cream, borderRadius: radii.sm, paddingHorizontal: 14,
    paddingVertical: spacing.md, fontSize: 14, color: colors.text, marginBottom: spacing.md,
  },
  generateBtn: {
    backgroundColor: colors.blushDeep, borderRadius: radii.md,
    paddingVertical: 14, alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { fontSize: 15, fontWeight: '800', color: colors.white },

  newCodeCard: {
    marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.blushSoft, borderRadius: radii.md, padding: spacing.lg,
  },
  newCodeText: { fontSize: 18, fontWeight: '900', color: colors.blushDeep, fontFamily: 'monospace', letterSpacing: 3 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontSize: 12, color: colors.blushDeep, fontWeight: '700' },
  errorText: { fontSize: 13, color: colors.danger, marginTop: spacing.sm },

  codesList: { marginTop: spacing.lg },
  codesListTitle: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5, marginBottom: spacing.sm },
  codeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.cream, borderRadius: radii.sm, padding: spacing.md, marginBottom: spacing.sm,
  },
  codeRowInfo: { flex: 1 },
  codeRowCode: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: 'monospace' },
  codeRowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 6 },

  patternRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.cream, borderRadius: radii.sm, padding: spacing.md, marginBottom: spacing.sm,
  },
  patternRank: { fontSize: 13, fontWeight: '800', color: colors.textMuted, width: 20 },
  patternName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  patternStats: { flexDirection: 'row', gap: spacing.sm },
  patternLikes: { fontSize: 12, color: colors.danger },
  patternComments: { fontSize: 12, color: colors.gold },

  commentCard: {
    backgroundColor: colors.cream, borderRadius: radii.sm, padding: spacing.md, marginBottom: spacing.sm,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentPattern: { fontSize: 11, fontWeight: '700', color: colors.blushDeep },
  commentTime: { fontSize: 10, color: colors.textMuted },
  commentText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.blushSoft,
    borderRadius: radii.md, paddingVertical: 14,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: colors.danger },
});

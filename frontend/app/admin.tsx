import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator, Alert, Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isAdmin, lockAdmin } from './services/adminAccess';
import { createAccessCode, fetchActiveCodes, deleteAccessCode } from './services/guestAccess';
import { getAllFeedback, getBetaUserCount } from './services/supabaseService';

const DURATIONS = [
  { label: "24h", hours: 24 },
  { label: "3 jours", hours: 72 },
  { label: "7 jours", hours: 168 },
  { label: "1 mois", hours: 720 },
];

function timeAgo(iso: string) {
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
  const [guestLabel, setGuestLabel] = useState("");
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
      setGuestLabel("");
      await loadCodes();
    } catch {
      setNewCode("ERREUR");
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
      Alert.alert("Copié !", `Code ${code} copié.`);
    } catch {}
  }

  const likes = feedback.filter(f => f.type === "like");
  const dislikes = feedback.filter(f => f.type === "dislike");
  const comments = feedback.filter(f => f.comment && f.type === null);

  const byPattern: Record<string, { likes: number; comments: number }> = {};
  feedback.forEach(f => {
    if (!byPattern[f.pattern_id]) byPattern[f.pattern_id] = { likes: 0, comments: 0 };
    if (f.type === "like") byPattern[f.pattern_id].likes++;
    if (f.comment && f.type === null) byPattern[f.pattern_id].comments++;
  });
  const topPatterns = Object.entries(byPattern)
    .map(([id, c]) => ({ id, total: c.likes + c.comments, ...c }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          {lastSync && (
            <Text style={styles.headerSub}>
              Sync {timeAgo(lastSync.toISOString())} · auto 30s
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={loadData} disabled={loading}
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh" size={18} color={loading ? "#555" : "#D4AF37"} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: "J'aimes", value: likes.length, color: "#FF6B6B" },
            { label: "Commentaires", value: comments.length, color: "#D4AF37" },
            { label: "Interactions", value: feedback.length, color: "#6BCB77" },
            { label: "Inscrits", value: betaCount, color: "#8888FF" },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { borderColor: s.color + "33" }]}>
              <Text style={[styles.statValue, { color: s.color }]}>
                {loading ? "…" : s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Génération de codes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key-outline" size={16} color="#888" />
            <Text style={styles.sectionTitle}>Accès invités</Text>
          </View>

          <View style={styles.durationRow}>
            {DURATIONS.map(d => (
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
            placeholderTextColor="#555"
          />

          <TouchableOpacity
            style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.generateBtnText}>Générer le code</Text>
            )}
          </TouchableOpacity>

          {newCode && newCode !== "ERREUR" && (
            <TouchableOpacity style={styles.newCodeCard} onPress={() => handleCopy(newCode)} activeOpacity={0.8}>
              <Text style={styles.newCodeText}>{newCode}</Text>
              <View style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={16} color="#D4AF37" />
                <Text style={styles.copyText}>Copier</Text>
              </View>
            </TouchableOpacity>
          )}
          {newCode === "ERREUR" && (
            <Text style={styles.errorText}>Erreur — vérifie ta connexion.</Text>
          )}

          {/* Codes actifs */}
          {!codesLoading && activeCodes.length > 0 && (
            <View style={styles.codesListSection}>
              <Text style={styles.codesListTitle}>CODES ACTIFS</Text>
              {activeCodes.map(c => (
                <View key={c.code} style={styles.codeRow}>
                  <View style={styles.codeRowInfo}>
                    <Text style={styles.codeRowCode}>{c.code}</Text>
                    <Text style={styles.codeRowMeta}>
                      {c.label ? `${c.label} · ` : ""}
                      expire le {new Date(c.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(c.code)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
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
              <Ionicons name="trending-up-outline" size={16} color="#888" />
              <Text style={styles.sectionTitle}>Patrons les plus actifs</Text>
            </View>
            {topPatterns.map((p, i) => (
              <View key={p.id} style={styles.patternRow}>
                <Text style={styles.patternRank}>{i + 1}</Text>
                <Text style={styles.patternName} numberOfLines={1}>{p.id.replace(/-/g, " ")}</Text>
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
            <Ionicons name="chatbubbles-outline" size={16} color="#888" />
            <Text style={styles.sectionTitle}>Derniers commentaires</Text>
          </View>
          {loading ? (
            <ActivityIndicator color="#D4AF37" size="small" />
          ) : comments.length === 0 ? (
            <Text style={styles.emptyText}>Aucun commentaire pour l'instant.</Text>
          ) : (
            comments.slice(0, 10).map((c: any) => (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentPattern}>{c.pattern_id?.replace(/-/g, " ")}</Text>
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
          <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
          <Text style={styles.logoutText}>Se déconnecter du mode admin</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: '#555', marginTop: 2 },
  refreshBtn: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: '#141414',
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  statValue: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#888', fontWeight: '600', textTransform: 'uppercase' },
  section: {
    backgroundColor: '#141414', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#2A2A2A',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  durationBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#1E1E1E', alignItems: 'center',
  },
  durationBtnActive: { backgroundColor: '#8B5CF6' },
  durationText: { fontSize: 12, fontWeight: '600', color: '#888' },
  durationTextActive: { color: '#FFFFFF' },
  labelInput: {
    backgroundColor: '#1E1E1E', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, color: '#FFFFFF',
    borderWidth: 1, borderColor: '#333', marginBottom: 12,
  },
  generateBtn: {
    backgroundColor: '#8B5CF6', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  newCodeCard: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  newCodeText: { fontSize: 18, fontWeight: '900', color: '#C4B5FD', fontFamily: 'monospace', letterSpacing: 3 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontSize: 12, color: '#D4AF37', fontWeight: '600' },
  errorText: { fontSize: 13, color: '#FF6B6B', marginTop: 8 },
  codesListSection: { marginTop: 16 },
  codesListTitle: { fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 1.5, marginBottom: 10 },
  codeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1E1E1E', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  codeRowInfo: { flex: 1 },
  codeRowCode: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'monospace' },
  codeRowMeta: { fontSize: 11, color: '#666', marginTop: 2 },
  deleteBtn: { padding: 6 },
  patternRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E1E1E', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  patternRank: { fontSize: 13, fontWeight: '700', color: '#555', width: 20 },
  patternName: { flex: 1, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  patternStats: { flexDirection: 'row', gap: 8 },
  patternLikes: { fontSize: 12, color: '#FF6B6B' },
  patternComments: { fontSize: 12, color: '#D4AF37' },
  commentCard: {
    backgroundColor: '#1E1E1E', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentPattern: { fontSize: 11, fontWeight: '600', color: '#D4AF37' },
  commentTime: { fontSize: 10, color: '#555' },
  commentText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  emptyText: { fontSize: 13, color: '#555', textAlign: 'center', paddingVertical: 12 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.2)',
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#FF6B6B' },
});

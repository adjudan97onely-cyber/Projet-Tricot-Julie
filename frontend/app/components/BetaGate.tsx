import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerBetaUser } from '../services/supabaseService';

const STORAGE_KEY = "tricot-beta-access";

function store() {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

export function hasBetaAccess(): boolean {
  return !!store()?.getItem(STORAGE_KEY);
}

interface Props {
  onAccess: () => void;
}

export default function BetaGate({ onAccess }: Props) {
  const [prenom, setPrenom] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!prenom.trim() || !contact.trim()) return;
    setLoading(true);
    try {
      await registerBetaUser({ prenom: prenom.trim(), contact: contact.trim() });
    } catch {}
    store()?.setItem(STORAGE_KEY, JSON.stringify({ prenom: prenom.trim(), date: new Date().toISOString() }));
    setDone(true);
    setTimeout(onAccess, 1600);
  }

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeEmoji}>🌸</Text>
          <Text style={styles.welcomeTitle}>Bienvenue {prenom} !</Text>
          <Text style={styles.welcomeSub}>Bonne création ✨</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🌸</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={10} color="#D4AF37" />
            <Text style={styles.badgeText}>ACCÈS PRIVÉ</Text>
          </View>
          <Text style={styles.brandName}>BUI-THI DAM</Text>
          <Text style={styles.brandSub}>Créations</Text>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerDot}>✦</Text>
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.subtitle}>Tricot · Crochet · Laine</Text>
        </View>

        {/* Teaser */}
        <View style={styles.teaserCard}>
          <Text style={styles.teaserTitle}>Tu es parmi les premiers à découvrir l'app.</Text>
          <View style={styles.teaserList}>
            {[
              "Patrons exclusifs de Julie",
              "Tutoriels pas-à-pas",
              "Assistant tricot IA",
              "Galerie de créations",
            ].map((item, i) => (
              <Text key={i} style={styles.teaserItem}>✦  {item}</Text>
            ))}
          </View>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Ton prénom</Text>
          <TextInput
            style={styles.input}
            value={prenom}
            onChangeText={setPrenom}
            placeholder="Ex: Sophie"
            placeholderTextColor="#555"
            autoCapitalize="words"
          />
          <Text style={[styles.label, { marginTop: 14 }]}>Ton Instagram ou email</Text>
          <TextInput
            style={styles.input}
            value={contact}
            onChangeText={setContact}
            placeholder="@ton_pseudo ou email@..."
            placeholderTextColor="#555"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.submitButton, (!prenom.trim() || !contact.trim() || loading) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!prenom.trim() || !contact.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0A0A0A" size="small" />
            ) : (
              <>
                <Text style={styles.submitText}>Accéder à l'app</Text>
                <Ionicons name="arrow-forward" size={18} color="#0A0A0A" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Instagram footer */}
        <TouchableOpacity
          style={styles.instaLink}
          onPress={() => Linking.openURL("https://www.instagram.com/djeminie972/")}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-instagram" size={14} color="#E1306C" />
          <Text style={styles.instaText}>@djeminie972</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40, paddingTop: 40 },
  welcomeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  welcomeEmoji: { fontSize: 64, marginBottom: 16 },
  welcomeTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  welcomeSub: { fontSize: 16, color: '#D4AF37' },
  logoArea: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2, borderColor: '#FFB6C1',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,182,193,0.12)', marginBottom: 14,
  },
  logoEmoji: { fontSize: 48 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, backgroundColor: 'rgba(212,175,55,0.15)',
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#D4AF37', letterSpacing: 1.5 },
  brandName: { fontSize: 26, fontWeight: '300', color: '#FFFFFF', letterSpacing: 4, marginBottom: 2 },
  brandSub: { fontSize: 14, fontWeight: '300', color: '#D4AF37', letterSpacing: 10, marginBottom: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dividerLine: { width: 40, height: 1, backgroundColor: 'rgba(212,175,55,0.4)' },
  dividerDot: { fontSize: 12, color: '#D4AF37', marginHorizontal: 8 },
  subtitle: { fontSize: 11, color: '#666', letterSpacing: 3 },
  teaserCard: {
    width: '100%', backgroundColor: '#141414', borderRadius: 16,
    padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  teaserTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  teaserList: { gap: 8 },
  teaserItem: { fontSize: 13, color: '#AAAAAA' },
  formCard: {
    width: '100%', backgroundColor: '#141414', borderRadius: 16,
    padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  label: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    backgroundColor: '#1E1E1E', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, color: '#FFFFFF',
    borderWidth: 1, borderColor: '#333',
  },
  submitButton: {
    marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#D4AF37', borderRadius: 14, paddingVertical: 16, gap: 8,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#0A0A0A' },
  instaLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  instaText: { fontSize: 12, color: '#E1306C' },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setGuestAccess } from '../services/guestAccess';

interface Props {
  feature?: 'chat' | 'patron';
  onAccess: () => void;
}

const FEATURE_INFO = {
  chat: {
    icon: 'chatbubbles-outline' as const,
    title: 'Assistant Julie IA',
    tagline: 'Ton experte tricot disponible 24h/24 🧶',
    perks: [
      'Conseils personnalisés sur tes projets',
      'Analyse de photos de ton tricot',
      'Calculs de pelotes et aiguilles',
      'Aide pour rattraper les erreurs',
    ],
  },
  patron: {
    icon: 'book-outline' as const,
    title: 'Patrons Complets',
    tagline: 'Tous les patrons de Julie en détail 🌸',
    perks: [
      'Instructions étape par étape',
      'Variantes de tailles',
      'Schémas et diagrammes',
      'Patrons exclusifs mis à jour',
    ],
  },
};

const DURATIONS = [
  { label: "24h", hours: 24 },
  { label: "7 jours", hours: 168 },
  { label: "1 mois", hours: 720 },
];

export default function PremiumGate({ feature = 'chat', onAccess }: Props) {
  const info = FEATURE_INFO[feature];
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState<null | "loading" | "invalid" | "expired">(null);

  async function handleCode() {
    if (!code.trim() || codeState === "loading") return;
    setCodeState("loading");
    const result = await setGuestAccess(code.trim());
    if (result instanceof Date) {
      onAccess();
    } else {
      setCodeState(result);
      setCode("");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Icon */}
      <View style={styles.iconWrapper}>
        <View style={styles.iconCircle}>
          <Ionicons name={info.icon} size={36} color="#D4AF37" />
        </View>
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={12} color="#888" />
        </View>
      </View>

      {/* Badge */}
      <View style={styles.premiumBadge}>
        <Ionicons name="sparkles" size={10} color="#D4AF37" />
        <Text style={styles.premiumBadgeText}>FONCTIONNALITÉ PREMIUM</Text>
      </View>

      <Text style={styles.title}>{info.title}</Text>
      <Text style={styles.tagline}>{info.tagline}</Text>

      {/* Perks */}
      <View style={styles.perksCard}>
        {info.perks.map((perk, i) => (
          <View key={i} style={styles.perkRow}>
            <View style={styles.perkCheck}>
              <Text style={styles.perkCheckText}>✓</Text>
            </View>
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
      </View>

      {/* Price */}
      <View style={styles.priceCard}>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceAmount}>4,99€<Text style={styles.pricePer}>/mois</Text></Text>
            <Text style={styles.priceFounder}>Offre fondatrice — 50 places</Text>
          </View>
          <Text style={styles.priceArrow}>→</Text>
          <View>
            <Text style={styles.priceStrike}>5,99€<Text style={styles.pricePer}>/mois</Text></Text>
            <Text style={styles.priceNormal}>Prix normal</Text>
          </View>
        </View>
        <Text style={styles.priceSub}>Lancement bientôt — rejoins la liste d'attente</Text>
      </View>

      {/* CTA Instagram */}
      <TouchableOpacity
        style={styles.instaButton}
        onPress={() => Linking.openURL("https://www.instagram.com/djeminie972/")}
        activeOpacity={0.8}
      >
        <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
        <Text style={styles.instaButtonText}>Rejoindre — DM Julie sur Instagram</Text>
      </TouchableOpacity>

      <Text style={styles.freeNote}>Lexique et tutoriels toujours gratuits</Text>

      {/* Code d'accès */}
      <TouchableOpacity onPress={() => { setShowCode(v => !v); setCodeState(null); setCode(""); }}>
        <Text style={styles.codeToggle}>Tu as un code d'accès ?</Text>
      </TouchableOpacity>

      {showCode && (
        <View style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <Ionicons name="key-outline" size={16} color="#888" />
            <Text style={styles.codeLabel}>CODE D'ACCÈS</Text>
          </View>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(t) => { setCode(t.toUpperCase()); setCodeState(null); }}
            placeholder="XXXX-XXXX-XXXX"
            placeholderTextColor="#444"
            autoCapitalize="characters"
            autoFocus
          />
          {codeState === "expired" && <Text style={styles.codeError}>Ce code a expiré.</Text>}
          {codeState === "invalid" && <Text style={styles.codeError}>Code invalide.</Text>}
          <TouchableOpacity
            style={[styles.codeButton, codeState === "loading" && styles.codeButtonDisabled]}
            onPress={handleCode}
            disabled={codeState === "loading"}
            activeOpacity={0.8}
          >
            {codeState === "loading" ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.codeButtonText}>Valider</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center', paddingHorizontal: 24,
    paddingTop: 40, paddingBottom: 60,
  },
  iconWrapper: { position: 'relative', marginBottom: 16 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center',
  },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(212,175,55,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12,
  },
  premiumBadgeText: { fontSize: 10, fontWeight: '800', color: '#D4AF37', letterSpacing: 1.5 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, textAlign: 'center' },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 20, textAlign: 'center' },
  perksCard: {
    width: '100%', backgroundColor: 'rgba(212,175,55,0.07)',
    borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  perkCheck: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1,
  },
  perkCheckText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  perkText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  priceCard: {
    width: '100%', backgroundColor: 'rgba(212,175,55,0.05)',
    borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 },
  priceAmount: { fontSize: 28, fontWeight: '900', color: '#D4AF37' },
  pricePer: { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.4)' },
  priceFounder: { fontSize: 11, color: '#D4AF37', marginTop: 2, textAlign: 'center' },
  priceArrow: { fontSize: 18, color: 'rgba(255,255,255,0.2)' },
  priceStrike: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.25)', textDecorationLine: 'line-through' },
  priceNormal: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
  priceSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  instaButton: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 16, marginBottom: 12,
    backgroundColor: '#C13584',
  },
  instaButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  freeNote: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 20 },
  codeToggle: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecorationLine: 'underline', marginBottom: 12 },
  codeCard: {
    width: '100%', backgroundColor: '#141414',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  codeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  codeLabel: { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 1.5 },
  codeInput: {
    backgroundColor: '#1E1E1E', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: '#FFFFFF', fontFamily: 'monospace',
    letterSpacing: 4, borderWidth: 1, borderColor: '#333',
    marginBottom: 10,
  },
  codeError: { fontSize: 12, color: '#FF6B6B', marginBottom: 8 },
  codeButton: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  codeButtonDisabled: { opacity: 0.5 },
  codeButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

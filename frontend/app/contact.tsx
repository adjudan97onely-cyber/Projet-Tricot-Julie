import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { unlockAdmin, isAdmin, lockAdmin } from './services/adminAccess';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ContactScreen() {
  const router = useRouter();
  const { itemId, itemTitle } = useLocalSearchParams<{ itemId?: string; itemTitle?: string }>();

  const [tapCount, setTapCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(() => isAdmin());

  function handleLogoTap() {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 5) { setShowAdminLogin(true); setTapCount(0); }
  }

  function handleAdminLogin() {
    if (unlockAdmin(adminPassword)) {
      setAdminUnlocked(true);
      setShowAdminLogin(false);
      setAdminPassword("");
      setAdminError(false);
    } else {
      setAdminError(true);
      setAdminPassword("");
    }
  }

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    subject: itemTitle ? `Question sur: ${itemTitle}` : '',
    message: '',
  });
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async () => {
    if (!formData.client_name.trim() || !formData.subject.trim() || !formData.message.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          gallery_item_id: itemId || null,
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Message envoyé !',
          'Julie vous répondra dans les plus brefs délais.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Erreur', 'Impossible d\'envoyer le message.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contacter Julie</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Modal admin login */}
          <Modal visible={showAdminLogin} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => { setShowAdminLogin(false); setAdminPassword(""); setAdminError(false); }}
            >
              <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
                <View style={styles.modalHeader}>
                  <Ionicons name="shield-outline" size={20} color="#D4AF37" />
                  <Text style={styles.modalTitle}>Accès admin</Text>
                </View>
                <TextInput
                  style={styles.modalInput}
                  value={adminPassword}
                  onChangeText={(t) => { setAdminPassword(t); setAdminError(false); }}
                  placeholder="Mot de passe"
                  placeholderTextColor="#555"
                  secureTextEntry
                  autoFocus
                />
                {adminError && <Text style={styles.modalError}>Mot de passe incorrect</Text>}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => { setShowAdminLogin(false); setAdminPassword(""); setAdminError(false); }}
                  >
                    <Text style={styles.modalCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAdminLogin}>
                    <Text style={styles.modalConfirmText}>Déverrouiller</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          {/* Info Card with logo tap (admin trigger) */}
          <TouchableOpacity onPress={handleLogoTap} activeOpacity={1} style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#D4AF37" />
            <Text style={styles.infoText}>
              Envoyez un message à Julie pour poser une question ou passer une commande.
              Elle vous répondra rapidement !
            </Text>
          </TouchableOpacity>

          {/* Instagram + Admin buttons */}
          <TouchableOpacity
            style={styles.instaButton}
            onPress={() => Linking.openURL("https://www.instagram.com/djeminie972/")}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
            <Text style={styles.instaButtonText}>Poser une question sur Instagram</Text>
          </TouchableOpacity>

          {adminUnlocked && (
            <View style={styles.adminRow}>
              <TouchableOpacity style={styles.adminDashBtn} onPress={() => router.push('/admin' as any)}>
                <Ionicons name="bar-chart-outline" size={16} color="#D4AF37" />
                <Text style={styles.adminDashText}>Dashboard admin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adminLockBtn} onPress={() => { lockAdmin(); setAdminUnlocked(false); }}>
                <Ionicons name="lock-closed-outline" size={16} color="#888" />
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Votre nom *</Text>
            <TextInput
              style={styles.input}
              value={formData.client_name}
              onChangeText={(text) => setFormData({ ...formData, client_name: text })}
              placeholder="Votre nom"
              placeholderTextColor="#666666"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.client_email}
              onChangeText={(text) => setFormData({ ...formData, client_email: text })}
              placeholder="votre@email.com"
              placeholderTextColor="#666666"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={formData.client_phone}
              onChangeText={(text) => setFormData({ ...formData, client_phone: text })}
              placeholder="06 XX XX XX XX"
              placeholderTextColor="#666666"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Sujet *</Text>
            <TextInput
              style={styles.input}
              value={formData.subject}
              onChangeText={(text) => setFormData({ ...formData, subject: text })}
              placeholder="Ex: Demande de commande, question..."
              placeholderTextColor="#666666"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.message}
              onChangeText={(text) => setFormData({ ...formData, message: text })}
              placeholder="Écrivez votre message..."
              placeholderTextColor="#666666"
              multiline
              numberOfLines={6}
            />
          </View>

          <TouchableOpacity
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={isSending}
          >
            <Ionicons name="send" size={20} color="#0A0A0A" />
            <Text style={styles.sendButtonText}>
              {isSending ? 'Envoi...' : 'Envoyer le message'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginLeft: 12,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#2A2A2A',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
    marginLeft: 10,
  },
  instaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#C13584', borderRadius: 12,
    paddingVertical: 14, marginBottom: 12,
  },
  instaButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  adminRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  adminDashBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
  },
  adminDashText: { fontSize: 13, fontWeight: '600', color: '#D4AF37' },
  adminLockBtn: {
    width: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A',
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: '#1A1A1A', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  modalInput: {
    backgroundColor: '#0A0A0A', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, color: '#FFFFFF',
    borderWidth: 1, borderColor: '#333', marginBottom: 8,
  },
  modalError: { fontSize: 12, color: '#FF6B6B', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  modalCancelText: { fontSize: 14, color: '#888', fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#D4AF37',
  },
  modalConfirmText: { fontSize: 14, color: '#0A0A0A', fontWeight: '700' },
});

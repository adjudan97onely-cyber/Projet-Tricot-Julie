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
import Header from './components/Header';
import { unlockAdmin, isAdmin, lockAdmin } from './services/adminAccess';
import { colors, spacing, radii, shadows } from './theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ContactScreen() {
  const router = useRouter();
  const { itemId, itemTitle } = useLocalSearchParams<{ itemId?: string; itemTitle?: string }>();

  const [tapCount, setTapCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(() => isAdmin());

  function handleLogoTap() {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 5) {
      setShowAdminLogin(true);
      setTapCount(0);
    }
  }

  async function handleAdminLogin() {
    if (await unlockAdmin(adminPassword)) {
      setAdminUnlocked(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      setAdminError(false);
    } else {
      setAdminError(true);
      setAdminPassword('');
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
        Alert.alert('Erreur', "Impossible d'envoyer le message.");
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer le message.");
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
        <Header title="Contacter Julie" back />

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Modal admin login */}
          <Modal visible={showAdminLogin} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setShowAdminLogin(false);
                setAdminPassword('');
                setAdminError(false);
              }}
            >
              <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
                <View style={styles.modalHeader}>
                  <Ionicons name="shield-outline" size={20} color={colors.blushDeep} />
                  <Text style={styles.modalTitle}>Accès admin</Text>
                </View>
                <TextInput
                  style={styles.modalInput}
                  value={adminPassword}
                  onChangeText={(t) => {
                    setAdminPassword(t);
                    setAdminError(false);
                  }}
                  placeholder="Mot de passe"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoFocus
                />
                {adminError ? (
                  <Text style={styles.modalError}>Mot de passe incorrect</Text>
                ) : null}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => {
                      setShowAdminLogin(false);
                      setAdminPassword('');
                      setAdminError(false);
                    }}
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
            <Ionicons name="information-circle-outline" size={24} color={colors.blushDeep} />
            <Text style={styles.infoText}>
              Envoyez un message à Julie pour poser une question ou passer une commande.
              Elle vous répondra rapidement !
            </Text>
          </TouchableOpacity>

          {/* Instagram + Admin buttons */}
          <TouchableOpacity
            style={styles.instaButton}
            onPress={() => Linking.openURL('https://www.instagram.com/djeminie972/')}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-instagram" size={18} color={colors.white} />
            <Text style={styles.instaButtonText}>Poser une question sur Instagram</Text>
          </TouchableOpacity>

          {adminUnlocked ? (
            <View style={styles.adminRow}>
              <TouchableOpacity
                style={styles.adminDashBtn}
                onPress={() => router.push('/admin' as any)}
              >
                <Ionicons name="bar-chart-outline" size={16} color={colors.blushDeep} />
                <Text style={styles.adminDashText}>Dashboard admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminLockBtn}
                onPress={() => {
                  lockAdmin();
                  setAdminUnlocked(false);
                }}
              >
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Votre nom *</Text>
            <TextInput
              style={styles.input}
              value={formData.client_name}
              onChangeText={(text) => setFormData({ ...formData, client_name: text })}
              placeholder="Votre nom"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.client_email}
              onChangeText={(text) => setFormData({ ...formData, client_email: text })}
              placeholder="votre@email.com"
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.message}
              onChangeText={(text) => setFormData({ ...formData, message: text })}
              placeholder="Écrivez votre message..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={6}
            />
          </View>

          <TouchableOpacity
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={isSending}
          >
            <Ionicons name="send" size={20} color={colors.white} />
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
    backgroundColor: colors.cream,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.blushSoft,
    borderRadius: radii.sm,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.blushDeep,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginLeft: spacing.md,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.lg,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blushDeep,
    paddingVertical: spacing.lg,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.line,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 10,
  },
  instaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#C13584',
    borderRadius: radii.sm,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  instaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  adminRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  adminDashBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.blushSoft,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.blushDeep,
  },
  adminDashText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.blushDeep,
  },
  adminLockBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalInput: {
    backgroundColor: colors.cream,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.sm,
  },
  modalError: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  modalCancelText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.blushDeep,
  },
  modalConfirmText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '700',
  },
});

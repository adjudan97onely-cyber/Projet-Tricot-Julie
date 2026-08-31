import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from './components/Header';
import { adminFetch } from './services/adminAccess';
import { colors, spacing, radii, shadows } from './theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ClientMessage {
  id: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  subject: string;
  message: string;
  gallery_item_id?: string;
  status: string;
  reply?: string;
  created_at: string;
  read_at?: string;
  replied_at?: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ClientMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all'); // all, nouveau, lu, répondu

  const fetchMessages = async () => {
    try {
      const url =
        filter === 'all'
          ? `${BACKEND_URL}/api/messages`
          : `${BACKEND_URL}/api/messages?status=${filter}`;
      const response = await adminFetch(url);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages();
  }, [filter]);

  const openMessage = async (msg: ClientMessage) => {
    setSelectedMessage(msg);
    setReplyText(msg.reply || '');

    if (msg.status === 'nouveau') {
      try {
        await adminFetch(`${BACKEND_URL}/api/messages/${msg.id}/read`, {
          method: 'PUT',
        });
        fetchMessages();
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      const response = await adminFetch(
        `${BACKEND_URL}/api/messages/${selectedMessage.id}/reply`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply: replyText }),
        }
      );

      if (response.ok) {
        Alert.alert('Succès', 'Réponse envoyée !');
        setSelectedMessage(null);
        setReplyText('');
        fetchMessages();
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer la réponse.");
    }
  };

  const deleteMessage = (msgId: string) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer ce message ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminFetch(`${BACKEND_URL}/api/messages/${msgId}`, {
                method: 'DELETE',
              });
              setSelectedMessage(null);
              fetchMessages();
            } catch (error) {
              console.error('Error deleting message:', error);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'nouveau':
        return colors.danger;
      case 'lu':
        return colors.gold;
      case 'répondu':
        return colors.sage;
      default:
        return colors.textMuted;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'nouveau':
        return 'Nouveau';
      case 'lu':
        return 'Lu';
      case 'répondu':
        return 'Répondu';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = (msg: ClientMessage) => (
    <TouchableOpacity
      key={msg.id}
      style={[styles.messageCard, msg.status === 'nouveau' && styles.unreadCard]}
      onPress={() => openMessage(msg)}
      activeOpacity={0.8}
    >
      <View style={styles.messageHeader}>
        <View style={styles.senderInfo}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {msg.client_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.senderName}>{msg.client_name}</Text>
            <Text style={styles.messageDate}>{formatDate(msg.created_at)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(msg.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(msg.status)}</Text>
        </View>
      </View>
      <Text style={styles.messageSubject}>{msg.subject}</Text>
      <Text style={styles.messagePreview} numberOfLines={2}>
        {msg.message}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Messages" back />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { value: 'all', label: 'Tous' },
          { value: 'nouveau', label: 'Nouveaux' },
          { value: 'répondu', label: 'Répondus' },
        ].map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterButton, filter === f.value && styles.filterButtonActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text
              style={[styles.filterText, filter === f.value && styles.filterTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Messages List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.blushDeep}
          />
        }
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={64} color={colors.line} />
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptyText}>
              Les messages de vos clients apparaîtront ici.
            </Text>
          </View>
        ) : (
          messages.map(renderMessage)
        )}
      </ScrollView>

      {/* Message Detail Modal */}
      <Modal
        visible={selectedMessage !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedMessage(null)}
      >
        {selectedMessage ? (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedMessage(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Message</Text>
              <TouchableOpacity onPress={() => deleteMessage(selectedMessage.id)}>
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Sender Info */}
              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={20} color={colors.blushDeep} />
                  <Text style={styles.detailLabel}>De:</Text>
                  <Text style={styles.detailValue}>{selectedMessage.client_name}</Text>
                </View>
                {selectedMessage.client_email ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={20} color={colors.blushDeep} />
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedMessage.client_email}</Text>
                  </View>
                ) : null}
                {selectedMessage.client_phone ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={20} color={colors.blushDeep} />
                    <Text style={styles.detailLabel}>Tél:</Text>
                    <Text style={styles.detailValue}>{selectedMessage.client_phone}</Text>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={20} color={colors.blushDeep} />
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedMessage.created_at)}</Text>
                </View>
              </View>

              {/* Subject & Message */}
              <View style={styles.messageSection}>
                <Text style={styles.subjectTitle}>{selectedMessage.subject}</Text>
                <Text style={styles.messageContent}>{selectedMessage.message}</Text>
              </View>

              {/* Previous Reply */}
              {selectedMessage.reply ? (
                <View style={styles.replySection}>
                  <Text style={styles.replySectionTitle}>Votre réponse</Text>
                  <Text style={styles.replyContent}>{selectedMessage.reply}</Text>
                </View>
              ) : null}

              {/* Reply Input */}
              <View style={styles.replyInputSection}>
                <Text style={styles.replyInputTitle}>
                  {selectedMessage.reply ? 'Modifier la réponse' : 'Répondre'}
                </Text>
                <TextInput
                  style={styles.replyInput}
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Écrivez votre réponse..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={5}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !replyText.trim() && styles.sendButtonDisabled]}
                  onPress={sendReply}
                  disabled={!replyText.trim()}
                >
                  <Ionicons name="send" size={20} color={colors.white} />
                  <Text style={styles.sendButtonText}>Envoyer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterButtonActive: {
    backgroundColor: colors.blushDeep,
    borderColor: colors.blushDeep,
  },
  filterText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  messageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  unreadCard: {
    borderColor: colors.blushDeep,
    borderLeftWidth: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blushDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  messageDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  messageSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.blushDeep,
    marginBottom: 6,
  },
  messagePreview: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  detailSection: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 10,
    marginRight: spacing.sm,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  messageSection: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.blushDeep,
    marginBottom: spacing.md,
  },
  messageContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
  replySection: {
    backgroundColor: colors.blushSoft,
    borderRadius: radii.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.blushDeep,
  },
  replySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blushDeep,
    marginBottom: spacing.sm,
  },
  replyContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  replyInputSection: {
    marginBottom: spacing.xl,
  },
  replyInputTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  replyInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.lg,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
    height: 150,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blushDeep,
    paddingVertical: 14,
    borderRadius: radii.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.line,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: spacing.sm,
  },
});

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
      const url = filter === 'all' 
        ? `${BACKEND_URL}/api/messages`
        : `${BACKEND_URL}/api/messages?status=${filter}`;
      const response = await fetch(url);
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
        await fetch(`${BACKEND_URL}/api/messages/${msg.id}/read`, {
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
      const response = await fetch(`${BACKEND_URL}/api/messages/${selectedMessage.id}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText }),
      });

      if (response.ok) {
        Alert.alert('Succès', 'Réponse envoyée !');
        setSelectedMessage(null);
        setReplyText('');
        fetchMessages();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la réponse.');
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
              await fetch(`${BACKEND_URL}/api/messages/${msgId}`, {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'nouveau': return '#FF6B6B';
      case 'lu': return '#D4AF37';
      case 'répondu': return '#4CAF50';
      default: return '#888888';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'nouveau': return 'Nouveau';
      case 'lu': return 'Lu';
      case 'répondu': return 'Répondu';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
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
      style={[
        styles.messageCard,
        msg.status === 'nouveau' && styles.unreadCard,
      ]}
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[{ value: 'all', label: 'Tous' }, { value: 'nouveau', label: 'Nouveaux' }, { value: 'répondu', label: 'Répondus' }].map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterButton, filter === f.value && styles.filterButtonActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={64} color="#333333" />
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
        {selectedMessage && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedMessage(null)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Message</Text>
              <TouchableOpacity onPress={() => deleteMessage(selectedMessage.id)}>
                <Ionicons name="trash-outline" size={22} color="#FF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Sender Info */}
              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={20} color="#D4AF37" />
                  <Text style={styles.detailLabel}>De:</Text>
                  <Text style={styles.detailValue}>{selectedMessage.client_name}</Text>
                </View>
                {selectedMessage.client_email && (
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={20} color="#D4AF37" />
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedMessage.client_email}</Text>
                  </View>
                )}
                {selectedMessage.client_phone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={20} color="#D4AF37" />
                    <Text style={styles.detailLabel}>Tél:</Text>
                    <Text style={styles.detailValue}>{selectedMessage.client_phone}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={20} color="#D4AF37" />
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
              {selectedMessage.reply && (
                <View style={styles.replySection}>
                  <Text style={styles.replySectionTitle}>Votre réponse</Text>
                  <Text style={styles.replyContent}>{selectedMessage.reply}</Text>
                </View>
              )}

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
                  placeholderTextColor="#666666"
                  multiline
                  numberOfLines={5}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !replyText.trim() && styles.sendButtonDisabled]}
                  onPress={sendReply}
                  disabled={!replyText.trim()}
                >
                  <Ionicons name="send" size={20} color="#0A0A0A" />
                  <Text style={styles.sendButtonText}>Envoyer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
  },
  filterButtonActive: {
    backgroundColor: '#D4AF37',
  },
  filterText: {
    fontSize: 13,
    color: '#888888',
  },
  filterTextActive: {
    color: '#0A0A0A',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  messageCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  unreadCard: {
    borderColor: '#D4AF37',
    borderLeftWidth: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A0A0A',
  },
  senderName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageDate: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 6,
  },
  messagePreview: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#888888',
    marginLeft: 10,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  messageSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 12,
  },
  messageContent: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 24,
  },
  replySection: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  replySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 8,
  },
  replyContent: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  replyInputSection: {
    marginBottom: 24,
  },
  replyInputTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  replyInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    height: 150,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#2A2A2A',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
    marginLeft: 8,
  },
});

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import BottomTab from './components/BottomTab';
import Header from './components/Header';
import { colors, fonts, radii, spacing, layout } from './theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface QuickSuggestion {
  emoji: string;
  text: string;
}

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { emoji: '🧶', text: 'Comment tricoter un bonnet pour débutante ?' },
  { emoji: '📸', text: 'Analyse cette photo de mon tricot' },
  { emoji: '🧮', text: 'Combien de pelotes pour un pull taille M ?' },
  { emoji: '🪡', text: "Quelle taille d'aiguilles pour cette laine ?" },
  { emoji: '🔰', text: 'Je débute, par où commencer ?' },
  { emoji: '🛠️', text: 'Comment rattraper une maille sautée ?' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image_base64?: string;
  timestamp: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Bonjour ! Je suis Julie, votre assistante experte en tricot et crochet. 🧶\n\nComment puis-je vous aider aujourd\'hui ?\n\n• Analysez une photo de votre projet\n• Demandez des conseils sur les aiguilles ou la laine\n• Obtenez des estimations de temps\n• Apprenez de nouvelles techniques',
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  /* ─── Photo picking ─── */

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Veuillez autoriser l'accès à vos photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Veuillez autoriser l'accès à la caméra.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  function removeImage() {
    setSelectedImage(null);
  }

  /* ─── Send message (fallback non-streaming) ─── */

  async function sendMessageFallback(content: string, img: string | null, convId: string | null) {
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId, message: content, image_base64: img }),
      });
      if (!response.ok) throw new Error('Erreur serveur');
      const data = await response.json();
      if (!convId) setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          id: data.message_id || Date.now().toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      Alert.alert('Erreur', 'Impossible de contacter Julie. Vérifiez votre connexion.');
    } finally {
      setIsLoading(false);
    }
  }

  /* ─── Send message (streaming SSE with fallback) ─── */

  async function sendMessage() {
    if (!message.trim() && !selectedImage) return;
    Keyboard.dismiss();

    const content = message.trim() || 'Analyse cette image';
    const img = selectedImage;
    const convId = conversationId;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      image_base64: img || undefined,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setSelectedImage(null);

    const assistantId = (Date.now() + 1).toString();
    let usedStreaming = false;

    try {
      const resp = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId, message: content, image_base64: img }),
      });
      if (!resp.ok || !resp.body || typeof resp.body.getReader !== 'function') {
        throw new Error('no stream');
      }

      usedStreaming = true;
      setIsStreaming(true);
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
      ]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.token) {
              accumulated += parsed.token;
              const snap = accumulated;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: snap } : m)),
              );
            }
            if (parsed.conversation_id && !conversationId) {
              setConversationId(parsed.conversation_id);
            }
          } catch {
            // Chunk JSON invalide — on ignore
          }
        }
      }
    } catch {
      if (!usedStreaming) {
        await sendMessageFallback(content, img, convId);
      }
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  }

  /* ─── Render a single message bubble ─── */

  function renderMessage(msg: Message) {
    const isUser = msg.role === 'user';

    return (
      <View
        key={msg.id}
        style={[
          styles.messageRow,
          isUser ? styles.userRow : styles.assistantRow,
        ]}
      >
        {/* Avatar Julie */}
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🌸</Text>
          </View>
        )}

        {/* Bulle */}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {msg.image_base64 && (
            <Image
              source={{ uri: msg.image_base64 }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {msg.content}
          </Text>
        </View>
      </View>
    );
  }

  /* ─── UI ─── */

  const canSend = message.trim().length > 0 || selectedImage !== null;

  return (
    <SafeAreaView style={styles.page}>
      <Header title="Chat Julie" subtitle="Experte tricot & crochet" back />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatArea}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Messages list */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(renderMessage)}

          {/* Loading indicator */}
          {isLoading && (
            <View style={[styles.messageRow, styles.assistantRow]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>🌸</Text>
              </View>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={colors.blushDeep} />
                <Text style={styles.loadingText}>Julie réfléchit...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick suggestions (only before first user message) */}
        {!message.trim() && !selectedImage && messages.length <= 1 && (
          <View style={styles.suggestionsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContent}
            >
              {QUICK_SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.chip}
                  activeOpacity={0.7}
                  onPress={() => setMessage(s.text)}
                >
                  <Text style={styles.chipEmoji}>{s.emoji}</Text>
                  <Text style={styles.chipText}>{s.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Selected image preview */}
        {selectedImage && (
          <View style={styles.previewBar}>
            <Image source={{ uri: selectedImage }} style={styles.preview} />
            <TouchableOpacity
              onPress={removeImage}
              style={styles.previewRemove}
              accessibilityLabel="Retirer l'image"
            >
              <Ionicons name="close-circle" size={24} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              onPress={takePhoto}
              style={styles.attachBtn}
              accessibilityLabel="Prendre une photo"
            >
              <Ionicons name="camera-outline" size={22} color={colors.blushDeep} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.attachBtn}
              accessibilityLabel="Choisir une photo"
            >
              <Ionicons name="image-outline" size={22} color={colors.blushDeep} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Posez votre question..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              disabled={!canSend || isLoading}
              accessibilityLabel="Envoyer"
              accessibilityRole="button"
            >
              <Ionicons
                name="send"
                size={18}
                color={canSend ? colors.white : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <BottomTab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  chatArea: {
    flex: 1,
  },

  /* Messages */
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blushSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarEmoji: {
    fontSize: 18,
  },

  bubble: {
    maxWidth: '75%',
    padding: 14,
    borderRadius: radii.lg,
  },
  userBubble: {
    backgroundColor: colors.blushDeep,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.white,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },

  /* Loading */
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radii.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },

  /* Suggestions */
  suggestionsBar: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    maxHeight: 56,
  },
  suggestionsContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.round,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
    maxWidth: 180,
  },

  /* Image preview */
  previewBar: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  preview: {
    width: 100,
    height: 75,
    borderRadius: spacing.sm,
  },
  previewRemove: {
    marginLeft: spacing.xs,
    marginTop: -4,
  },

  /* Input */
  inputBar: {
    padding: spacing.md,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  attachBtn: {
    padding: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.blushDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.line,
  },
});

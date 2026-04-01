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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const QUICK_SUGGESTIONS = [
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
    // Add welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Bonjour ! Je suis Julie, votre assistante experte en tricot et crochet. 🧶\n\nComment puis-je vous aider aujourd\'hui ?\n\n• Analysez une photo de votre projet\n• Demandez des conseils sur les aiguilles ou la laine\n• Obtenez des estimations de temps\n• Apprenez de nouvelles techniques',
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à vos photos.');
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
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra.');
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
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const sendMessageFallback = async (content: string, img: string | null, convId: string | null) => {
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
      setMessages(prev => [...prev, {
        id: data.message_id || Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      }]);
    } catch {
      Alert.alert('Erreur', 'Impossible de contacter Julie. Vérifiez votre connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
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
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setSelectedImage(null);

    // Try streaming endpoint first
    const assistantId = (Date.now() + 1).toString();
    let usedStreaming = false;
    try {
      const resp = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId, message: content, image_base64: img }),
      });
      if (!resp.ok || !resp.body) throw new Error('no stream');
      usedStreaming = true;
      setIsStreaming(true);
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() }]);

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
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: snap } : m));
            }
            if (parsed.conversation_id && !conversationId) setConversationId(parsed.conversation_id);
          } catch {}
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
  };

  const renderMessage = (msg: Message) => {
    const isUser = msg.role === 'user';
    
    return (
      <View
        key={msg.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Ionicons name="flower-outline" size={20} color="#D4AF37" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
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
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Assistant Julie</Text>
          <Text style={styles.headerSubtitle}>Expert tricot & crochet</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: 'Bonjour ! Je suis Julie, votre assistante experte en tricot et crochet. 🧶\n\nComment puis-je vous aider aujourd\'hui ?',
              timestamp: new Date().toISOString(),
            }]);
            setConversationId(null);
          }}
          style={styles.newChatButton}
        >
          <Ionicons name="add-circle-outline" size={24} color="#D4AF37" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.avatarContainer}>
                <Ionicons name="flower-outline" size={20} color="#D4AF37" />
              </View>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#D4AF37" />
                <Text style={styles.loadingText}>Julie réfléchit...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestions */}
        {!message.trim() && !selectedImage && messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}
            contentContainerStyle={styles.suggestionsContent}>
            {QUICK_SUGGESTIONS.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionChip} onPress={() => setMessage(s.text)}>
                <Text style={styles.suggestionEmoji}>{s.emoji}</Text>
                <Text style={styles.suggestionText}>{s.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity onPress={removeImage} style={styles.removeImageButton}>
              <Ionicons name="close-circle" size={24} color="#FF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={takePhoto} style={styles.attachButton}>
              <Ionicons name="camera-outline" size={24} color="#D4AF37" />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
              <Ionicons name="image-outline" size={24} color="#D4AF37" />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Posez votre question..."
              placeholderTextColor="#666666"
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendButton,
                (!message.trim() && !selectedImage) && styles.sendButtonDisabled,
              ]}
              disabled={(!message.trim() && !selectedImage) || isLoading}
            >
              <Ionicons
                name="send"
                size={20}
                color={(!message.trim() && !selectedImage) ? '#666666' : '#0A0A0A'}
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#D4AF37',
    marginTop: 2,
  },
  newChatButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#D4AF37',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  messageText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#0A0A0A',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  loadingText: {
    fontSize: 14,
    color: '#888888',
    marginLeft: 8,
  },
  imagePreviewContainer: {
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  imagePreview: {
    width: 100,
    height: 75,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    left: 104,
  },
  inputContainer: {
    padding: 12,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  attachButton: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2A2A2A',
  },
  suggestionsScroll: {
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  suggestionsContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 6,
  },
  suggestionEmoji: {
    fontSize: 14,
  },
  suggestionText: {
    fontSize: 13,
    color: '#CCCCCC',
    maxWidth: 180,
  },
});

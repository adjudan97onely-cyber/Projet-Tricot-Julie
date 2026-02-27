import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  image_base64?: string;
  price?: string;
  available: boolean;
  featured: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'all', label: 'Tout' },
  { value: 'bonnet', label: 'Bonnets' },
  { value: 'echarpe', label: 'Écharpes' },
  { value: 'pull', label: 'Pulls' },
  { value: 'couverture', label: 'Couvertures' },
  { value: 'accessoire', label: 'Accessoires' },
  { value: 'autre', label: 'Autres' },
];

export default function GalleryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'bonnet',
    price: '',
    available: true,
    featured: false,
  });

  const fetchItems = async () => {
    try {
      const url = selectedCategory === 'all' 
        ? `${BACKEND_URL}/api/gallery`
        : `${BACKEND_URL}/api/gallery?category=${selectedCategory}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching gallery:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems();
  }, [selectedCategory]);

  const pickImage = async () => {
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

  const createItem = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un titre.');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          image_base64: selectedImage,
        }),
      });

      if (response.ok) {
        setModalVisible(false);
        setFormData({
          title: '',
          description: '',
          category: 'bonnet',
          price: '',
          available: true,
          featured: false,
        });
        setSelectedImage(null);
        fetchItems();
      } else {
        Alert.alert('Erreur', 'Impossible d\'ajouter l\'élément.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'élément.');
    }
  };

  const deleteItem = async (itemId: string) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer cet élément ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/gallery/${itemId}`, {
                method: 'DELETE',
              });
              fetchItems();
            } catch (error) {
              console.error('Error deleting item:', error);
            }
          },
        },
      ]
    );
  };

  const renderItem = (item: GalleryItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.itemCard}
      onPress={() => router.push({ pathname: '/gallery-detail', params: { id: item.id } })}
      onLongPress={() => deleteItem(item.id)}
      activeOpacity={0.8}
    >
      {item.image_base64 ? (
        <Image source={{ uri: item.image_base64 }} style={styles.itemImage} />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <Ionicons name="image-outline" size={40} color="#D4AF37" />
        </View>
      )}
      {item.featured && (
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={12} color="#0A0A0A" />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        {item.price && <Text style={styles.itemPrice}>{item.price}</Text>}
        <View style={styles.itemFooter}>
          <View style={[styles.availabilityBadge, !item.available && styles.unavailableBadge]}>
            <Text style={styles.availabilityText}>
              {item.available ? 'Disponible' : 'Vendu'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ma Galerie</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#D4AF37" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <View style={styles.categoryContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryButton,
                selectedCategory === cat.value && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat.value && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Gallery Grid */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.gridContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color="#333333" />
            <Text style={styles.emptyTitle}>Galerie vide</Text>
            <Text style={styles.emptyText}>
              Ajoutez vos créations pour les montrer à vos clients !
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={20} color="#0A0A0A" />
              <Text style={styles.createButtonText}>Ajouter une création</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map(renderItem)}
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nouvelle Création</Text>
            <TouchableOpacity onPress={createItem}>
              <Text style={styles.saveButton}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              ) : (
                <View style={styles.imagePickerContent}>
                  <Ionicons name="camera-outline" size={40} color="#D4AF37" />
                  <Text style={styles.imagePickerText}>Ajouter une photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Titre *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Ex: Bonnet torsadé bleu"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Décrivez votre création..."
                placeholderTextColor="#666666"
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryOptions}>
                  {CATEGORIES.filter(c => c.value !== 'all').map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryOption,
                        formData.category === cat.value && styles.categoryOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, category: cat.value })}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          formData.category === cat.value && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Prix indicatif</Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                placeholder="Ex: 35€"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Disponible à la commande</Text>
                <Text style={styles.switchHint}>Les clients peuvent commander</Text>
              </View>
              <Switch
                value={formData.available}
                onValueChange={(value) => setFormData({ ...formData, available: value })}
                trackColor={{ false: '#2A2A2A', true: '#D4AF37' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Mettre en avant</Text>
                <Text style={styles.switchHint}>Apparaît en priorité</Text>
              </View>
              <Switch
                value={formData.featured}
                onValueChange={(value) => setFormData({ ...formData, featured: value })}
                trackColor={{ false: '#2A2A2A', true: '#D4AF37' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </ScrollView>
        </View>
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
  addButton: {
    padding: 8,
  },
  categoryScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  categoryButtonActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  categoryText: {
    fontSize: 13,
    color: '#888888',
  },
  categoryTextActive: {
    color: '#0A0A0A',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  gridContainer: {
    padding: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    width: (width - 36) / 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  itemImage: {
    width: '100%',
    height: 150,
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    padding: 4,
  },
  itemInfo: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
  },
  availabilityBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unavailableBadge: {
    backgroundColor: 'rgba(136, 136, 136, 0.2)',
  },
  availabilityText: {
    fontSize: 11,
    color: '#4CAF50',
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
    paddingHorizontal: 40,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
    marginLeft: 8,
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  imagePickerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
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
    height: 100,
    textAlignVertical: 'top',
  },
  categoryOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  categoryOptionSelected: {
    backgroundColor: '#D4AF37',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#D4AF37',
  },
  categoryOptionTextSelected: {
    color: '#0A0A0A',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  switchLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  switchHint: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
});

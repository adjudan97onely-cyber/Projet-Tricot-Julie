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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import BottomTab from './components/BottomTab';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface Project {
  id: string;
  name: string;
  description: string;
  project_type: string;
  yarn_type?: string;
  needle_size?: string;
  status: string;
  image_base64?: string;
  notes?: string;
  estimated_time?: string;
  created_at: string;
  updated_at: string;
}

const PROJECT_TYPES = [
  { value: 'bonnet', label: 'Bonnet', icon: 'happy-outline' },
  { value: 'echarpe', label: 'Écharpe', icon: 'resize-outline' },
  { value: 'pull', label: 'Pull', icon: 'shirt-outline' },
  { value: 'chaussettes', label: 'Chaussettes', icon: 'footsteps-outline' },
  { value: 'couverture', label: 'Couverture', icon: 'bed-outline' },
  { value: 'accessoire', label: 'Accessoire', icon: 'diamond-outline' },
  { value: 'autre', label: 'Autre', icon: 'ellipsis-horizontal-outline' },
];

const STATUS_OPTIONS = [
  { value: 'en_cours', label: 'En cours', color: '#D4AF37' },
  { value: 'en_pause', label: 'En pause', color: '#888888' },
  { value: 'termine', label: 'Terminé', color: '#4CAF50' },
];

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_type: 'bonnet',
    yarn_type: '',
    needle_size: '',
    notes: '',
  });

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects();
  }, []);

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

  const createProject = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le projet.');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          image_base64: selectedImage,
        }),
      });

      if (response.ok) {
        setModalVisible(false);
        setFormData({
          name: '',
          description: '',
          project_type: 'bonnet',
          yarn_type: '',
          needle_size: '',
          notes: '',
        });
        setSelectedImage(null);
        fetchProjects();
      } else {
        Alert.alert('Erreur', 'Impossible de créer le projet.');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Erreur', 'Impossible de créer le projet.');
    }
  };

  const deleteProject = async (projectId: string) => {
    Alert.alert(
      'Supprimer le projet',
      'Êtes-vous sûr de vouloir supprimer ce projet ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
                method: 'DELETE',
              });
              fetchProjects();
            } catch (error) {
              console.error('Error deleting project:', error);
            }
          },
        },
      ]
    );
  };

  const getProjectTypeInfo = (type: string) => {
    return PROJECT_TYPES.find(t => t.value === type) || PROJECT_TYPES[PROJECT_TYPES.length - 1];
  };

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const renderProjectCard = (project: Project) => {
    const typeInfo = getProjectTypeInfo(project.project_type);
    const statusInfo = getStatusInfo(project.status);

    return (
      <TouchableOpacity
        key={project.id}
        style={styles.projectCard}
        onPress={() => router.push({
          pathname: '/project-detail',
          params: { id: project.id }
        })}
        onLongPress={() => deleteProject(project.id)}
        activeOpacity={0.8}
      >
        {project.image_base64 ? (
          <Image
            source={{ uri: project.image_base64 }}
            style={styles.projectImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.projectImagePlaceholder}>
            <Ionicons name={typeInfo.icon as any} size={40} color="#D4AF37" />
          </View>
        )}
        <View style={styles.projectInfo}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <Text style={styles.statusText}>{statusInfo.label}</Text>
            </View>
          </View>
          <Text style={styles.projectType}>{typeInfo.label}</Text>
          {project.yarn_type && (
            <Text style={styles.projectDetail} numberOfLines={1}>
              <Ionicons name="color-palette-outline" size={12} color="#888" /> {project.yarn_type}
            </Text>
          )}
          {project.needle_size && (
            <Text style={styles.projectDetail} numberOfLines={1}>
              <Ionicons name="construct-outline" size={12} color="#888" /> Aiguilles {project.needle_size}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Projets</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#D4AF37" />
        </TouchableOpacity>
      </View>

      {/* Projects List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D4AF37"
          />
        }
      >
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color="#333333" />
            <Text style={styles.emptyTitle}>Aucun projet</Text>
            <Text style={styles.emptyText}>
              Commencez par créer votre premier projet de tricot ou crochet !
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#0A0A0A" />
              <Text style={styles.createButtonText}>Créer un projet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          projects.map(renderProjectCard)
        )}
      </ScrollView>

      {/* Create Project Modal */}
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
            <Text style={styles.modalTitle}>Nouveau Projet</Text>
            <TouchableOpacity onPress={createProject}>
              <Text style={styles.saveButton}>Créer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Image Picker */}
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

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom du projet *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ex: Bonnet d'hiver"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Décrivez votre projet..."
                placeholderTextColor="#666666"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type de projet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeOptions}>
                  {PROJECT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        formData.project_type === type.value && styles.typeOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, project_type: type.value })}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={20}
                        color={formData.project_type === type.value ? '#0A0A0A' : '#D4AF37'}
                      />
                      <Text
                        style={[
                          styles.typeOptionText,
                          formData.project_type === type.value && styles.typeOptionTextSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type de laine</Text>
              <TextInput
                style={styles.input}
                value={formData.yarn_type}
                onChangeText={(text) => setFormData({ ...formData, yarn_type: text })}
                placeholder="Ex: Mérinos, Alpaga, Coton..."
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Taille d'aiguilles</Text>
              <TextInput
                style={styles.input}
                value={formData.needle_size}
                onChangeText={(text) => setFormData({ ...formData, needle_size: text })}
                placeholder="Ex: 4mm, 5mm..."
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Notes supplémentaires..."
                placeholderTextColor="#666666"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  projectCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  projectImage: {
    width: '100%',
    height: 180,
  },
  projectImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    padding: 16,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  projectType: {
    fontSize: 14,
    color: '#D4AF37',
    marginBottom: 8,
  },
  projectDetail: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
  typeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  typeOptionSelected: {
    backgroundColor: '#D4AF37',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#D4AF37',
    marginLeft: 6,
  },
  typeOptionTextSelected: {
    color: '#0A0A0A',
  },
});

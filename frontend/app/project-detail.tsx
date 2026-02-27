import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_type: 'bonnet',
    yarn_type: '',
    needle_size: '',
    notes: '',
  });

  const fetchProject = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        setFormData({
          name: data.name,
          description: data.description || '',
          project_type: data.project_type,
          yarn_type: data.yarn_type || '',
          needle_size: data.needle_size || '',
          notes: data.notes || '',
        });
        setSelectedImage(data.image_base64 || null);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

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

  const updateProject = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          image_base64: selectedImage,
        }),
      });

      if (response.ok) {
        setEditModalVisible(false);
        fetchProject();
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour le projet.');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le projet.');
    }
  };

  const deleteProject = () => {
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
              await fetch(`${BACKEND_URL}/api/projects/${id}`, {
                method: 'DELETE',
              });
              router.back();
            } catch (error) {
              console.error('Error deleting project:', error);
            }
          },
        },
      ]
    );
  };

  const askAIAboutProject = () => {
    if (project) {
      router.push({
        pathname: '/chat',
        params: {
          projectImage: project.image_base64 || '',
          projectName: project.name,
        },
      });
    }
  };

  const getProjectTypeInfo = (type: string) => {
    return PROJECT_TYPES.find(t => t.value === type) || PROJECT_TYPES[PROJECT_TYPES.length - 1];
  };

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  if (isLoading || !project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeInfo = getProjectTypeInfo(project.project_type);
  const statusInfo = getStatusInfo(project.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.actionButton}>
            <Ionicons name="create-outline" size={22} color="#D4AF37" />
          </TouchableOpacity>
          <TouchableOpacity onPress={deleteProject} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={22} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Project Image */}
        {project.image_base64 ? (
          <Image
            source={{ uri: project.image_base64 }}
            style={styles.projectImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.projectImagePlaceholder}>
            <Ionicons name={typeInfo.icon as any} size={60} color="#D4AF37" />
          </View>
        )}

        {/* Status and Type */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
          <View style={styles.typeBadge}>
            <Ionicons name={typeInfo.icon as any} size={16} color="#D4AF37" />
            <Text style={styles.typeText}>{typeInfo.label}</Text>
          </View>
        </View>

        {/* Project Details */}
        <View style={styles.detailsCard}>
          {project.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{project.description}</Text>
            </View>
          )}

          {project.yarn_type && (
            <View style={styles.detailRow}>
              <View style={styles.detailHeader}>
                <Ionicons name="color-palette-outline" size={18} color="#D4AF37" />
                <Text style={styles.detailLabel}>Type de laine</Text>
              </View>
              <Text style={styles.detailValue}>{project.yarn_type}</Text>
            </View>
          )}

          {project.needle_size && (
            <View style={styles.detailRow}>
              <View style={styles.detailHeader}>
                <Ionicons name="construct-outline" size={18} color="#D4AF37" />
                <Text style={styles.detailLabel}>Taille d'aiguilles</Text>
              </View>
              <Text style={styles.detailValue}>{project.needle_size}</Text>
            </View>
          )}

          {project.notes && (
            <View style={styles.detailRow}>
              <View style={styles.detailHeader}>
                <Ionicons name="document-text-outline" size={18} color="#D4AF37" />
                <Text style={styles.detailLabel}>Notes</Text>
              </View>
              <Text style={styles.detailValue}>{project.notes}</Text>
            </View>
          )}
        </View>

        {/* Ask AI Button */}
        <TouchableOpacity style={styles.aiButton} onPress={askAIAboutProject}>
          <Ionicons name="sparkles" size={24} color="#0A0A0A" />
          <Text style={styles.aiButtonText}>Demander conseil à Julie</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Modifier le projet</Text>
            <TouchableOpacity onPress={updateProject}>
              <Text style={styles.saveButton}>Enregistrer</Text>
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
              <Text style={styles.label}>Nom du projet</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Nom du projet"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Description"
                placeholderTextColor="#666666"
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type de laine</Text>
              <TextInput
                style={styles.input}
                value={formData.yarn_type}
                onChangeText={(text) => setFormData({ ...formData, yarn_type: text })}
                placeholder="Type de laine"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Taille d'aiguilles</Text>
              <TextInput
                style={styles.input}
                value={formData.needle_size}
                onChangeText={(text) => setFormData({ ...formData, needle_size: text })}
                placeholder="Taille d'aiguilles"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Notes"
                placeholderTextColor="#666666"
                multiline
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888888',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  projectImage: {
    width: '100%',
    height: 250,
  },
  projectImagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  typeText: {
    fontSize: 13,
    color: '#D4AF37',
    marginLeft: 6,
  },
  detailsCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  detailRow: {
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
    marginLeft: 10,
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
});

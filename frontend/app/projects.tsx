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
import Header from './components/Header';
import Badge from './components/Badge';
import { adminFetch } from './services/adminAccess';
import { colors, spacing, radii, shadows } from './theme';

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
  { value: 'en_cours', label: 'En cours', tone: 'gold' as const },
  { value: 'en_pause', label: 'En pause', tone: 'neutral' as const },
  { value: 'termine', label: 'Terminé', tone: 'sage' as const },
];

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
      const response = await adminFetch(`${BACKEND_URL}/api/projects`, {
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
              await adminFetch(`${BACKEND_URL}/api/projects/${projectId}`, {
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
    return PROJECT_TYPES.find((t) => t.value === type) || PROJECT_TYPES[PROJECT_TYPES.length - 1];
  };

  const getStatusOption = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  };

  const renderProjectCard = (project: Project) => {
    const typeInfo = getProjectTypeInfo(project.project_type);
    const statusOption = getStatusOption(project.status);

    return (
      <TouchableOpacity
        key={project.id}
        style={styles.projectCard}
        onPress={() =>
          router.push({
            pathname: '/project-detail',
            params: { id: project.id },
          })
        }
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
            <Ionicons name={typeInfo.icon as any} size={40} color={colors.blushDeep} />
          </View>
        )}
        <View style={styles.projectInfo}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectName} numberOfLines={1}>
              {project.name}
            </Text>
            <Badge label={statusOption.label} tone={statusOption.tone} />
          </View>
          <Text style={styles.projectType}>{typeInfo.label}</Text>
          {project.yarn_type ? (
            <Text style={styles.projectDetail} numberOfLines={1}>
              <Ionicons name="color-palette-outline" size={12} color={colors.textMuted} />{' '}
              {project.yarn_type}
            </Text>
          ) : null}
          {project.needle_size ? (
            <Text style={styles.projectDetail} numberOfLines={1}>
              <Ionicons name="construct-outline" size={12} color={colors.textMuted} /> Aiguilles{' '}
              {project.needle_size}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const addButton = (
    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
      <Ionicons name="add" size={24} color={colors.blushDeep} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Mes Projets" back right={addButton} />

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
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color={colors.line} />
            <Text style={styles.emptyTitle}>Aucun projet</Text>
            <Text style={styles.emptyText}>
              Commencez par créer votre premier projet de tricot ou crochet !
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={20} color={colors.white} />
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
              <Ionicons name="close" size={24} color={colors.text} />
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
                  <Ionicons name="camera-outline" size={40} color={colors.blushDeep} />
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
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Décrivez votre projet..."
                placeholderTextColor={colors.textMuted}
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
                        color={
                          formData.project_type === type.value ? colors.white : colors.blushDeep
                        }
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
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Taille d'aiguilles</Text>
              <TextInput
                style={styles.input}
                value={formData.needle_size}
                onChangeText={(text) => setFormData({ ...formData, needle_size: text })}
                placeholder="Ex: 4mm, 5mm..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Notes supplémentaires..."
                placeholderTextColor={colors.textMuted}
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
    backgroundColor: colors.cream,
  },
  addButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  projectImage: {
    width: '100%',
    height: 180,
  },
  projectImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: colors.blushSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    padding: spacing.lg,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  projectType: {
    fontSize: 14,
    color: colors.blushDeep,
    marginBottom: spacing.sm,
  },
  projectDetail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 40,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blushDeep,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radii.md,
    marginTop: spacing.xl,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: spacing.sm,
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blushDeep,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    backgroundColor: colors.blushSoft,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
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
    color: colors.textMuted,
    marginTop: spacing.sm,
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
    height: 100,
    textAlignVertical: 'top',
  },
  typeOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.blushDeep,
  },
  typeOptionSelected: {
    backgroundColor: colors.blushDeep,
  },
  typeOptionText: {
    fontSize: 14,
    color: colors.blushDeep,
    marginLeft: 6,
  },
  typeOptionTextSelected: {
    color: colors.white,
  },
});

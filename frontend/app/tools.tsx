import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomTab from './components/BottomTab';
import Header from './components/Header';
import { colors, spacing, radii, shadows } from './theme';

const { width } = Dimensions.get('window');

// ─── COMPTEUR DE RANGS ──────────────────────────────────────────────────────

interface Counter {
  id: string;
  name: string;
  value: number;
  target?: number;
}

function RangCounter() {
  const [counters, setCounters] = useState<Counter[]>([
    { id: '1', name: 'Rang principal', value: 0 },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addTarget, setAddTarget] = useState('');

  const increment = (id: string) => {
    setCounters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, value: c.value + 1 } : c))
    );
  };

  const decrement = (id: string) => {
    setCounters((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, value: Math.max(0, c.value - 1) } : c
      )
    );
  };

  const reset = (id: string) => {
    Alert.alert('Remettre à zéro', 'Confirmer la remise à zéro ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        style: 'destructive',
        onPress: () =>
          setCounters((prev) =>
            prev.map((c) => (c.id === id ? { ...c, value: 0 } : c))
          ),
      },
    ]);
  };

  const deleteCounter = (id: string) => {
    if (counters.length === 1) {
      Alert.alert('Impossible', 'Il faut au moins un compteur.');
      return;
    }
    setCounters((prev) => prev.filter((c) => c.id !== id));
  };

  const addCounter = () => {
    if (!addName.trim()) return;
    const newCounter: Counter = {
      id: Date.now().toString(),
      name: addName.trim(),
      value: 0,
      target: addTarget ? parseInt(addTarget) : undefined,
    };
    setCounters((prev) => [...prev, newCounter]);
    setAddName('');
    setAddTarget('');
    setShowAddModal(false);
  };

  return (
    <View style={styles.toolSection}>
      <View style={styles.toolTitleRow}>
        <Ionicons name="layers-outline" size={22} color={colors.blushDeep} />
        <Text style={styles.toolTitle}>Compteur de Rangs</Text>
        <TouchableOpacity
          style={styles.addSmallBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color={colors.blushDeep} />
        </TouchableOpacity>
      </View>

      {counters.map((counter) => {
        const progress =
          counter.target && counter.target > 0
            ? Math.min(counter.value / counter.target, 1)
            : null;

        return (
          <View key={counter.id} style={styles.counterCard}>
            <View style={styles.counterHeader}>
              <Text style={styles.counterName}>{counter.name}</Text>
              {counter.target ? (
                <Text style={styles.counterTarget}>
                  / {counter.target} rangs
                </Text>
              ) : null}
              <TouchableOpacity
                onPress={() => deleteCounter(counter.id)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {progress !== null ? (
              <View style={styles.progressBarBg}>
                <View
                  style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
                />
              </View>
            ) : null}

            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => decrement(counter.id)}
              >
                <Ionicons name="remove" size={28} color={colors.blushDeep} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => reset(counter.id)}
                style={styles.counterValueContainer}
              >
                <Text style={styles.counterValue}>{counter.value}</Text>
                <Text style={styles.counterValueLabel}>rangs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.counterBtn, styles.counterBtnPrimary]}
                onPress={() => increment(counter.id)}
              >
                <Ionicons name="add" size={28} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Modal for adding counter */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nouveau compteur</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom (ex: Rangs jersey)"
              placeholderTextColor={colors.textMuted}
              value={addName}
              onChangeText={setAddName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Objectif (optionnel, ex: 80)"
              placeholderTextColor={colors.textMuted}
              value={addTarget}
              onChangeText={setAddTarget}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={addCounter}>
                <Text style={styles.modalConfirmText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── CALCULATEUR DE LAINE ────────────────────────────────────────────────────

const YARN_WEIGHTS = [
  { label: 'Lace (800m/100g)', mPerGram: 8 },
  { label: 'Fingering (400m/100g)', mPerGram: 4 },
  { label: 'DK (230m/100g)', mPerGram: 2.3 },
  { label: 'Worsted/Aran (180m/100g)', mPerGram: 1.8 },
  { label: 'Bulky (100m/100g)', mPerGram: 1 },
  { label: 'Super Bulky (60m/100g)', mPerGram: 0.6 },
];

const PROJECT_TYPES_CALC = [
  { label: 'Bonnet adulte', baseMeters: 150 },
  { label: 'Bonnet enfant', baseMeters: 80 },
  { label: 'Écharpe simple', baseMeters: 200 },
  { label: 'Snood / Tour de cou', baseMeters: 150 },
  { label: 'Mitaines adulte', baseMeters: 100 },
  { label: 'Chaussettes (paire)', baseMeters: 350 },
  { label: 'Pull adulte S/M', baseMeters: 800 },
  { label: 'Pull adulte L/XL', baseMeters: 1000 },
  { label: 'Couverture bébé', baseMeters: 500 },
  { label: 'Plaid canapé', baseMeters: 1500 },
  { label: 'Doudou crochet (15cm)', baseMeters: 80 },
];

function YarnCalculator() {
  const [selectedProject, setSelectedProject] = useState(0);
  const [selectedWeight, setSelectedWeight] = useState(3);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<{ meters: number; grams: number; pelotes: number } | null>(null);

  const calculate = () => {
    const project = PROJECT_TYPES_CALC[selectedProject];
    const weight = YARN_WEIGHTS[selectedWeight];
    const totalMeters = project.baseMeters * quantity * 1.12; // +12% surplus
    const totalGrams = totalMeters / weight.mPerGram;
    const pelotesOf100g = Math.ceil(totalGrams / 100);
    setResult({
      meters: Math.round(totalMeters),
      grams: Math.round(totalGrams),
      pelotes: pelotesOf100g,
    });
  };

  return (
    <View style={styles.toolSection}>
      <View style={styles.toolTitleRow}>
        <Ionicons name="calculator-outline" size={22} color={colors.blushDeep} />
        <Text style={styles.toolTitle}>Calculateur de Laine</Text>
      </View>

      <Text style={styles.calcLabel}>Type de projet</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        <View style={styles.chipRow}>
          {PROJECT_TYPES_CALC.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, selectedProject === i && styles.chipActive]}
              onPress={() => { setSelectedProject(i); setResult(null); }}
            >
              <Text style={[styles.chipText, selectedProject === i && styles.chipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.calcLabel}>Épaisseur du fil</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        <View style={styles.chipRow}>
          {YARN_WEIGHTS.map((w, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, selectedWeight === i && styles.chipActive]}
              onPress={() => { setSelectedWeight(i); setResult(null); }}
            >
              <Text style={[styles.chipText, selectedWeight === i && styles.chipTextActive]}>
                {w.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.calcLabel}>Quantité à tricoter</Text>
      <View style={styles.quantityRow}>
        <TouchableOpacity
          style={styles.counterBtn}
          onPress={() => { setQuantity(Math.max(1, quantity - 1)); setResult(null); }}
        >
          <Ionicons name="remove" size={22} color={colors.blushDeep} />
        </TouchableOpacity>
        <Text style={styles.quantityValue}>{quantity} {quantity > 1 ? 'pièces' : 'pièce'}</Text>
        <TouchableOpacity
          style={[styles.counterBtn, styles.counterBtnPrimary]}
          onPress={() => { setQuantity(quantity + 1); setResult(null); }}
        >
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.calcBtn} onPress={calculate}>
        <Text style={styles.calcBtnText}>Calculer ✨</Text>
      </TouchableOpacity>

      {result ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>🧶 Résultat (avec 12% de surplus)</Text>
          <View style={styles.resultRow}>
            <View style={styles.resultItem}>
              <Text style={styles.resultValue}>{result.meters}m</Text>
              <Text style={styles.resultLabel}>de fil total</Text>
            </View>
            <View style={styles.resultDivider} />
            <View style={styles.resultItem}>
              <Text style={styles.resultValue}>{result.grams}g</Text>
              <Text style={styles.resultLabel}>de laine</Text>
            </View>
            <View style={styles.resultDivider} />
            <View style={styles.resultItem}>
              <Text style={[styles.resultValue, styles.resultHighlight]}>{result.pelotes}</Text>
              <Text style={styles.resultLabel}>pelotes 100g</Text>
            </View>
          </View>
          <Text style={styles.resultNote}>
            Achetez toujours du même lot de teinture pour éviter les variations de couleur.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── TIMER DE PROJET ─────────────────────────────────────────────────────────

function ProjectTimer() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<{ label: string; time: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const addLap = () => {
    const lapNumber = laps.length + 1;
    setLaps((prev) => [
      ...prev,
      { label: `Section ${lapNumber}`, time: elapsed },
    ]);
  };

  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
    setLaps([]);
  };

  return (
    <View style={styles.toolSection}>
      <View style={styles.toolTitleRow}>
        <Ionicons name="timer-outline" size={22} color={colors.blushDeep} />
        <Text style={styles.toolTitle}>Timer de Projet</Text>
      </View>

      <View style={styles.timerDisplay}>
        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        <Text style={styles.timerLabel}>heures : minutes : secondes</Text>
      </View>

      <View style={styles.timerButtons}>
        <TouchableOpacity
          style={[styles.timerBtn, styles.timerBtnSecondary]}
          onPress={addLap}
          disabled={!isRunning}
        >
          <Text style={[styles.timerBtnText, !isRunning && { opacity: 0.4 }]}>Section</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timerBtn, isRunning ? styles.timerBtnStop : styles.timerBtnStart]}
          onPress={() => setIsRunning(!isRunning)}
        >
          <Text style={styles.timerBtnTextMain}>
            {isRunning ? '⏸ Pause' : elapsed > 0 ? '▶ Reprendre' : '▶ Démarrer'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timerBtn, styles.timerBtnSecondary]}
          onPress={reset}
        >
          <Text style={styles.timerBtnText}>Réinitialiser</Text>
        </TouchableOpacity>
      </View>

      {laps.length > 0 ? (
        <View style={styles.lapsList}>
          <Text style={styles.lapsTitle}>Sections</Text>
          {laps.map((lap, i) => (
            <View key={i} style={styles.lapItem}>
              <Text style={styles.lapLabel}>{lap.label}</Text>
              <Text style={styles.lapTime}>{formatTime(lap.time)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ─── ÉCRAN PRINCIPAL ─────────────────────────────────────────────────────────

export default function ToolsScreen() {
  const [activeTab, setActiveTab] = useState<'counter' | 'calculator' | 'timer'>('counter');

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Mes Outils"
        subtitle="Compteur • Calculateur • Timer"
      />

      {/* Tab selector */}
      <View style={styles.tabSelector}>
        {(['counter', 'calculator', 'timer'] as const).map((tab) => {
          const labels = { counter: 'Compteur', calculator: 'Calculateur', timer: 'Timer' };
          const icons = { counter: 'layers-outline', calculator: 'calculator-outline', timer: 'timer-outline' };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabSelectorBtn, activeTab === tab && styles.tabSelectorActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={icons[tab] as any}
                size={18}
                color={activeTab === tab ? colors.white : colors.blushDeep}
              />
              <Text style={[styles.tabSelectorText, activeTab === tab && styles.tabSelectorTextActive]}>
                {labels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'counter' ? <RangCounter /> : null}
        {activeTab === 'calculator' ? <YarnCalculator /> : null}
        {activeTab === 'timer' ? <ProjectTimer /> : null}
      </ScrollView>

      <BottomTab />
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  tabSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  tabSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.blushDeep,
    backgroundColor: colors.cream,
    gap: 5,
  },
  tabSelectorActive: {
    backgroundColor: colors.blushDeep,
  },
  tabSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.blushDeep,
  },
  tabSelectorTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 24,
  },
  toolSection: {
    marginBottom: spacing.sm,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.lg,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  addSmallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.blushDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Counter
  counterCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  counterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  counterName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  counterTarget: {
    fontSize: 12,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    marginBottom: 14,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: colors.blushDeep,
    borderRadius: 2,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.blushDeep,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  counterBtnPrimary: {
    backgroundColor: colors.blushDeep,
    borderColor: colors.blushDeep,
  },
  counterValueContainer: {
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.blushDeep,
    lineHeight: 52,
  },
  counterValueLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: colors.cream,
    borderRadius: radii.sm,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  modalConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: radii.sm,
    backgroundColor: colors.blushDeep,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  // Calculator
  calcLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  chipScroll: {
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.blushDeep,
    borderColor: colors.blushDeep,
  },
  chipText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginVertical: spacing.md,
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    minWidth: 100,
    textAlign: 'center',
  },
  calcBtn: {
    backgroundColor: colors.blushDeep,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  calcBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 20,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.blushDeep,
    ...shadows.soft,
  },
  resultTitle: {
    fontSize: 14,
    color: colors.blushDeep,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  resultItem: {
    alignItems: 'center',
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  resultHighlight: {
    color: colors.blushDeep,
    fontSize: 34,
  },
  resultLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  resultDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.line,
  },
  resultNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.lg,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Timer
  timerDisplay: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 40,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  timerText: {
    fontSize: 54,
    fontWeight: '200',
    color: colors.blushDeep,
    letterSpacing: 4,
  },
  timerLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  timerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  timerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  timerBtnStart: {
    backgroundColor: colors.blushDeep,
    borderColor: colors.blushDeep,
  },
  timerBtnStop: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  timerBtnSecondary: {
    backgroundColor: colors.surface,
  },
  timerBtnText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  timerBtnTextMain: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '700',
  },
  lapsList: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  lapsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blushDeep,
    marginBottom: spacing.md,
  },
  lapItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lapLabel: {
    fontSize: 14,
    color: colors.text,
  },
  lapTime: {
    fontSize: 14,
    color: colors.blushDeep,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});

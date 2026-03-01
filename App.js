import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Smart Tasks — a To‑Do / Planner variant (Expo + React Native)
 * Differences vs a basic to‑do list:
 * - Categories (chips)
 * - Priority (Low/Med/High)
 * - Due date (simple text input, e.g. 2026-03-10)
 * - Filters (All / Active / Done)
 * - Edit task modal
 * - Persistent storage (AsyncStorage)
 */

const STORAGE_KEY = "SMART_TASKS_V1";

const COLORS = {
  bg: "#0B1220",
  card: "#111B2E",
  card2: "#0F1A2E",
  text: "#E6EEF8",
  muted: "#9FB0C2",
  line: "rgba(255,255,255,0.08)",
  accent: "#22C55E", // green
  accent2: "#06B6D4", // cyan
  danger: "#EF4444",
  warn: "#F59E0B",
};

const CATEGORIES = ["Study", "Personal", "Health", "Work", "Shopping"];

const PRIORITIES = [
  { key: "LOW", label: "Low", color: COLORS.accent2 },
  { key: "MED", label: "Medium", color: COLORS.warn },
  { key: "HIGH", label: "High", color: COLORS.danger },
];

function uid() {
  // good enough for lab use
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("ALL"); // ALL | ACTIVE | DONE

  // add form
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(""); // YYYY-MM-DD
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState(PRIORITIES[1].key);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // subtle animation for list
  const fade = useRef(new Animated.Value(0)).current;

  // ── Load / Save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setTasks(parsed);
        }
      } catch (e) {
        // ignore for lab
      } finally {
        Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      }
    })();
  }, [fade]);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      } catch (e) {
        // ignore for lab
      }
    })();
  }, [tasks]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    const active = total - done;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, active, pct };
  }, [tasks]);

  const visible = useMemo(() => {
    if (filter === "ACTIVE") return tasks.filter((t) => !t.done);
    if (filter === "DONE") return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const addTask = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const newTask = {
      id: uid(),
      title: trimmed,
      done: false,
      createdAt: Date.now(),
      due: due.trim(),
      category,
      priority,
    };

    setTasks((prev) => [newTask, ...prev]);
    setTitle("");
    setDue("");
  };

  const toggleDone = (id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const openEdit = (task) => {
    setEditing({ ...task });
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editing) return;
    const trimmed = (editing.title || "").trim();
    if (!trimmed) return;

    setTasks((prev) => prev.map((t) => (t.id === editing.id ? { ...editing, title: trimmed } : t)));
    setEditOpen(false);
    setEditing(null);
  };

  const clearDone = () => {
    setTasks((prev) => prev.filter((t) => !t.done));
  };

  // ── UI Helpers ──────────────────────────────────────────────────────────────
  const priorityMeta = (key) => PRIORITIES.find((p) => p.key === key) || PRIORITIES[1];

  const FilterPill = ({ id, label }) => {
    const active = filter === id;
    return (
      <TouchableOpacity
        onPress={() => setFilter(id)}
        style={[styles.pill, active && styles.pillActive]}
        activeOpacity={0.8}
      >
        <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const Chip = ({ value, selected, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{value}</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => {
    const p = priorityMeta(item.priority);
    return (
      <Pressable onLongPress={() => openEdit(item)} style={styles.item} android_ripple={{ color: "rgba(255,255,255,0.06)" }}>
        <TouchableOpacity onPress={() => toggleDone(item.id)} style={styles.check} activeOpacity={0.85}>
          <View style={[styles.checkInner, item.done && styles.checkInnerDone]} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.itemTitle, item.done && styles.itemTitleDone]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[styles.badge, { borderColor: p.color }]}>
              <Text style={[styles.badgeText, { color: p.color }]}>{p.label}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>#{item.category}</Text>
            {!!item.due && <Text style={styles.metaText}>Due: {item.due}</Text>}
          </View>
        </View>

        <TouchableOpacity onPress={() => removeTask(item.id)} style={styles.del} activeOpacity={0.85}>
          <Text style={styles.delText}>✕</Text>
        </TouchableOpacity>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>Smart Tasks</Text>
            <Text style={styles.sub}>Plan your day • Track progress • Long‑press to edit</Text>
          </View>

          <TouchableOpacity onPress={clearDone} style={styles.clearBtn} activeOpacity={0.85}>
            <Text style={styles.clearText}>Clear done</Text>
          </TouchableOpacity>
        </View>

        {/* Stats / Progress */}
        <View style={styles.statsCard}>
          <View style={styles.statsTop}>
            <Text style={styles.statsTitle}>Today’s progress</Text>
            <Text style={styles.statsNum}>
              {stats.done}/{stats.total} • {stats.pct}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${stats.pct}%` }]} />
          </View>

          <View style={styles.statsBottom}>
            <Text style={styles.statsSmall}>Active: {stats.active}</Text>
            <Text style={styles.statsSmall}>Done: {stats.done}</Text>
          </View>
        </View>

        {/* Add Form */}
        <View style={styles.form}>
          <TextInput
            placeholder="Add a task (e.g., Review Chapter 3)"
            placeholderTextColor="rgba(230,238,248,0.35)"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={addTask}
          />

          <View style={styles.row}>
            <TextInput
              placeholder="Due (YYYY-MM-DD) optional"
              placeholderTextColor="rgba(230,238,248,0.35)"
              value={due}
              onChangeText={setDue}
              style={[styles.input, { flex: 1 }]}
            />

            <TouchableOpacity onPress={addTask} style={styles.addBtn} activeOpacity={0.85}>
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowWrap}>
            <Text style={styles.label}>Category:</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <Chip key={c} value={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
          </View>

          <View style={styles.rowWrap}>
            <Text style={styles.label}>Priority:</Text>
            <View style={styles.chips}>
              {PRIORITIES.map((p) => (
                <Chip key={p.key} value={p.label} selected={priority === p.key} onPress={() => setPriority(p.key)} />
              ))}
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          <FilterPill id="ALL" label="All" />
          <FilterPill id="ACTIVE" label="Active" />
          <FilterPill id="DONE" label="Done" />
        </View>

        {/* List */}
        <Animated.View style={{ flex: 1, opacity: fade }}>
          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No tasks here</Text>
                <Text style={styles.emptySub}>Add a task above, or switch filters.</Text>
              </View>
            }
          />
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Edit Modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit task</Text>

            <TextInput
              value={editing?.title ?? ""}
              onChangeText={(v) => setEditing((prev) => ({ ...(prev || {}), title: v }))}
              style={styles.modalInput}
              placeholder="Task title"
              placeholderTextColor="rgba(230,238,248,0.35)"
            />

            <TextInput
              value={editing?.due ?? ""}
              onChangeText={(v) => setEditing((prev) => ({ ...(prev || {}), due: v }))}
              style={styles.modalInput}
              placeholder="Due (YYYY-MM-DD)"
              placeholderTextColor="rgba(230,238,248,0.35)"
            />

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.chips}>
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    value={c}
                    selected={editing?.category === c}
                    onPress={() => setEditing((prev) => ({ ...(prev || {}), category: c }))}
                  />
                ))}
              </View>
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Priority</Text>
              <View style={styles.chips}>
                {PRIORITIES.map((p) => (
                  <Chip
                    key={p.key}
                    value={p.label}
                    selected={editing?.priority === p.key}
                    onPress={() => setEditing((prev) => ({ ...(prev || {}), priority: p.key }))}
                  />
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditOpen(false)} style={[styles.modalBtn, styles.modalBtnGhost]} activeOpacity={0.85}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[styles.modalBtn, styles.modalBtnPrimary]} activeOpacity={0.85}>
                <Text style={styles.modalBtnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHint}>Tip: long‑press any task to edit it.</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  root: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  h1: { color: COLORS.text, fontSize: 28, fontWeight: "800" },
  sub: { color: COLORS.muted, marginTop: 4, fontSize: 12 },

  clearBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: COLORS.card },
  clearText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },

  statsCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.line, marginBottom: 12 },
  statsTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  statsTitle: { color: COLORS.text, fontWeight: "800", fontSize: 14 },
  statsNum: { color: COLORS.muted, fontWeight: "700", fontSize: 12 },

  progressTrack: { height: 12, borderRadius: 999, backgroundColor: COLORS.card2, overflow: "hidden", marginTop: 12 },
  progressFill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 999 },

  statsBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  statsSmall: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },

  form: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.line, marginBottom: 12 },
  input: {
    backgroundColor: COLORS.card2,
    color: COLORS.text,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    fontSize: 14,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  addBtn: { backgroundColor: COLORS.accent, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  addText: { color: "#06250F", fontWeight: "900" },

  rowWrap: { marginTop: 12 },
  label: { color: COLORS.muted, fontSize: 12, fontWeight: "800", marginBottom: 8 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line },
  chipSelected: { borderColor: COLORS.accent, backgroundColor: "rgba(34,197,94,0.14)" },
  chipText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  chipTextSelected: { color: COLORS.text },

  filters: { flexDirection: "row", gap: 10, marginBottom: 10 },
  pill: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  pillActive: { borderColor: COLORS.accent2, backgroundColor: "rgba(6,182,212,0.12)" },
  pillText: { color: COLORS.muted, fontWeight: "900" },
  pillTextActive: { color: COLORS.text },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 10,
  },
  check: { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, alignItems: "center", justifyContent: "center" },
  checkInner: { width: 14, height: 14, borderRadius: 4, backgroundColor: "transparent" },
  checkInnerDone: { backgroundColor: COLORS.accent },

  itemTitle: { color: COLORS.text, fontSize: 15, fontWeight: "900", flexShrink: 1 },
  itemTitleDone: { color: "rgba(230,238,248,0.55)", textDecorationLine: "line-through" },

  metaRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  metaText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },

  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "900" },

  del: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(239,68,68,0.12)", alignItems: "center", justifyContent: "center" },
  delText: { color: COLORS.danger, fontSize: 16, fontWeight: "900" },

  empty: { paddingTop: 18, alignItems: "center" },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
  emptySub: { color: COLORS.muted, marginTop: 6, fontSize: 12, textAlign: "center" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 520, backgroundColor: COLORS.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.line },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "900", marginBottom: 10 },
  modalInput: {
    backgroundColor: COLORS.card2,
    color: COLORS.text,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    fontSize: 14,
    marginBottom: 10,
  },
  modalRow: { marginTop: 4, marginBottom: 8 },
  modalLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "900", marginBottom: 8 },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  modalBtnGhost: { backgroundColor: "transparent", borderColor: COLORS.line },
  modalBtnGhostText: { color: COLORS.muted, fontWeight: "900" },
  modalBtnPrimary: { backgroundColor: COLORS.accent2, borderColor: COLORS.accent2 },
  modalBtnPrimaryText: { color: "#06212A", fontWeight: "900" },

  modalHint: { color: COLORS.muted, fontSize: 11, marginTop: 12, textAlign: "center" },
});

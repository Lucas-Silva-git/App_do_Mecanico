import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, Modal, ScrollView,
  StatusBar, Platform, SafeAreaView, KeyboardAvoidingView,
} from "react-native";
import { listarOrdens, criarOrdem, atualizarOrdem, deletarOrdem } from "./database";

// ─── Tokens ───
const COLORS = {
  bg: "#0F0F1A",
  surface: "#1A1A2E",
  card: "#1E1E32",
  border: "#2A2A45",
  red: "#E24B4A",
  redLight: "rgba(226,75,74,0.15)",
  green: "#1D9E75",
  greenLight: "rgba(29,158,117,0.15)",
  blue: "#378ADD",
  blueLight: "rgba(55,138,221,0.15)",
  amber: "#EF9F27",
  amberLight: "rgba(239,159,39,0.15)",
  textPrimary: "#F0F0F8",
  textSecondary: "#8888AA",
  textMuted: "#55556A",
};

const STATUS_LIST = ["Aguardando", "Em andamento", "Concluído"];
const STATUS_META = {
  "Aguardando":    { bg: COLORS.amberLight, text: COLORS.amber,  border: COLORS.amber },
  "Em andamento":  { bg: COLORS.blueLight,  text: COLORS.blue,   border: COLORS.blue },
  "Concluído":     { bg: COLORS.greenLight, text: COLORS.green,  border: COLORS.green },
};

const EMPTY = { nome: "", modelo: "", placa: "", problema: "", status: "Aguardando" };

// ─── Helpers ────
const validate = (form) => {
  const errs = {};
  if (!form.nome.trim())    errs.nome    = "Nome obrigatório";
  if (!form.modelo.trim())  errs.modelo  = "Modelo obrigatório";
  if (!form.placa.trim())   errs.placa   = "Placa obrigatória";
  else if (!/^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/i.test(form.placa.trim()))
    errs.placa = "Formato inválido (ex: ABC-1234)";
  if (!form.problema.trim()) errs.problema = "Problema obrigatório";
  return errs;
};

// ─── Sub-components ────
const Badge = ({ status }) => {
  const m = STATUS_META[status] ?? STATUS_META["Aguardando"];
  return (
    <View style={[styles.badge, { backgroundColor: m.bg, borderColor: m.border }]}>
      <Text style={[styles.badgeText, { color: m.text }]}>{status}</Text>
    </View>
  );
};

const Field = ({ label, value, onChangeText, placeholder, error, multiline, autoCapitalize }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      multiline={multiline}
      autoCapitalize={autoCapitalize ?? "words"}
      style={[styles.input, multiline && styles.inputMulti, error && styles.inputError]}
    />
    {error ? <Text style={styles.fieldError}>{error}</Text> : null}
  </View>
);

const StatCard = ({ label, value, color }) => (
  <View style={[styles.statCard, { borderColor: color + "55" }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Main App ────────

export default function App() {
  const [ordens, setOrdens]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [editId, setEditId]       = useState(null);
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listarOrdens();
      setOrdens(rows);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível carregar as ordens.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setForm(EMPTY); setEditId(null); setErrors({}); setModalOpen(true);
  };

  const openEdit = (o) => {
    setForm({ nome: o.nome, modelo: o.modelo, placa: o.placa, problema: o.problema, status: o.status });
    setEditId(o.id); setErrors({}); setModalOpen(true);
  };

  const handleSave = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editId) await atualizarOrdem({ id: editId, ...form });
      else        await criarOrdem(form);
      setModalOpen(false);
      await load();
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Remover ordem?", "Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: async () => {
          await deletarOrdem(id); await load();
        }},
      ]
    );
  };

  const setField = (key) => (val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: "" }));
  };

  const filtered = ordens.filter(o =>
    [o.nome, o.modelo, o.placa].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = STATUS_LIST.reduce((acc, s) => {
    acc[s] = ordens.filter(o => o.status === s).length; return acc;
  }, {});

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>🔧</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Mecânico Pro</Text>
            <Text style={styles.headerSub}>Ordens de serviço</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.btnNew} onPress={openNew} activeOpacity={0.8}>
          <Text style={styles.btnNewText}>+ Nova OS</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard label="Aguardando"   value={counts["Aguardando"]}   color={COLORS.amber} />
        <StatCard label="Em andamento" value={counts["Em andamento"]} color={COLORS.blue} />
        <StatCard label="Concluído"    value={counts["Concluído"]}    color={COLORS.green} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar nome, modelo ou placa..."
          placeholderTextColor={COLORS.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={{ color: COLORS.textMuted, fontSize: 18, paddingRight: 4 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={COLORS.red} style={{ marginTop: 48 }} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={o => String(o.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyText}>
                {search ? "Nenhum resultado encontrado." : "Nenhuma ordem cadastrada.\nToque em \"+ Nova OS\" para começar."}
              </Text>
            </View>
          }
          renderItem={({ item: o }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNome}>{o.nome}</Text>
                  <Text style={styles.cardSub}>{o.modelo} · <Text style={styles.cardPlaca}>{o.placa}</Text></Text>
                </View>
                <Badge status={o.status} />
              </View>

              <View style={styles.cardProblema}>
                <Text style={styles.cardProblemaLabel}>Problema</Text>
                <Text style={styles.cardProblemaText}>{o.problema}</Text>
              </View>

              <Text style={styles.cardDate}>{o.criado_em?.slice(0, 16).replace("T", " ")}</Text>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.btnEdit} onPress={() => openEdit(o)} activeOpacity={0.8}>
                  <Text style={styles.btnEditText}>✏️  Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(o.id)} activeOpacity={0.8}>
                  <Text style={styles.btnDeleteText}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Form */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editId ? "Editar Ordem" : "Nova Ordem de Serviço"}</Text>
                <TouchableOpacity onPress={() => setModalOpen(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Field label="Nome do Cliente"  value={form.nome}     onChangeText={setField("nome")}     placeholder="Ex: João da Silva"         error={errors.nome} />
                <Field label="Modelo do Carro"  value={form.modelo}   onChangeText={setField("modelo")}   placeholder="Ex: Honda Civic 2020"       error={errors.modelo} />
                <Field label="Placa do Carro"   value={form.placa}    onChangeText={setField("placa")}    placeholder="Ex: ABC-1234 ou ABC1D23"    error={errors.placa}   autoCapitalize="characters" />
                <Field label="Problema"         value={form.problema} onChangeText={setField("problema")} placeholder="Descreva o problema..."     error={errors.problema} multiline />

                {/* Seletor de Status */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.statusRow}>
                    {STATUS_LIST.map(s => {
                      const m = STATUS_META[s];
                      const active = form.status === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[styles.statusChip, active && { backgroundColor: m.bg, borderColor: m.border }]}
                          onPress={() => setForm(f => ({ ...f, status: s }))}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.statusChipText, active && { color: m.text }]}>{s}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Ações */}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.btnCancel} onPress={() => setModalOpen(false)} activeOpacity={0.8}>
                    <Text style={styles.btnCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnSave} onPress={handleSave} activeOpacity={0.8} disabled={saving}>
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.btnSaveText}>{editId ? "Salvar alterações" : "Criar ordem"}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Estilos ────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },

  // Header
  header:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerLeft:       { flexDirection: "row", alignItems: "center", gap: 10 },
  logo:             { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.red, alignItems: "center", justifyContent: "center" },
  logoIcon:         { fontSize: 18 },
  headerTitle:      { color: COLORS.textPrimary, fontSize: 16, fontWeight: "600" },
  headerSub:        { color: COLORS.textSecondary, fontSize: 12 },
  btnNew:           { backgroundColor: COLORS.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnNewText:       { color: "#fff", fontWeight: "600", fontSize: 13 },

  // Stats
  statsRow:         { flexDirection: "row", padding: 12, gap: 8 },
  statCard:         { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, padding: 12, alignItems: "center", borderWidth: 1 },
  statValue:        { fontSize: 22, fontWeight: "700" },
  statLabel:        { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, textAlign: "center" },

  // Search
  searchWrap:       { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 4, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 },
  searchIcon:       { fontSize: 16, marginRight: 8 },
  searchInput:      { flex: 1, color: COLORS.textPrimary, paddingVertical: 11, fontSize: 14 },

  // Card
  card:             { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader:       { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  cardNome:         { color: COLORS.textPrimary, fontSize: 15, fontWeight: "600" },
  cardSub:          { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  cardPlaca:        { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  cardProblema:     { backgroundColor: COLORS.surface, borderRadius: 8, padding: 10, marginBottom: 10 },
  cardProblemaLabel:{ color: COLORS.textMuted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  cardProblemaText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  cardDate:         { color: COLORS.textMuted, fontSize: 11, marginBottom: 10 },
  cardActions:      { flexDirection: "row", gap: 8 },
  btnEdit:          { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  btnEditText:      { color: COLORS.textPrimary, fontSize: 13 },
  btnDelete:        { width: 40, borderWidth: 1, borderColor: COLORS.red + "66", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnDeleteText:    { fontSize: 16 },

  // Badge
  badge:            { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, marginLeft: 8 },
  badgeText:        { fontSize: 11, fontWeight: "600" },

  // Empty
  emptyWrap:        { alignItems: "center", paddingTop: 60 },
  emptyIcon:        { fontSize: 48, marginBottom: 12 },
  emptyText:        { color: COLORS.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 22 },

  // Modal
  modalOverlay:     { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet:       { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "92%", borderTopWidth: 1, borderColor: COLORS.border },
  modalHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:       { color: COLORS.textPrimary, fontSize: 17, fontWeight: "600" },
  modalClose:       { color: COLORS.textSecondary, fontSize: 18, padding: 4 },
  modalActions:     { flexDirection: "row", gap: 10, marginTop: 8, marginBottom: 24 },
  btnCancel:        { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnCancelText:    { color: COLORS.textPrimary, fontSize: 14 },
  btnSave:          { flex: 2, backgroundColor: COLORS.red, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnSaveText:      { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Form fields
  fieldWrap:        { marginBottom: 16 },
  fieldLabel:       { color: COLORS.textSecondary, fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input:            { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, color: COLORS.textPrimary, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  inputMulti:       { height: 90, textAlignVertical: "top" },
  inputError:       { borderColor: COLORS.red },
  fieldError:       { color: COLORS.red, fontSize: 12, marginTop: 4 },

  // Status chips
  statusRow:        { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusChip:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  statusChipText:   { color: COLORS.textSecondary, fontSize: 13 },
});

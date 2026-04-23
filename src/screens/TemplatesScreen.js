// src/screens/TemplatesScreen.js — Live template list (no mock, no cache)
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeed, Fonts } from '../theme';
import { TemplatesAPI } from '../services/api';

const CHANNEL_FILTERS = [
  { id: 'all',      label: 'All',      icon: 'albums-outline' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { id: 'sms',      label: 'SMS',      icon: 'chatbubble-outline' },
  { id: 'rcs',      label: 'RCS',      icon: 'card-outline' },
];

const channelTint = (c, ch) => ({
  whatsapp: c.tintMint,
  sms:      c.tintRose,
  rcs:      c.tintLavender,
}[ch?.toLowerCase()] || c.tintPeach);

const statusColor = (c, s) => {
  const v = String(s || '').toUpperCase();
  if (v === 'APPROVED') return c.accentCyan;
  if (v === 'PENDING')  return c.accentOrange;
  return c.accentPink;
};

const makeStyles = (c) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scrollHeader: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22, paddingBottom: 8 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.bgSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.6, flex: 1, fontFamily: Fonts.sans },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCell: { flex: 1, backgroundColor: c.bgSoft, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  summaryLabel: { color: c.textMuted, fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: c.text, fontSize: 20, fontWeight: '700', marginTop: 2 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.bgSoft, borderRadius: 20, paddingHorizontal: 14, marginBottom: 12 },
  searchInput: {
    flex: 1, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: c.text, fontSize: 14, fontFamily: Fonts.sans,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.bgSoft },
  filterChipActive: { backgroundColor: c.text },
  filterChipLabel: { color: c.textMuted, fontSize: 12, fontWeight: '500' },
  filterChipLabelActive: { color: c.bg, fontSize: 12, fontWeight: '700' },

  listContent: { padding: 22, paddingTop: 4, paddingBottom: 140 },

  card: { backgroundColor: c.bgSoft, borderRadius: 20, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  channelDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  cardName: { color: c.text, fontSize: 15, fontWeight: '600' },
  cardSub: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  statusPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  body: { backgroundColor: c.bgInput, borderRadius: 14, padding: 12, marginBottom: 10 },
  bodyText: { color: c.text, fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans },

  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: c.bgInput },
  actionPrimary: { backgroundColor: c.text },
  actionLabel: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  actionLabelPrimary: { color: c.bg, fontSize: 12, fontWeight: '700' },

  emptyBlock: { paddingVertical: 60, alignItems: 'center', gap: 8 },
  emptyHead: { color: c.text, fontSize: 17, fontWeight: '600' },
  emptyBody: { color: c.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 300 },

  errBlock: { backgroundColor: c.bgSoft, borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: c.accentPink },
  errKicker: { color: c.accentPink, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  errText: { color: c.text, fontSize: 13 },
});

const TemplateCard = ({ item, onCopy, onUse, c, styles }) => {
  const ch = String(item.channel || '').toLowerCase();
  const tint = channelTint(c, ch);
  const sc = statusColor(c, item.status);
  const icon = ch === 'whatsapp' ? 'logo-whatsapp' : ch === 'sms' ? 'chatbubble-outline' : ch === 'rcs' ? 'card-outline' : 'document-text-outline';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.channelDot, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={18} color="#0A0A0D" />
        </View>
        <View style={styles.grow}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {item.category || ch.toUpperCase()}{item.language ? ` · ${item.language}` : ''}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: sc + '22' }]}>
          <Text style={[styles.statusLabel, { color: sc }]}>{String(item.status || '—')}</Text>
        </View>
      </View>

      {item.body ? (
        <View style={styles.body}>
          <Text style={styles.bodyText} numberOfLines={6}>{item.body}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={() => onCopy(item)} activeOpacity={0.8}>
          <Ionicons name="copy-outline" size={14} color={c.textMuted} />
          <Text style={styles.actionLabel}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.action, styles.actionPrimary]} onPress={() => onUse(item)} activeOpacity={0.88}>
          <Ionicons name="send" size={14} color={c.bg} />
          <Text style={styles.actionLabelPrimary}>Use</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function TemplatesScreen({ navigation }) {
  const c = useFeed();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('all');

  const fetchTemplates = useCallback(async () => {
    setErr(null);
    try {
      const res = await TemplatesAPI.getAll();
      setTemplates(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setTemplates([]);
      setErr(e?.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (channel !== 'all' && String(t.channel || '').toLowerCase() !== channel) return false;
      if (!q) return true;
      return (
        String(t.name || '').toLowerCase().includes(q) ||
        String(t.body || '').toLowerCase().includes(q)
      );
    });
  }, [templates, search, channel]);

  const handleCopy = async (item) => {
    await Clipboard.setStringAsync(item.body || item.name || '');
    Alert.alert('Copied', `${item.name} copied to clipboard.`);
  };

  const handleUse = (item) => {
    navigation.navigate('Send', {
      channel: String(item.channel || 'whatsapp').toLowerCase(),
      templateName: item.name,
    });
  };

  const counts = useMemo(() => ({
    total:    templates.length,
    approved: templates.filter((t) => String(t.status || '').toUpperCase() === 'APPROVED').length,
    pending:  templates.filter((t) => String(t.status || '').toUpperCase() === 'PENDING').length,
  }), [templates]);

  const renderHeader = () => (
    <View style={styles.scrollHeader}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Templates</Text>
        <TouchableOpacity style={styles.backBtn} onPress={fetchTemplates} activeOpacity={0.7}>
          <Ionicons name="refresh" size={18} color={c.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{counts.total}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Approved</Text>
          <Text style={[styles.summaryValue, { color: c.accentCyan }]}>{counts.approved}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: c.accentOrange }]}>{counts.pending}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={c.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or body"
          placeholderTextColor={c.textMuted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        {CHANNEL_FILTERS.map((f) => {
          const active = channel === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setChannel(f.id)}
              activeOpacity={0.8}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Ionicons name={f.icon} size={12} color={active ? c.bg : c.textMuted} />
              <Text style={active ? styles.filterChipLabelActive : styles.filterChipLabel}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {err ? (
        <View style={styles.errBlock}>
          <Text style={styles.errKicker}>Fetch error</Text>
          <Text style={styles.errText}>{err}</Text>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        {renderHeader()}
        <View style={styles.emptyBlock}>
          <ActivityIndicator color={c.accentPink} />
          <Text style={styles.emptyBody}>Loading live templates…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => String(item.id ?? item.name ?? i)}
        renderItem={({ item }) => <TemplateCard item={item} onCopy={handleCopy} onUse={handleUse} c={c} styles={styles} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchTemplates(); }}
            tintColor={c.accentPink}
          />
        }
        ListEmptyComponent={
          !err ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="document-text-outline" size={36} color={c.textDim} />
              <Text style={styles.emptyHead}>No templates</Text>
              <Text style={styles.emptyBody}>
                Save an API key in Config, then pull down to refresh from gsauth.
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

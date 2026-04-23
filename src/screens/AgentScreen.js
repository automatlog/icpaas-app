// src/screens/AgentScreen.js — Feed minimal agent roster
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeed, Fonts } from '../theme';

const SEED_AGENTS = [
  { id: 'A-01', name: 'Rahul Mehra',  desk: 'Voice Desk',  ext: '1001', status: 'ON-CALL',   queue: 4, answered: 58, avgSec: 182, shift: 'Morning' },
  { id: 'A-02', name: 'Ananya Iyer',  desk: 'IVR Inbound', ext: '1014', status: 'AVAILABLE', queue: 0, answered: 41, avgSec: 144, shift: 'Morning' },
  { id: 'A-03', name: 'Kabir Singh',  desk: 'Campaigns',   ext: '1022', status: 'BREAK',     queue: 0, answered: 19, avgSec: 97,  shift: 'Night'   },
  { id: 'A-04', name: 'Sneha Patel',  desk: 'Voice Desk',  ext: '1007', status: 'ON-CALL',   queue: 2, answered: 62, avgSec: 201, shift: 'Morning' },
  { id: 'A-05', name: 'Vikram Rao',   desk: 'IVR Inbound', ext: '1030', status: 'AWAY',      queue: 0, answered: 12, avgSec: 88,  shift: 'Night'   },
  { id: 'A-06', name: 'Priya Bose',   desk: 'WhatsApp',    ext: '1041', status: 'AVAILABLE', queue: 1, answered: 74, avgSec: 63,  shift: 'Morning' },
  { id: 'A-07', name: 'Tanmay Ghosh', desk: 'RCS Studio',  ext: '1055', status: 'AVAILABLE', queue: 0, answered: 8,  avgSec: 120, shift: 'Night'   },
  { id: 'A-08', name: 'Meera Joshi',  desk: 'Voice Desk',  ext: '1019', status: 'ON-CALL',   queue: 3, answered: 47, avgSec: 166, shift: 'Night'   },
];

const fmtSec = (s) => {
  const m = Math.floor(s / 60);
  const rem = String(s % 60).padStart(2, '0');
  return `${m}:${rem}`;
};

const initials = (name) => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

const makeStyles = (c) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22, paddingBottom: 120 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.bgSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.6, flex: 1, fontFamily: Fonts.sans },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  summaryCell: { flex: 1, backgroundColor: c.bgSoft, borderRadius: 18, padding: 14 },
  summaryLabel: { color: c.textMuted, fontSize: 11, fontWeight: '500', marginBottom: 4 },
  summaryValue: { color: c.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.bgSoft, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 14 },
  searchInput: { flex: 1, color: c.text, fontSize: 14, fontFamily: Fonts.sans, paddingVertical: Platform.OS === 'ios' ? 12 : 8, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 18, flexWrap: 'wrap' },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.bgSoft },
  chipActive: { backgroundColor: c.text },
  chipLabel: { color: c.textMuted, fontSize: 12, fontWeight: '500' },
  chipLabelActive: { color: c.bg, fontWeight: '600' },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.bgSoft, borderRadius: 18, padding: 14, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#0A0A0D', fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans },
  grow: { flex: 1 },
  name: { color: c.text, fontSize: 15, fontWeight: '600' },
  meta: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  stats: { flexDirection: 'row', gap: 8 },
  statCell: { alignItems: 'flex-end' },
  statNum: { color: c.text, fontSize: 12, fontWeight: '600', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  statKey: { color: c.textDim, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyBlock: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyHead: { color: c.text, fontSize: 16, fontWeight: '600' },
  emptyBody: { color: c.textMuted, fontSize: 12 },
});

export default function AgentScreen({ navigation }) {
  const c = useFeed();
  const styles = useMemo(() => makeStyles(c), [c]);

  const STATUS = {
    'ON-CALL':   { color: c.accentPink,   tint: c.tintRose },
    'AVAILABLE': { color: c.accentCyan,   tint: c.tintMint },
    'BREAK':     { color: c.accentOrange, tint: c.tintYellow },
    'AWAY':      { color: c.textMuted,    tint: c.tintLavender },
  };

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const filters = ['ALL', 'ON-CALL', 'AVAILABLE', 'BREAK', 'AWAY'];

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEED_AGENTS.filter((a) => {
      if (filter !== 'ALL' && a.status !== filter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.desk.toLowerCase().includes(q) ||
        a.ext.includes(q)
      );
    });
  }, [query, filter]);

  const onCall = SEED_AGENTS.filter((a) => a.status === 'ON-CALL').length;
  const avail = SEED_AGENTS.filter((a) => a.status === 'AVAILABLE').length;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Agents</Text>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={22} color={c.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>On floor</Text>
            <Text style={styles.summaryValue}>{SEED_AGENTS.length}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>On call</Text>
            <Text style={[styles.summaryValue, { color: c.accentPink }]}>{onCall}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Available</Text>
            <Text style={[styles.summaryValue, { color: c.accentCyan }]}>{avail}</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={c.textMuted} />
          <TextInput
            value={query} onChangeText={setQuery}
            placeholder="Search name, desk, extension"
            placeholderTextColor={c.textMuted}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]} activeOpacity={0.75}>
              <Text style={[styles.chipLabel, filter === f && styles.chipLabelActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {list.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="people-outline" size={40} color={c.textDim} />
            <Text style={styles.emptyHead}>No match</Text>
            <Text style={styles.emptyBody}>Clear filters or search another desk.</Text>
          </View>
        ) : (
          list.map((a) => {
            const s = STATUS[a.status] || STATUS.AWAY;
            return (
              <View key={a.id} style={styles.card}>
                <View style={[styles.avatar, { backgroundColor: s.tint }]}>
                  <Text style={styles.avatarText}>{initials(a.name)}</Text>
                </View>
                <View style={styles.grow}>
                  <Text style={styles.name}>{a.name}</Text>
                  <Text style={styles.meta}>{a.desk} · x{a.ext} · {a.shift}</Text>
                </View>
                <View style={styles.right}>
                  <View style={[styles.statusBadge, { backgroundColor: s.color + '22' }]}>
                    <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                    <Text style={[styles.statusLabel, { color: s.color }]}>{a.status}</Text>
                  </View>
                  <View style={styles.stats}>
                    <View style={styles.statCell}>
                      <Text style={styles.statNum}>{a.queue}</Text>
                      <Text style={styles.statKey}>Q</Text>
                    </View>
                    <View style={styles.statCell}>
                      <Text style={styles.statNum}>{a.answered}</Text>
                      <Text style={styles.statKey}>Ans</Text>
                    </View>
                    <View style={styles.statCell}>
                      <Text style={styles.statNum}>{fmtSec(a.avgSec)}</Text>
                      <Text style={styles.statKey}>Avg</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

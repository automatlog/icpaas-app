// src/screens/ReportScreen.js — Feed minimal voice/IVR report
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeed, Fonts } from '../../theme';
import { VoiceAPI, IVRAPI } from '../../services/api';

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const TABS = [
  { id: 'obd', label: 'Outbound',  icon: 'call-outline' },
  { id: 'ibd', label: 'Inbound',   icon: 'call-outline' },
];

const makeStyles = (c) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22, paddingBottom: 120 },

  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 10 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.bgSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.6, flex: 1, fontFamily: Fonts.sans },

  tabs: { flexDirection: 'row', backgroundColor: c.bgSoft, borderRadius: 22, padding: 4, marginBottom: 20 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 18 },
  tabActive: { backgroundColor: c.bgInput },
  tabLabel: { color: c.textMuted, fontSize: 14, fontWeight: '500' },
  tabLabelActive: { color: c.text, fontWeight: '600' },

  rangeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dateField: { flex: 1 },
  dateLabel: { color: c.textMuted, fontSize: 11, marginBottom: 6, fontWeight: '500', letterSpacing: 0.5 },
  dateInput: {
    backgroundColor: c.bgSoft,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    color: c.text,
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  fetchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: c.text, borderRadius: 16, marginBottom: 20 },
  fetchLabel: { color: c.bg, fontSize: 14, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCell: { flex: 1, backgroundColor: c.bgSoft, borderRadius: 18, padding: 14 },
  summaryLabel: { color: c.textMuted, fontSize: 11, fontWeight: '500', marginBottom: 4 },
  summaryValue: { color: c.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },

  emptyBlock: { paddingVertical: 60, alignItems: 'center', gap: 8 },
  emptyHead: { color: c.text, fontSize: 17, fontWeight: '600' },
  emptyBody: { color: c.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 280 },

  errBlock: { backgroundColor: c.bgSoft, borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: c.accentPink },
  errKicker: { color: c.accentPink, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  errText: { color: c.text, fontSize: 13 },

  card: { backgroundColor: c.bgSoft, borderRadius: 18, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardGrow: { flex: 1 },
  cardNumber: { color: c.text, fontSize: 14, fontWeight: '600', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  cardTime: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  cardStatusBadge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  cardStatusLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  cardRow: { flexDirection: 'row', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.rule },
  cardCell: { flex: 1 },
  cellLabel: { color: c.textDim, fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  cellValue: { color: c.text, fontSize: 12, fontWeight: '500' },
});

export default function ReportScreen({ navigation }) {
  const c = useFeed();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [tab, setTab] = useState('obd');
  const [fromDate, setFromDate] = useState(daysAgo(14));
  const [toDate, setToDate] = useState(ymd(new Date()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      if (tab === 'obd') {
        const res = await VoiceAPI.getDeliveryReport({ fromDate, toDate, reportType: 'OBD' });
        setRows(res?.data || []);
      } else {
        const res = await IVRAPI.getInboundReports({ fromDate, toDate, exportToCsv: false });
        setRows(res?.data || []);
      }
    } catch (e) {
      setErr(e?.message || 'Failed to load report');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, fromDate, toDate]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const answered = rows.filter((r) =>
    String(r.callStatus || r.disposition || '').toUpperCase().includes('ANSWER'),
  ).length;

  const statusColor = (status) => {
    const s = String(status).toUpperCase();
    if (s.includes('ANSWER')) return c.accentCyan;
    if (s.includes('FAIL') || s.includes('REJECT') || s.includes('BUSY')) return c.accentPink;
    if (s.includes('CANCEL') || s.includes('NOANSWER')) return c.accentOrange;
    return c.textMuted;
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRows(); }} tintColor={c.accentPink} />}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Reports</Text>
          <TouchableOpacity style={styles.backBtn} onPress={fetchRows} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color={c.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, tab === t.id && styles.tabActive]} activeOpacity={0.8}>
              <Ionicons name={t.id === 'obd' ? 'arrow-up-outline' : 'arrow-down-outline'} size={14} color={tab === t.id ? c.text : c.textMuted} />
              <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rangeRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From</Text>
            <TextInput
              value={fromDate} onChangeText={setFromDate}
              placeholder="yyyy-mm-dd" placeholderTextColor={c.textDim}
              style={styles.dateInput}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To</Text>
            <TextInput
              value={toDate} onChangeText={setToDate}
              placeholder="yyyy-mm-dd" placeholderTextColor={c.textDim}
              style={styles.dateInput}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.fetchBtn} onPress={fetchRows} activeOpacity={0.85}>
          <Ionicons name="search-outline" size={16} color={c.bg} />
          <Text style={styles.fetchLabel}>Fetch report</Text>
        </TouchableOpacity>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Rows</Text>
            <Text style={styles.summaryValue}>{rows.length}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Answered</Text>
            <Text style={[styles.summaryValue, { color: c.accentCyan }]}>{answered}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Missed</Text>
            <Text style={[styles.summaryValue, { color: c.accentPink }]}>{rows.length - answered}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyBlock}>
            <ActivityIndicator color={c.accentPink} />
            <Text style={styles.emptyBody}>Loading ledger…</Text>
          </View>
        ) : err ? (
          <View style={styles.errBlock}>
            <Text style={styles.errKicker}>Error</Text>
            <Text style={styles.errText}>{err}</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="document-text-outline" size={40} color={c.textDim} />
            <Text style={styles.emptyHead}>Nothing here</Text>
            <Text style={styles.emptyBody}>No dispatches in this range. Widen your dates.</Text>
          </View>
        ) : (
          rows.map((r, i) => {
            const number = r.number || r.caller || r.destination || '—';
            const when = r.callInitDate || r.callDateTime || r.startTime || r.answeredTime;
            const status = r.callStatus || r.disposition || '—';
            const action = r.actionType || r.ibdActionType || r.interface || '—';
            const dur = r.callDuration ?? r.duration ?? r.ibdBillSec;
            const cost = r.finalCost ?? r.cost;
            const sc = statusColor(status);
            return (
              <View key={i} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, { backgroundColor: sc + '22' }]}>
                    <Ionicons name="call" size={16} color={sc} />
                  </View>
                  <View style={styles.cardGrow}>
                    <Text style={styles.cardNumber}>{String(number)}</Text>
                    <Text style={styles.cardTime}>{fmtTime(when)}</Text>
                  </View>
                  <View style={[styles.cardStatusBadge, { backgroundColor: sc + '22' }]}>
                    <Text style={[styles.cardStatusLabel, { color: sc }]}>{String(status)}</Text>
                  </View>
                </View>
                <View style={styles.cardRow}>
                  <View style={styles.cardCell}>
                    <Text style={styles.cellLabel}>Action</Text>
                    <Text style={styles.cellValue}>{String(action)}</Text>
                  </View>
                  <View style={styles.cardCell}>
                    <Text style={styles.cellLabel}>Duration</Text>
                    <Text style={styles.cellValue}>{dur != null ? `${Math.round(Number(dur))}s` : '—'}</Text>
                  </View>
                  <View style={styles.cardCell}>
                    <Text style={styles.cellLabel}>Cost</Text>
                    <Text style={styles.cellValue}>{cost != null ? `₹${Number(cost).toFixed(2)}` : '—'}</Text>
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

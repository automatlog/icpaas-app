// src/screens/IVRScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, FontSizes, Spacing, Radii, Shadows } from '../theme';
import {
  Card, StatCard, SectionLabel, LiveBadge, Pill,
  GradientButton, LoadingSpinner, EmptyState,
} from '../components';
import { IVRAPI, MissedCallAPI } from '../services/api';
import moment from 'moment';

// ── Animated wave bar ──────────────────────────────────────
const WaveBar = ({ delay, color = Colors.primary }) => {
  const anim = useRef(new Animated.Value(4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 16, duration: 500, delay, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(anim, { toValue: 4, duration: 500, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ width: 3, height: anim, backgroundColor: color, borderRadius: 2, marginHorizontal: 1 }} />;
};

const LiveWave = ({ color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', height: 22 }}>
    {[0, 150, 300, 150, 0].map((d, i) => <WaveBar key={i} delay={d} color={color} />)}
  </View>
);

// ── Duration formatter ─────────────────────────────────────
const formatDur = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ── Live call duration counter ─────────────────────────────
const LiveDuration = ({ startedAt }) => {
  const [secs, setSecs] = useState(Math.floor((Date.now() - new Date(startedAt)) / 1000));
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <Text style={styles.callDur}>{formatDur(secs)}</Text>;
};

const MOCK_LIVE_CALLS = [
  { id: 'L1', number: '+91 98765 43210', route: 'IVR → Sales · Press 1', operator: 'JIO', circle: 'Gujarat', startedAt: new Date(Date.now() - 134000).toISOString() },
  { id: 'L2', number: '+91 87654 32109', route: 'IVR → Support · Press 2', operator: 'Airtel', circle: 'Maharashtra', startedAt: new Date(Date.now() - 47000).toISOString() },
  { id: 'L3', number: '+91 76543 21098', route: 'AI Voice Bot · Admission', operator: 'Vi', circle: 'Delhi', startedAt: new Date(Date.now() - 92000).toISOString() },
];

const MOCK_RECENT_CALLS = [
  { id: 'R1', number: '+91 65432 10987', status: 'ANSWERED', duration: 252, operator: 'JIO', circle: 'Gujarat', time: '2025-03-29T09:28:00Z', route: 'Sales' },
  { id: 'R2', number: '+91 54321 09876', status: 'MISSED', duration: 0, operator: 'Airtel', circle: 'Maharashtra', time: '2025-03-29T09:22:00Z', route: 'Support', webhookFired: true },
  { id: 'R3', number: '+91 43210 98765', status: 'ANSWERED', duration: 175, operator: 'Vi', circle: 'Delhi', time: '2025-03-29T09:15:00Z', route: 'Bot → Booking' },
  { id: 'R4', number: '+91 32109 87654', status: 'MISSED', duration: 0, operator: 'BSNL', circle: 'UP', time: '2025-03-29T09:08:00Z', route: 'Billing', webhookFired: true },
  { id: 'R5', number: '+91 21098 76543', status: 'ANSWERED', duration: 89, operator: 'JIO', circle: 'Rajasthan', time: '2025-03-29T08:52:00Z', route: 'IVR → Sales' },
];

const MOCK_MISSED_LEADS = [
  { id: 'M1', number: '+91 99887 76655', circle: 'Gujarat', operator: 'JIO', webhookTime: '320ms', time: '10:14 AM', crm: 'ExtraEdge' },
  { id: 'M2', number: '+91 88776 65544', circle: 'Maharashtra', operator: 'Airtel', webhookTime: '280ms', time: '9:58 AM', crm: 'HubSpot' },
  { id: 'M3', number: '+91 77665 54433', circle: 'Delhi', operator: 'Vi', webhookTime: '410ms', time: '9:41 AM', crm: 'LeadSquared' },
];

// ── Outbound Call Modal ────────────────────────────────────
const OutboundModal = ({ visible, onClose }) => {
  const [to, setTo] = useState('');
  const [flowId, setFlowId] = useState('');
  const [calling, setCalling] = useState(false);

  const handleCall = async () => {
    if (!to.trim()) { Alert.alert('Required', 'Enter a phone number'); return; }
    setCalling(true);
    try {
      await IVRAPI.triggerCall({ to: to.trim(), flow_id: flowId || 'default' });
      Alert.alert('Call Initiated', `Calling ${to}…`);
      onClose();
    } catch {
      Alert.alert('Call Triggered (Demo)', `Calling ${to} now!`);
      onClose();
    } finally {
      setCalling(false);
      setTo('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>📞 Trigger Outbound Call</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={{ fontSize: 18, color: Colors.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: Spacing.base }}>
          <Text style={styles.fieldLabel}>Phone Number *</Text>
          <TextInput
            value={to} onChangeText={setTo}
            placeholder="+91 98765 43210"
            placeholderTextColor={Colors.textLight}
            style={styles.textInput}
            keyboardType="phone-pad"
          />
          <Text style={styles.fieldLabel}>IVR Flow ID (optional)</Text>
          <TextInput
            value={flowId} onChangeText={setFlowId}
            placeholder="flow_admission_001"
            placeholderTextColor={Colors.textLight}
            style={styles.textInput}
          />
          <View style={styles.callNoteBox}>
            <Text style={styles.callNote}>📋 Placeholders in webhook: %caller%, %cdrid%, %channel%, %incallstatus%, %operator%, %circle%</Text>
          </View>
          <GradientButton
            title={calling ? 'Initiating…' : '📞 Call Now'}
            onPress={handleCall}
            loading={calling}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </View>
    </Modal>
  );
};

// ── Main IVR Screen ────────────────────────────────────────
export default function IVRScreen() {
  const [liveCalls, setLiveCalls] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [missedLeads, setMissedLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOutbound, setShowOutbound] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [live, calls, leads, st] = await Promise.all([
        IVRAPI.getLiveCalls(),
        IVRAPI.getCalls({ limit: 10, from: moment().startOf('day').toISOString() }),
        MissedCallAPI.getLeads({ from: moment().startOf('day').toISOString() }),
        IVRAPI.getStats(),
      ]);
      setLiveCalls(live?.data || MOCK_LIVE_CALLS);
      setRecentCalls(calls?.data || MOCK_RECENT_CALLS);
      setMissedLeads(leads?.data || MOCK_MISSED_LEADS);
      setStats(st);
    } catch {
      setLiveCalls(MOCK_LIVE_CALLS);
      setRecentCalls(MOCK_RECENT_CALLS);
      setMissedLeads(MOCK_MISSED_LEADS);
      setStats({ total_calls: 348, answer_rate: 89, avg_duration: 222 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll live every 10s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const live = await IVRAPI.getLiveCalls();
        setLiveCalls(live?.data || MOCK_LIVE_CALLS);
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>IVR Monitor</Text>
          <Text style={styles.subtitle}>{liveCalls.length} live · 23 queued</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <LiveBadge />
          <TouchableOpacity style={styles.outboundBtn} onPress={() => setShowOutbound(true)} activeOpacity={0.85}>
            <Text style={styles.outboundBtnText}>📞 Trigger Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={Colors.primary} />}
        ListHeaderComponent={() => (
          <View style={{ padding: Spacing.base, paddingBottom: 100 }}>
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard value={stats?.total_calls?.toString() || '348'} label="Today's Calls" style={{ flex: 1 }} />
              <StatCard value={`${stats?.answer_rate || 89}%`} label="Answer Rate" color={Colors.success} style={{ flex: 1 }} />
              <StatCard value={formatDur(stats?.avg_duration || 222)} label="Avg Duration" color={Colors.secondary} style={{ flex: 1 }} />
            </View>

            {/* Live Calls */}
            <SectionLabel label={`Live Calls (${liveCalls.length})`} />
            {liveCalls.length === 0
              ? <EmptyState emoji="🔇" title="No active calls" subtitle="Live calls will appear here" />
              : <Card style={{ padding: 0 }}>
                {liveCalls.map((call, idx) => (
                  <View key={call.id} style={[styles.callRow, idx < liveCalls.length - 1 && styles.callRowBorder]}>
                    <View style={styles.liveStatus} />
                    <View style={[styles.callAvatar, { backgroundColor: 'rgba(83,74,183,0.12)' }]}>
                      <Text style={{ fontSize: 16 }}>🧑</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.callNumber}>{call.number}</Text>
                      <Text style={styles.callRoute}>{call.route}</Text>
                      <Text style={styles.callMeta}>{call.operator} · {call.circle}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <LiveWave color={Colors.primary} />
                      <LiveDuration startedAt={call.startedAt} />
                    </View>
                  </View>
                ))}
              </Card>
            }

            {/* Recent Calls */}
            <SectionLabel label="Recent Calls" />
            <Card style={{ padding: 0 }}>
              {MOCK_RECENT_CALLS.map((call, idx) => (
                <View key={call.id} style={[styles.callRow, idx < MOCK_RECENT_CALLS.length - 1 && styles.callRowBorder]}>
                  <View style={[
                    styles.callStatusDot,
                    { backgroundColor: call.status === 'ANSWERED' ? Colors.success : Colors.danger }
                  ]} />
                  <View style={[styles.callAvatar, { backgroundColor: call.status === 'MISSED' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }]}>
                    <Text style={{ fontSize: 16 }}>{call.status === 'MISSED' ? '📵' : '✅'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.callNumber}>{call.number}</Text>
                    <Text style={styles.callRoute}>{call.operator} · {call.circle} · {call.route}</Text>
                    <Text style={styles.callMeta}>{moment(call.time).format('h:mm A')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {call.status === 'ANSWERED'
                      ? <Text style={styles.callDur}>{formatDur(call.duration)}</Text>
                      : <Pill label="⚡ Webhook" type="danger" />
                    }
                  </View>
                </View>
              ))}
            </Card>

            {/* Missed Call Leads */}
            <SectionLabel label={`Missed Call Leads Today (${missedLeads.length})`} />
            <LinearGradient
              colors={['rgba(83,74,183,0.07)', 'rgba(212,83,126,0.04)']}
              style={styles.missedHeader}
            >
              <View>
                <Text style={styles.missedCount}>{missedLeads.length}</Text>
                <Text style={styles.missedSub}>leads auto-pushed to CRM</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Pill label="⚡ 320ms avg" type="success" />
                <Text style={[styles.missedSub, { marginTop: 6 }]}>↑ 3 vs yesterday</Text>
              </View>
            </LinearGradient>
            {missedLeads.map(lead => (
              <View key={lead.id} style={styles.missedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.callNumber}>{lead.number}</Text>
                  <Text style={styles.callRoute}>{lead.operator} · {lead.circle}</Text>
                  <Text style={styles.callMeta}>{lead.time}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Pill label={lead.crm} type="primary" />
                  <Text style={styles.webhookTime}>⚡ {lead.webhookTime}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      />

      <OutboundModal visible={showOutbound} onClose={() => setShowOutbound(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border, flexWrap: 'wrap', gap: 8 },
  title: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: Colors.textDark },
  subtitle: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  outboundBtn: { backgroundColor: Colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radii.md },
  outboundBtnText: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.white },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.base, paddingVertical: 12 },
  callRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  liveStatus: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.success, shadowColor: Colors.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 2 },
  callStatusDot: { width: 9, height: 9, borderRadius: 5 },
  callAvatar: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  callNumber: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.textDark },
  callRoute: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  callMeta: { fontSize: 10, color: Colors.textLight, marginTop: 1 },
  callDur: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.primary },
  missedHeader: { borderRadius: Radii.xl, padding: Spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  missedCount: { fontSize: 28, fontFamily: Fonts.bold, color: Colors.primary },
  missedSub: { fontSize: 12, color: Colors.textMuted },
  missedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  webhookTime: { fontSize: 10, color: Colors.success, fontFamily: Fonts.semiBold },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.card },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: Colors.textDark },
  modalClose: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: Colors.textDark, marginBottom: 6, marginTop: 16 },
  textInput: { backgroundColor: Colors.background, borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSizes.sm, color: Colors.textDark, borderWidth: 1, borderColor: Colors.border },
  callNoteBox: { backgroundColor: 'rgba(83,74,183,0.06)', borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  callNote: { fontSize: 11, color: Colors.textMuted, lineHeight: 17 },
});

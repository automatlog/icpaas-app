// src/screens/CampaignsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, FontSizes, Spacing, Radii, Shadows } from '../theme';
import {
  Card, Pill, SectionLabel, ProgressBar, MetricRow,
  GradientButton, OutlineButton, LoadingSpinner, EmptyState,
} from '../components';
import { useDispatch, useSelector } from 'react-redux';
import { CampaignAPI } from '../services/api';
import {
  setCampaigns as setCampaignsAction,
  upsertCampaign as upsertCampaignAction,
  updateCampaignStatus as updateCampaignStatusAction,
} from '../store/slices/campaignsSlice';

const MOCK_CAMPAIGNS = [
  {
    id: '1', name: 'Summer Sale WhatsApp Blast', channel: 'whatsapp',
    status: 'live', total: 50000, sent: 39000,
    metrics: [
      { value: '94.2%', label: 'Delivered' },
      { value: '68%', label: 'Opened' },
      { value: '12.4%', label: 'Replied' },
      { value: '₹8.2L', label: 'Revenue' },
    ],
  },
  {
    id: '2', name: 'OTP Gateway — HDFC', channel: 'sms',
    status: 'live', total: null, sent: 2147,
    alwaysOn: true,
    metrics: [
      { value: '99.1%', label: 'Delivered' },
      { value: '3.2s', label: 'Avg Time' },
      { value: '2,147', label: 'Sent Today' },
      { value: '0', label: 'Failures' },
    ],
  },
  {
    id: '3', name: 'RCS Festival Cards', channel: 'rcs',
    status: 'live', total: 8000, sent: 4960,
    metrics: [
      { value: '97%', label: 'Delivered' },
      { value: '34.2%', label: 'CTR' },
      { value: 'SMS ✓', label: 'Fallback' },
      { value: '1,280', label: 'Clicks' },
    ],
  },
  {
    id: '4', name: 'IVR Outbound — Admissions', channel: 'ivr',
    status: 'scheduled', scheduleTime: '2:00 PM Today',
    metrics: [],
  },
  {
    id: '5', name: 'Missed Call Lead Nurture', channel: 'missedcall',
    status: 'scheduled', scheduleTime: 'Tomorrow 10:00 AM',
    metrics: [],
  },
];

const CHANNEL_OPTIONS = [
  { id: 'whatsapp', icon: '💬', label: 'WhatsApp' },
  { id: 'sms', icon: '📩', label: 'Bulk SMS' },
  { id: 'rcs', icon: '✨', label: 'RCS' },
  { id: 'ivr', icon: '📞', label: 'IVR / Voice' },
];

const statusPillType = (s) => s === 'live' ? 'success' : s === 'scheduled' ? 'warning' : 'primary';
const statusLabel = (s) => s === 'live' ? '● Live' : s === 'scheduled' ? '⏰ Scheduled' : '⏸ Paused';
const channelIcon = { whatsapp: '💬', sms: '📩', rcs: '✨', ivr: '📞', missedcall: '🔔' };

const createLocalCampaign = ({ name, channel, contacts, message }) => ({
  id: `${Date.now()}`,
  name,
  channel,
  status: 'scheduled',
  scheduleTime: 'Queued now',
  total: contacts
    ? contacts.split(',').map((item) => item.trim()).filter(Boolean).length
    : null,
  sent: 0,
  message,
  metrics: [],
});

// ── Campaign Card ──────────────────────────────────────────
const CampaignCard = ({ item, onPause }) => {
  const progress = item.total ? item.sent / item.total : 1;
  return (
    <Card>
      <View style={styles.campTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.campTitle}>{item.name}</Text>
          <Text style={styles.campSub}>
            {channelIcon[item.channel]} {item.channel?.toUpperCase()}
            {item.alwaysOn ? ' · Always-on' : item.total ? ` · ${item.total.toLocaleString()} contacts` : ''}
          </Text>
        </View>
        <Pill label={statusLabel(item.status)} type={statusPillType(item.status)} />
      </View>

      {item.status === 'live' && !item.alwaysOn && item.total && (
        <>
          <ProgressBar progress={progress} style={{ marginTop: 10 }} />
          <View style={styles.progressLabel}>
            <Text style={styles.progressText}>{item.sent.toLocaleString()} sent</Text>
            <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          </View>
        </>
      )}

      {item.scheduleTime && (
        <Text style={styles.scheduleTime}>🗓 {item.scheduleTime}</Text>
      )}

      {item.metrics?.length > 0 && (
        <>
          <View style={styles.metricDivider} />
          <MetricRow metrics={item.metrics} />
        </>
      )}

      {item.status === 'live' && (
        <View style={styles.campActions}>
          <OutlineButton title="⏸ Pause" small onPress={() => onPause(item.id)} style={{ flex: 1 }} />
          <OutlineButton title="📊 Stats" small onPress={() => {}} style={{ flex: 1 }} />
        </View>
      )}
    </Card>
  );
};

// ── New Campaign Modal ─────────────────────────────────────
const NewCampaignModal = ({ visible, onClose, onCreated }) => {
  const dispatch = useDispatch();
  const upsertCampaign = (c) => dispatch(upsertCampaignAction(c));
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [contacts, setContacts] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Please enter campaign name'); return; }
    setCreating(true);
    try {
      await CampaignAPI.create({ name, channel, contacts_raw: contacts, message });
      upsertCampaign(createLocalCampaign({ name, channel, contacts, message }));
      onCreated?.();
      onClose();
      setName(''); setChannel('whatsapp'); setContacts(''); setMessage('');
    } catch (e) {
      upsertCampaign(createLocalCampaign({ name, channel, contacts, message }));
      Alert.alert('Created (Demo)', 'Campaign scheduled successfully!');
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Campaign</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={{ fontSize: 18, color: Colors.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.fieldLabel}>Campaign Name *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Summer Sale WA Blast" style={styles.textInput} placeholderTextColor={Colors.textLight} />

          <Text style={styles.fieldLabel}>Channel *</Text>
          <View style={styles.channelGrid}>
            {CHANNEL_OPTIONS.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.channelOption, channel === c.id && styles.channelOptionActive]}
                onPress={() => setChannel(c.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.channelOptionIcon}>{c.icon}</Text>
                <Text style={[styles.channelOptionLabel, channel === c.id && { color: Colors.primary }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Contact Numbers (comma separated)</Text>
          <TextInput
            value={contacts}
            onChangeText={setContacts}
            placeholder="919876543210, 918765432109…"
            style={[styles.textInput, { height: 70 }]}
            multiline
            placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.fieldLabel}>Message / Template</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Enter your message or template name…"
            style={[styles.textInput, { height: 90 }]}
            multiline
            placeholderTextColor={Colors.textLight}
          />

          <GradientButton
            title={creating ? 'Creating…' : '🚀 Launch Campaign'}
            onPress={handleCreate}
            loading={creating}
            style={{ marginTop: Spacing.base, marginBottom: Spacing.xxxl }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

// ── Main Screen ────────────────────────────────────────────
export default function CampaignsScreen() {
  const dispatch = useDispatch();
  const campaigns = useSelector((s) => s.campaigns);
  const setCampaigns = (list) => dispatch(setCampaignsAction(list));
  const updateCampaignStatus = (campaignId, status) =>
    dispatch(updateCampaignStatusAction({ campaignId, status }));
  const [loading, setLoading] = useState(campaigns.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await CampaignAPI.list();
      setCampaigns(res?.data || MOCK_CAMPAIGNS);
    } catch {
      setCampaigns(MOCK_CAMPAIGNS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setCampaigns]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handlePause = useCallback(async (id) => {
    try {
      await CampaignAPI.pause(id);
      updateCampaignStatus(id, 'paused');
    } catch {
      Alert.alert('Error', 'Could not pause campaign');
    }
  }, [updateCampaignStatus]);

  if (loading) return <LoadingSpinner />;

  const active = campaigns.filter(c => c.status === 'live');
  const scheduled = campaigns.filter(c => c.status === 'scheduled');
  const paused = campaigns.filter(c => c.status === 'paused');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Campaigns</Text>
          <Text style={styles.subtitle}>{active.length} active · {scheduled.length} scheduled</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}><Text style={{ fontSize: 16 }}>🔔</Text></TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={() => (
          <View style={styles.scrollContent}>
            {/* New campaign CTA */}
            <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.85}>
              <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.newCampBtn}
              >
                <Text style={styles.newCampBtnText}>＋  New Campaign</Text>
              </LinearGradient>
            </TouchableOpacity>

            {active.length > 0 && (
              <>
                <SectionLabel label="Active" />
                {active.map(c => <CampaignCard key={c.id} item={c} onPause={handlePause} />)}
              </>
            )}
            {scheduled.length > 0 && (
              <>
                <SectionLabel label="Scheduled" />
                {scheduled.map(c => <CampaignCard key={c.id} item={c} onPause={handlePause} />)}
              </>
            )}
            {paused.length > 0 && (
              <>
                <SectionLabel label="Paused" />
                {paused.map(c => <CampaignCard key={c.id} item={c} onPause={handlePause} />)}
              </>
            )}
            {campaigns.length === 0 && <EmptyState emoji="📢" title="No campaigns yet" subtitle="Tap + New Campaign to get started" />}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCampaigns(); }} tintColor={Colors.primary} />}
      />

      <NewCampaignModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={fetchCampaigns}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: Colors.textDark },
  subtitle: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  scrollContent: { padding: Spacing.base, paddingBottom: 100 },
  newCampBtn: { paddingVertical: 16, borderRadius: Radii.lg, alignItems: 'center', marginBottom: 4 },
  newCampBtnText: { color: Colors.white, fontSize: FontSizes.base, fontFamily: Fonts.bold },
  campTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  campTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: Colors.textDark, marginBottom: 3 },
  campSub: { fontSize: FontSizes.sm, color: Colors.textMuted },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressText: { fontSize: FontSizes.xs, color: Colors.textMuted },
  scheduleTime: { fontSize: 12, color: Colors.warning, fontFamily: Fonts.semiBold, marginTop: 8 },
  metricDivider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm },
  campActions: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.card },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: Colors.textDark },
  modalClose: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { padding: Spacing.base },
  fieldLabel: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: Colors.textDark, marginBottom: 6, marginTop: 16 },
  textInput: { backgroundColor: Colors.background, borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSizes.sm, color: Colors.textDark, borderWidth: 1, borderColor: Colors.border, fontFamily: Fonts.regular },
  channelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  channelOption: { width: '47%', padding: 14, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.card },
  channelOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  channelOptionIcon: { fontSize: 24, marginBottom: 6 },
  channelOptionLabel: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: Colors.textMuted },
});

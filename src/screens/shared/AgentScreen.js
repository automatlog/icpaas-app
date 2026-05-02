// src/screens/shared/AgentScreen.js
//
// Real agent roster — backed by AgentAPI.list(). Replaces the previous
// mock SEED_AGENTS. Each row supports tap-to-edit (re-uses CreateAgentScreen
// in edit mode) and a delete action under the overflow icon.
//
// Until backend bearer auth lands on AgentList, every list/edit/delete
// call will 302; the screen surfaces that as an empty list + retry hint.
//
// LoginAsUser (impersonation) is intentionally not surfaced — OmniApp's
// endpoint swaps the server cookie session, which doesn't translate to a
// bearer-auth mobile context. Wait for backend impersonation-token support.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeed, Fonts } from '../../theme';
import ScreenHeader from '../../components/ScreenHeader';
import { AgentAPI } from '../../services/api';
import toast from '../../services/toast';
import dialog from '../../services/dialog';

// Maps EnumAccountStatus (UserEnums.cs:10) to a status pill.
const STATUS_BY_CODE = {
  1: { label: 'ACTIVE',   key: 'AVAILABLE' },
  2: { label: 'INACTIVE', key: 'AWAY' },
  3: { label: 'BLOCKED',  key: 'BREAK' },
};

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

// Defensive normaliser — OmniApp returns either camel or Pascal depending
// on which controller serialiser fired.
const normaliseAgent = (raw) => ({
  userId:        raw.userId        ?? raw.UserId        ?? raw.AgentUserId ?? raw.id,
  userName:      raw.userName      ?? raw.UserName      ?? raw.name        ?? '',
  emailId:       raw.emailId       ?? raw.EmailId       ?? raw.email       ?? '',
  mobileNumber:  raw.mobileNumber  ?? raw.MobileNumber  ?? raw.mobile      ?? '',
  accountStatus: raw.accountStatus ?? raw.AccountStatus ?? 1,
  // Optional product/role flags — surfaced when present.
  isAllChatAssign: !!(raw.isAllChatAssign ?? raw.IsAllChatAssign),
  isSendTemplate:  !!(raw.isSendTemplate  ?? raw.IsSendTemplate),
});

const makeStyles = (c) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingTop: 4, paddingHorizontal: 22, paddingBottom: 120 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 18, marginTop: 12 },
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
  right: { alignItems: 'flex-end', gap: 4, flexDirection: 'row' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 6, backgroundColor: c.bgInput },
  emptyBlock: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyHead: { color: c.text, fontSize: 16, fontWeight: '600' },
  emptyBody: { color: c.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },
});

export default function AgentScreen({ navigation }) {
  const c = useFeed();
  const styles = useMemo(() => makeStyles(c), [c]);

  const STATUS = {
    AVAILABLE: { color: c.accentCyan,   tint: c.tintMint },
    BREAK:     { color: c.accentOrange, tint: c.tintYellow },
    AWAY:      { color: c.textMuted,    tint: c.tintLavender },
  };

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);

  const filters = ['ALL', 'ACTIVE', 'INACTIVE', 'BLOCKED'];

  const fetchAgents = useCallback(async () => {
    try {
      setError(null);
      const res = await AgentAPI.list();
      const raw = Array.isArray(res) ? res : (res?.data || res?.agents || []);
      setAgents(raw.map(normaliseAgent));
    } catch (e) {
      setError(e?.message || 'Could not load agents.');
      setAgents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchAgents);
    return unsub;
  }, [navigation, fetchAgents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgents();
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((a) => {
      const status = STATUS_BY_CODE[a.accountStatus]?.label || 'ACTIVE';
      if (filter !== 'ALL' && status !== filter) return false;
      if (!q) return true;
      return (
        a.userName.toLowerCase().includes(q) ||
        a.emailId.toLowerCase().includes(q) ||
        a.mobileNumber.includes(q)
      );
    });
  }, [agents, query, filter]);

  const counts = useMemo(() => ({
    total: agents.length,
    active: agents.filter((a) => a.accountStatus === 1).length,
    inactive: agents.filter((a) => a.accountStatus === 2).length,
  }), [agents]);

  const handleEdit = (agent) => {
    navigation.navigate('CreateAgent', { agentId: agent.userId });
  };

  const handleDelete = async (agent) => {
    const ok = await dialog.confirm({
      title: 'Delete agent?',
      message: `${agent.userName} will lose access to OmniApp. Their chat assignments will be released.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    setDeletingId(agent.userId);
    try {
      await AgentAPI.delete(agent.userId);
      setAgents((prev) => prev.filter((a) => a.userId !== agent.userId));
      toast.success('Agent deleted', agent.userName);
    } catch (e) {
      const status = e?.status;
      const hint = status === 302 || status === 401
        ? 'Backend bearer auth on AgentList isn’t live yet.'
        : (e?.message || 'Try again.');
      toast.error('Delete failed', hint);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="people-circle-outline"
        title="Agents"
        right={(
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateAgent')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add agent"
            style={{
              width: 36, height: 36, borderRadius: 18,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.bgInput,
            }}
          >
            <Ionicons name="add" size={18} color={c.text} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
        }
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{counts.total}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Active</Text>
            <Text style={[styles.summaryValue, { color: c.accentCyan }]}>{counts.active}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Inactive</Text>
            <Text style={[styles.summaryValue, { color: c.textMuted }]}>{counts.inactive}</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={c.textMuted} />
          <TextInput
            value={query} onChangeText={setQuery}
            placeholder="Search name, email, mobile"
            placeholderTextColor={c.textMuted}
            autoCapitalize="none"
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

        {loading ? (
          <View style={styles.emptyBlock}>
            <ActivityIndicator color={c.primary} />
            <Text style={styles.emptyBody}>Loading agents…</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="cloud-offline-outline" size={40} color={c.danger} />
            <Text style={styles.emptyHead}>Couldn’t load agents</Text>
            <Text style={styles.emptyBody}>
              {error.includes('302') || error.toLowerCase().includes('unauth')
                ? 'OmniApp bearer auth on AgentList isn’t live yet — try again later.'
                : error}
            </Text>
            <TouchableOpacity
              onPress={fetchAgents}
              activeOpacity={0.85}
              style={{
                marginTop: 8, paddingHorizontal: 16, paddingVertical: 10,
                borderRadius: 12, backgroundColor: c.primary,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : list.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="people-outline" size={40} color={c.textDim} />
            <Text style={styles.emptyHead}>{agents.length === 0 ? 'No agents yet' : 'No match'}</Text>
            <Text style={styles.emptyBody}>
              {agents.length === 0
                ? 'Tap + to create the first agent.'
                : 'Clear filters or search another field.'}
            </Text>
          </View>
        ) : (
          list.map((a) => {
            const code = a.accountStatus;
            const statusEntry = STATUS_BY_CODE[code] || STATUS_BY_CODE[1];
            const s = STATUS[statusEntry.key] || STATUS.AVAILABLE;
            const isDeleting = deletingId === a.userId;
            return (
              <TouchableOpacity
                key={a.userId}
                activeOpacity={0.85}
                onPress={() => handleEdit(a)}
                style={styles.card}
              >
                <View style={[styles.avatar, { backgroundColor: s.tint }]}>
                  <Text style={styles.avatarText}>{initials(a.userName)}</Text>
                </View>
                <View style={styles.grow}>
                  <Text style={styles.name} numberOfLines={1}>{a.userName}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {a.emailId || a.mobileNumber || '—'}
                    {a.isAllChatAssign ? ' · all chats' : ''}
                    {a.isSendTemplate ? ' · templates' : ''}
                  </Text>
                </View>
                <View style={styles.right}>
                  <View style={[styles.statusBadge, { backgroundColor: s.color + '22' }]}>
                    <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                    <Text style={[styles.statusLabel, { color: s.color }]}>
                      {statusEntry.label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(a)}
                    disabled={isDeleting}
                    activeOpacity={0.7}
                    hitSlop={6}
                    style={styles.iconBtn}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={c.danger} />
                    ) : (
                      <Ionicons name="trash-outline" size={14} color={c.danger} />
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

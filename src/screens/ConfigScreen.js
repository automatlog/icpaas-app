// src/screens/ConfigScreen.js — API key config + live wallet probe + channels
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeed, Fonts } from '../theme';
import { AuthAPI, WhatsAppAPI, SMSAPI, RCSAPI, BalanceAPI } from '../services/api';

const DEMO_TOKEN_HINT = 'b6f3b11e-…';

const maskToken = (t) => {
  if (!t) return '—';
  const s = String(t);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
};

const fmtMoney = (n) => n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 4 })}`;

const makeStyles = (c) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22, paddingBottom: 120 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.bgSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.6, flex: 1, fontFamily: Fonts.sans },

  sectionLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 10 },

  walletCard: { backgroundColor: c.tintPeach, borderRadius: 22, padding: 18, marginBottom: 14 },
  walletKicker: { color: 'rgba(0,0,0,0.55)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  walletAmount: { color: '#0A0A0D', fontSize: 36, fontWeight: '700', letterSpacing: -0.8, marginTop: 4, fontFamily: Fonts.sans },
  walletHint: { color: 'rgba(0,0,0,0.55)', fontSize: 12, marginTop: 4 },

  tokenCard: { backgroundColor: c.bgSoft, borderRadius: 18, padding: 14, gap: 10 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tokenCurrent: { flex: 1, color: c.text, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.bgInput, borderRadius: 18, paddingHorizontal: 14 },
  input: {
    flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    color: c.text, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: c.text, borderRadius: 16, marginTop: 10 },
  saveLabel: { color: c.bg, fontSize: 14, fontWeight: '600' },
  clearBtn: { paddingVertical: 12, alignItems: 'center' },
  clearLabel: { color: c.accentPink, fontSize: 13, fontWeight: '500' },

  channelCard: { backgroundColor: c.bgSoft, borderRadius: 18, padding: 14, marginBottom: 10 },
  channelHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  channelIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  channelTitle: { color: c.text, fontSize: 15, fontWeight: '600', flex: 1 },
  channelCount: { color: c.textMuted, fontSize: 12 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.rule },
  channelRowName: { color: c.text, fontSize: 13, fontWeight: '500', flex: 1 },
  channelRowMeta: { color: c.textMuted, fontSize: 11, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },

  emptyBody: { color: c.textMuted, fontSize: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },

  errBlock: { backgroundColor: c.bgSoft, borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: c.accentPink },
  errKicker: { color: c.accentPink, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  errText: { color: c.text, fontSize: 12 },
});

export default function ConfigScreen({ navigation }) {
  const c = useFeed();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [storedToken, setStoredToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState(null);
  const [balanceErr, setBalanceErr] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [channels, setChannels] = useState({ whatsapp: [], sms: [], rcs: [] });
  const [errors, setErrors] = useState({ whatsapp: null, sms: null, rcs: null });

  const loadToken = useCallback(async () => {
    const t = await AuthAPI.getToken();
    setStoredToken(t || '');
    return t;
  }, []);

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    setBalanceErr(null);
    try {
      const res = await BalanceAPI.getBalance();
      setBalance(res?.walletBalance ?? res?.balance ?? null);
    } catch (e) {
      setBalance(null);
      setBalanceErr(e?.message || 'Unable to fetch balance');
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const [wa, sms, rcs] = await Promise.allSettled([
        WhatsAppAPI.getChannels(),
        SMSAPI.getSenderIds(),
        RCSAPI.getBotIds(),
      ]);
      setChannels({
        whatsapp: wa.status === 'fulfilled' ? (wa.value?.data || []) : [],
        sms:      sms.status === 'fulfilled' ? (sms.value?.senderIds || sms.value?.data?.senderIds || sms.value?.data || []) : [],
        rcs:      rcs.status === 'fulfilled' ? (rcs.value?.bots || rcs.value?.data?.bots || []) : [],
      });
      setErrors({
        whatsapp: wa.status === 'rejected' ? (wa.reason?.message || 'Failed') : null,
        sms:      sms.status === 'rejected' ? (sms.reason?.message || 'Failed') : null,
        rcs:      rcs.status === 'rejected' ? (rcs.reason?.message || 'Failed') : null,
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadToken().then(async () => {
      await fetchBalance();
      fetchChannels();
    });
  }, [loadToken, fetchBalance, fetchChannels]);

  const saveToken = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) { Alert.alert('Required', 'Paste a bearer API key first.'); return; }
    setSaving(true);
    try {
      const result = await AuthAPI.saveAndTestIcpaas(trimmed);
      setStoredToken(trimmed);
      setTokenInput('');
      if (result.ok) {
        setBalance(result.walletBalance);
        setBalanceErr(null);
        Alert.alert('Saved', `Key verified. Wallet: ${fmtMoney(result.walletBalance)}`);
      } else {
        setBalance(null);
        setBalanceErr(result.error);
        Alert.alert('Saved with warning', `Key stored but balance check failed:\n${result.error}`);
      }
      fetchChannels();
    } catch (e) {
      Alert.alert('Save failed', e?.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const clearToken = async () => {
    await AuthAPI.clearCredentials();
    setStoredToken('');
    setBalance(null);
    setBalanceErr(null);
    setChannels({ whatsapp: [], sms: [], rcs: [] });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), fetchChannels()]);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accentPink} />}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Config</Text>
          <TouchableOpacity style={styles.backBtn} onPress={onRefresh} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color={c.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Wallet (icpaas.in)</Text>
        <View style={styles.walletCard}>
          <Text style={styles.walletKicker}>№ 01 · Live Balance</Text>
          <Text style={styles.walletAmount}>
            {balanceLoading ? '…' : fmtMoney(balance)}
          </Text>
          <Text style={styles.walletHint}>
            {balanceErr
              ? `⚠ ${balanceErr}`
              : storedToken
                ? 'Fetched from /api/v1/user/balance · live'
                : 'Save an API key below to enable live balance'}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>API Key</Text>
        <View style={styles.tokenCard}>
          <View style={styles.tokenRow}>
            <Text style={styles.tokenCurrent}>{maskToken(storedToken)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: storedToken ? c.accentCyan + '22' : c.textDim + '22' }]}>
              <Text style={[styles.statusText, { color: storedToken ? c.accentCyan : c.textMuted }]}>
                {storedToken ? 'Saved' : 'Empty'}
              </Text>
            </View>
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="key-outline" size={16} color={c.textMuted} />
            <TextInput
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder={DEMO_TOKEN_HINT}
              placeholderTextColor={c.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={saveToken} activeOpacity={0.85} disabled={saving}>
            {saving ? <ActivityIndicator color={c.bg} /> : (
              <>
                <Ionicons name="save-outline" size={16} color={c.bg} />
                <Text style={styles.saveLabel}>Save &amp; test balance</Text>
              </>
            )}
          </TouchableOpacity>
          {storedToken ? (
            <TouchableOpacity style={styles.clearBtn} onPress={clearToken} activeOpacity={0.7}>
              <Text style={styles.clearLabel}>Clear saved key</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Channels (gsauth.com)</Text>
        <ChannelBlock
          c={c} styles={styles}
          icon="logo-whatsapp" tint={c.tintMint} title="WhatsApp" items={channels.whatsapp}
          err={errors.whatsapp}
          renderItem={(ch) => ({
            name: ch.label || ch.wabaNumber || ch.phoneNumberId || 'Channel',
            meta: `phoneId: ${ch.phoneNumberId || '—'}`,
          })}
        />
        <ChannelBlock
          c={c} styles={styles}
          icon="chatbubble-outline" tint={c.tintRose} title="SMS Sender IDs" items={channels.sms}
          err={errors.sms}
          renderItem={(s) => ({
            name: s.senderId || s.id || s.name || 'Sender',
            meta: `peId: ${s.peId || '—'}`,
          })}
        />
        <ChannelBlock
          c={c} styles={styles}
          icon="card-outline" tint={c.tintLavender} title="RCS Bots" items={channels.rcs}
          err={errors.rcs}
          renderItem={(b) => ({
            name: b.agentName || b.botId || 'Bot',
            meta: `botId: ${b.botId || '—'}`,
          })}
        />
      </ScrollView>
    </View>
  );
}

const ChannelBlock = ({ c, styles, icon, tint, title, items, err, renderItem }) => (
  <View style={styles.channelCard}>
    <View style={styles.channelHead}>
      <View style={[styles.channelIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color="#0A0A0D" />
      </View>
      <Text style={styles.channelTitle}>{title}</Text>
      <Text style={styles.channelCount}>{items.length}</Text>
    </View>
    {err ? (
      <View style={styles.errBlock}>
        <Text style={styles.errKicker}>Unreachable</Text>
        <Text style={styles.errText}>{err}</Text>
      </View>
    ) : items.length === 0 ? (
      <Text style={styles.emptyBody}>No entries. Save a valid gsauth bearer token above to fetch.</Text>
    ) : (
      items.map((item, i) => {
        const { name, meta } = renderItem(item);
        return (
          <View key={i} style={styles.channelRow}>
            <Text style={styles.channelRowName}>{name}</Text>
            <Text style={styles.channelRowMeta}>{meta}</Text>
          </View>
        );
      })
    )}
  </View>
);

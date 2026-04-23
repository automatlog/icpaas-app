// src/screens/DashboardScreen.js — Feed (dark social) dashboard / front
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useFeed, Fonts } from '../theme';
import { BalanceAPI, VoiceAPI, IVRAPI } from '../services/api';
import { logout as logoutAction } from '../store/slices/authSlice';

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};

const makeStyles = (c) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 160 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  logoDot: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' },
  logoGlyph: { color: c.bg, fontSize: 18, fontWeight: '700' },
  circleBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.bgSoft, alignItems: 'center', justifyContent: 'center' },
  circleBtnGlyph: { color: c.text, fontSize: 16 },
  grow: { flex: 1 },
  bellWrap: { position: 'relative' },
  bellBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: c.accentPink, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: c.bg,
  },
  bellBadgeText: { color: c.text, fontSize: 10, fontWeight: '700' },

  greetingBlock: { paddingHorizontal: 22, marginBottom: 16 },
  greetLabel: { color: c.textMuted, fontSize: 14, fontFamily: Fonts.sans, fontWeight: '400' },
  greetName: { color: c.text, fontSize: 32, fontWeight: '700', letterSpacing: -0.8, fontFamily: Fonts.sans, marginTop: 2 },

  wallet: {
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 22,
    minHeight: 190,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  walletKicker: { color: 'rgba(0,0,0,0.55)', fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  walletLabel: { color: 'rgba(0,0,0,0.65)', fontSize: 12, marginTop: 8, fontWeight: '500' },
  walletAmount: { color: '#0A0A0D', fontSize: 46, fontWeight: '700', letterSpacing: -1, marginTop: 2, fontFamily: Fonts.sans },
  walletHint: { color: 'rgba(0,0,0,0.55)', fontSize: 12, marginTop: 6, fontWeight: '500' },
  walletCta: {
    marginTop: 16, alignSelf: 'flex-start',
    backgroundColor: '#0A0A0D',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  walletCtaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    borderRadius: 22,
    padding: 16,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  statKicker: { color: 'rgba(0,0,0,0.55)', fontSize: 10, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
  statValue: { color: '#0A0A0D', fontSize: 32, fontWeight: '700', letterSpacing: -0.6, fontFamily: Fonts.sans },
  statFoot: { color: 'rgba(0,0,0,0.6)', fontSize: 11, fontWeight: '500' },

  ctaBlock: { paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },
  openBtn: { borderRadius: 32, overflow: 'hidden' },
  openBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingVertical: 18,
  },
  openBtnArrow: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.2, borderColor: c.text,
    alignItems: 'center', justifyContent: 'center',
  },
  openBtnArrowGlyph: { color: c.text, fontSize: 14, fontWeight: '600' },
  openBtnLabel: { color: c.text, fontSize: 16, fontWeight: '600' },

  feedSection: { paddingHorizontal: 22, marginTop: 8 },
  sectionTitle: { color: c.text, fontSize: 18, fontWeight: '600', marginBottom: 10, fontFamily: Fonts.sans },
  feedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.bgSoft, borderRadius: 20, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: c.border,
  },
  feedIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  feedIconGlyph: { fontSize: 18, color: '#0A0A0D', fontWeight: '700' },
  feedName: { color: c.text, fontSize: 15, fontWeight: '600' },
  feedMeta: { color: c.textMuted, fontSize: 12, marginTop: 2 },
  feedArrow: { color: c.textMuted, fontSize: 16 },

  loadingBlock: { paddingTop: 80, alignItems: 'center' },
  loadingText: { color: c.textMuted, fontSize: 12, marginTop: 12, letterSpacing: 1.6, textTransform: 'uppercase' },

  dock: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgSoft, borderRadius: 32,
    paddingVertical: 8, paddingHorizontal: 8,
    borderWidth: 1, borderColor: c.border, gap: 6,
  },
  dockPlus: { width: 48, height: 48, borderRadius: 24, padding: 2 },
  dockPlusInner: { flex: 1, borderRadius: 22, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  dockPlusGlyph: { color: c.text, fontSize: 24, fontWeight: '300' },
  dockLabel: { color: c.text, fontSize: 14, fontWeight: '500', paddingHorizontal: 10 },
  dockAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.tintPeach, alignItems: 'center', justifyContent: 'center' },
  dockAvatarLetter: { color: '#0A0A0D', fontSize: 20, fontWeight: '700', fontFamily: Fonts.display },
});

export default function DashboardScreen({ navigation }) {
  const c = useFeed();
  const styles = useMemo(() => makeStyles(c), [c]);

  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const logout = () => dispatch(logoutAction());

  const [balance, setBalance] = useState(null);
  const [voiceRows, setVoiceRows] = useState(0);
  const [ivrRows, setIvrRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFront = useCallback(async () => {
    const today = new Date();
    const from = new Date(); from.setDate(today.getDate() - 7);
    const range = { fromDate: ymd(from), toDate: ymd(today) };

    const [bal, voice, ivr] = await Promise.allSettled([
      BalanceAPI.getBalance(),
      VoiceAPI.getDeliveryReport({ ...range, reportType: 'OBD' }),
      IVRAPI.getInboundReports({ ...range, exportToCsv: false }),
    ]);

    if (bal.status === 'fulfilled') setBalance(bal.value?.walletBalance ?? bal.value?.balance ?? null);
    if (voice.status === 'fulfilled') setVoiceRows((voice.value?.data || []).length);
    if (ivr.status === 'fulfilled') setIvrRows((ivr.value?.data || []).length);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchFront(); }, [fetchFront]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFront(); }} tintColor={c.accentPink} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.logoDot}><Ionicons name="infinite" size={20} color={c.bg} /></View>
          <TouchableOpacity style={styles.circleBtn} activeOpacity={0.7}>
            <Ionicons name="search" size={18} color={c.text} />
          </TouchableOpacity>
          <View style={styles.grow} />
          <View style={styles.bellWrap}>
            <TouchableOpacity style={styles.circleBtn} activeOpacity={0.7} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color={c.text} />
            </TouchableOpacity>
            <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>9</Text></View>
          </View>
        </View>

        <View style={styles.greetingBlock}>
          <Text style={styles.greetLabel}>{greet()},</Text>
          <Text style={styles.greetName}>{user?.name || user?.username || 'Editor'}.</Text>
        </View>

        <View style={[styles.wallet, { backgroundColor: c.tintPeach }]}>
          <Text style={styles.walletKicker}>№ 01 · Wallet</Text>
          <Text style={styles.walletLabel}>Live balance · gsauth ledger</Text>
          <Text style={styles.walletAmount}>
            ₹{balance !== null ? Number(balance).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
          </Text>
          <Text style={styles.walletHint}>Across six channels · updated now</Text>
          <TouchableOpacity style={styles.walletCta} activeOpacity={0.8} onPress={() => navigation.navigate('ProductIcons')}>
            <Text style={styles.walletCtaText}>Open press room</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: c.tintMint }]}>
            <Text style={styles.statKicker}>Voice · 7d</Text>
            <View>
              <Text style={styles.statValue}>{loading ? '—' : voiceRows}</Text>
              <Text style={styles.statFoot}>dispatches</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.tintLavender }]}>
            <Text style={styles.statKicker}>IVR · 7d</Text>
            <View>
              <Text style={styles.statValue}>{loading ? '—' : ivrRows}</Text>
              <Text style={styles.statFoot}>inbound calls</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: c.tintYellow }]}>
            <Text style={styles.statKicker}>Channels</Text>
            <View>
              <Text style={styles.statValue}>06</Text>
              <Text style={styles.statFoot}>live desks</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.tintRose }]}>
            <Text style={styles.statKicker}>Agents</Text>
            <View>
              <Text style={styles.statValue}>08</Text>
              <Text style={styles.statFoot}>on floor</Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaBlock}>
          <TouchableOpacity style={styles.openBtn} activeOpacity={0.9} onPress={() => navigation.navigate('ProductIcons')}>
            <LinearGradient colors={[c.gradA, c.gradB, c.gradC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.openBtnInner}>
              <View style={styles.openBtnArrow}><Ionicons name="arrow-forward" size={14} color={c.text} /></View>
              <Text style={styles.openBtnLabel}>Open Press Room</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>Quick feed</Text>

          <TouchableOpacity style={styles.feedRow} activeOpacity={0.8} onPress={() => navigation.navigate('Send')}>
            <View style={[styles.feedIcon, { backgroundColor: c.tintPeach }]}><Ionicons name="send" size={18} color="#0A0A0D" /></View>
            <View style={styles.grow}>
              <Text style={styles.feedName}>Send Message</Text>
              <Text style={styles.feedMeta}>WhatsApp · SMS · RCS · Voice</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedRow} activeOpacity={0.8} onPress={() => navigation.navigate('Templates')}>
            <View style={[styles.feedIcon, { backgroundColor: c.tintRose }]}><Ionicons name="document-text" size={18} color="#0A0A0D" /></View>
            <View style={styles.grow}>
              <Text style={styles.feedName}>Templates</Text>
              <Text style={styles.feedMeta}>WhatsApp · SMS · RCS catalogue</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedRow} activeOpacity={0.8} onPress={() => navigation.navigate('Config')}>
            <View style={[styles.feedIcon, { backgroundColor: c.tintLavender }]}><Ionicons name="settings" size={18} color="#0A0A0D" /></View>
            <View style={styles.grow}>
              <Text style={styles.feedName}>Config &amp; Channels</Text>
              <Text style={styles.feedMeta}>gsauth token · WA · SMS · RCS</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedRow} activeOpacity={0.8} onPress={() => navigation.navigate('Report')}>
            <View style={[styles.feedIcon, { backgroundColor: c.tintMint }]}><Ionicons name="stats-chart" size={18} color="#0A0A0D" /></View>
            <View style={styles.grow}>
              <Text style={styles.feedName}>Voice Ledger</Text>
              <Text style={styles.feedMeta}>OBD + IBD reports · 14-day window</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedRow} activeOpacity={0.8} onPress={() => navigation.navigate('Agent')}>
            <View style={[styles.feedIcon, { backgroundColor: c.tintYellow }]}><Ionicons name="people" size={18} color="#0A0A0D" /></View>
            <View style={styles.grow}>
              <Text style={styles.feedName}>Agent Floor</Text>
              <Text style={styles.feedMeta}>Roster · availability · queue</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedRow} activeOpacity={0.8} onPress={() => navigation.navigate('Campaigns')}>
            <View style={[styles.feedIcon, { backgroundColor: c.tintSage }]}><Ionicons name="megaphone" size={18} color="#0A0A0D" /></View>
            <View style={styles.grow}>
              <Text style={styles.feedName}>Campaigns</Text>
              <Text style={styles.feedMeta}>Plan, segment, launch</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={c.accentPink} />
            <Text style={styles.loadingText}>Loading feed…</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.dock}>
        <TouchableOpacity style={styles.dockPlus} activeOpacity={0.8} onPress={() => navigation.navigate('Send')}>
          <LinearGradient colors={[c.gradA, c.gradB, c.gradC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 24 }}>
            <View style={styles.dockPlusInner}><Ionicons name="send" size={18} color={c.text} /></View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Templates')} activeOpacity={0.7}><Text style={styles.dockLabel}>Templates</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Config')} activeOpacity={0.7}><Text style={styles.dockLabel}>Config</Text></TouchableOpacity>
        <View style={styles.grow} />
        <TouchableOpacity onPress={() => navigation.navigate('ProductIcons')} activeOpacity={0.7} style={styles.dockAvatar}>
          <Ionicons name="grid" size={20} color="#0A0A0D" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
